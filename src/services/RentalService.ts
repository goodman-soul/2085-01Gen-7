import { Repository, In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Rental } from '../entities/Rental';
import { OpenCode } from '../entities/OpenCode';
import { Member } from '../entities/Member';
import {
  RentalStatus,
  OpenCodeStatus,
  LockerStatus,
  CreateRentalRequest,
  GenerateOpenCodeRequest,
  ForceOpenRequest,
  ChangeLockerRequest,
  ReportLostItemRequest,
  ReportDoorOpenRequest,
} from '../types';
import { LockerService } from './LockerService';
import { AuditService } from './AuditService';
import moment from 'moment';

export class RentalService {
  private rentalRepository: Repository<Rental>;
  private openCodeRepository: Repository<OpenCode>;
  private memberRepository: Repository<Member>;
  private lockerService: LockerService;
  private auditService: AuditService;

  constructor() {
    this.rentalRepository = AppDataSource.getRepository(Rental);
    this.openCodeRepository = AppDataSource.getRepository(OpenCode);
    this.memberRepository = AppDataSource.getRepository(Member);
    this.lockerService = new LockerService();
    this.auditService = new AuditService();
  }

  async initializeMembers(): Promise<void> {
    const count = await this.memberRepository.count();
    if (count > 0) return;

    const members = [
      { memberNumber: 'M001', name: '张三', phone: '13800138001', balance: 500 },
      { memberNumber: 'M002', name: '李四', phone: '13800138002', balance: 300 },
      { memberNumber: 'M003', name: '王五', phone: '13800138003', balance: 1000 },
    ];

    for (const m of members) {
      const member = this.memberRepository.create(m);
      await this.memberRepository.save(member);
    }
  }

  async createRental(request: CreateRentalRequest): Promise<Rental> {
    const { memberId, lockerNumber, durationHours } = request;

    if (durationHours <= 0 || durationHours > 72) {
      throw new Error('租用时长必须在1-72小时之间');
    }

    const member = await this.memberRepository.findOne({ where: { id: memberId } });
    if (!member) {
      throw new Error('会员不存在');
    }

    if (!member.isActive) {
      throw new Error('会员账户已停用');
    }

    const locker = await this.lockerService.getLockerByNumber(lockerNumber);
    if (!locker) {
      throw new Error('储物柜不存在');
    }

    if (locker.status !== LockerStatus.AVAILABLE) {
      throw new Error('储物柜不可用');
    }

    const baseFee = locker.hourlyRate * durationHours;
    if (member.balance < baseFee) {
      throw new Error('会员余额不足');
    }

    const startTime = new Date();
    const expectedEndTime = moment(startTime).add(durationHours, 'hours').toDate();

    const rental = this.rentalRepository.create({
      memberId,
      lockerId: locker.id,
      startTime,
      expectedEndTime,
      baseFee,
      totalFee: baseFee,
      status: RentalStatus.ACTIVE,
    });

    const savedRental = await this.rentalRepository.save(rental);

    await this.lockerService.updateLockerStatus(locker.id, LockerStatus.OCCUPIED);

    member.balance -= baseFee;
    await this.memberRepository.save(member);

    await this.auditService.logRentalStart(savedRental.id, lockerNumber, memberId);

    return savedRental;
  }

  async generateOpenCode(request: GenerateOpenCodeRequest): Promise<OpenCode> {
    const { rentalId } = request;

    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['locker', 'member'],
    });

    if (!rental) {
      throw new Error('租用记录不存在');
    }

    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.OVERDUE) {
      throw new Error('租用已结束或已取消');
    }

    const existingActiveCode = await this.openCodeRepository.findOne({
      where: {
        rentalId,
        status: OpenCodeStatus.ACTIVE,
      },
    });

    if (existingActiveCode) {
      existingActiveCode.status = OpenCodeStatus.EXPIRED;
      await this.openCodeRepository.save(existingActiveCode);
    }

    const code = this.lockerService.generateOpenCode();
    const expiresAt = moment().add(15, 'minutes').toDate();

    const openCode = this.openCodeRepository.create({
      rentalId,
      code,
      expiresAt,
      status: OpenCodeStatus.ACTIVE,
    });

    const savedCode = await this.openCodeRepository.save(openCode);

    await this.auditService.logCodeGenerated(
      rentalId,
      rental.locker.lockerNumber,
      rental.memberId,
      code
    );

    return savedCode;
  }

  async useOpenCode(rentalId: string, code: string): Promise<boolean> {
    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['locker'],
    });

    if (!rental) {
      throw new Error('租用记录不存在');
    }

    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.OVERDUE) {
      throw new Error('租用已结束或已取消');
    }

    const openCode = await this.openCodeRepository.findOne({
      where: {
        rentalId,
        code,
        status: OpenCodeStatus.ACTIVE,
      },
    });

    if (!openCode) {
      throw new Error('开柜码无效或已过期');
    }

    if (moment().isAfter(moment(openCode.expiresAt))) {
      openCode.status = OpenCodeStatus.EXPIRED;
      await this.openCodeRepository.save(openCode);
      throw new Error('开柜码已过期');
    }

    openCode.status = OpenCodeStatus.USED;
    openCode.usedAt = new Date();
    await this.openCodeRepository.save(openCode);

    await this.auditService.logCodeUsed(
      rentalId,
      rental.locker.lockerNumber,
      rental.memberId,
      code
    );

    return true;
  }

  async endRental(rentalId: string): Promise<Rental> {
    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['locker', 'member'],
    });

    if (!rental) {
      throw new Error('租用记录不存在');
    }

    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.OVERDUE) {
      throw new Error('租用已结束或已取消');
    }

    const actualEndTime = new Date();
    const durationHours = moment(rental.expectedEndTime).diff(moment(rental.startTime), 'hours');
    const { baseFee, overtimeFee, totalFee, overtimeHours } = this.lockerService.calculateFees(
      rental.locker.hourlyRate,
      rental.locker.overtimeRate,
      durationHours,
      rental.startTime,
      actualEndTime
    );

    if (overtimeHours > 0) {
      const member = await this.memberRepository.findOne({ where: { id: rental.memberId } });
      if (!member) {
        throw new Error('会员不存在');
      }

      if (member.balance < overtimeFee) {
        throw new Error(`余额不足，需支付超时费用${overtimeFee}元，请先充值后再结束租用`);
      }

      member.balance -= overtimeFee;
      await this.memberRepository.save(member);

      await this.auditService.logOvertimeFee(
        rentalId,
        rental.locker.lockerNumber,
        rental.memberId,
        overtimeHours,
        overtimeFee
      );
    }

    rental.actualEndTime = actualEndTime;
    rental.baseFee = baseFee;
    rental.overtimeFee = overtimeFee;
    rental.totalFee = totalFee;
    rental.overtimeHours = overtimeHours;
    rental.status = overtimeHours > 0 ? RentalStatus.OVERDUE : RentalStatus.COMPLETED;

    const savedRental = await this.rentalRepository.save(rental);

    await this.lockerService.updateLockerStatus(rental.lockerId, LockerStatus.AVAILABLE);

    await this.auditService.logRentalEnd(
      rentalId,
      rental.locker.lockerNumber,
      rental.memberId,
      totalFee
    );

    return savedRental;
  }

  async forceOpen(request: ForceOpenRequest): Promise<void> {
    const { lockerNumber, operatorId, reason } = request;

    const locker = await this.lockerService.getLockerByNumber(lockerNumber);
    if (!locker) {
      throw new Error('储物柜不存在');
    }

    const activeRental = await this.rentalRepository.findOne({
      where: {
        lockerId: locker.id,
        status: In([RentalStatus.ACTIVE, RentalStatus.OVERDUE]),
      },
    });

    await this.auditService.logForceOpen(
      lockerNumber,
      operatorId,
      reason,
      activeRental?.id
    );
  }

  async changeLocker(request: ChangeLockerRequest): Promise<Rental> {
    const { rentalId, newLockerNumber, operatorId, reason } = request;

    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['locker'],
    });

    if (!rental) {
      throw new Error('租用记录不存在');
    }

    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.OVERDUE) {
      throw new Error('租用已结束或已取消');
    }

    const oldLockerNumber = rental.locker.lockerNumber;

    const newLocker = await this.lockerService.getLockerByNumber(newLockerNumber);
    if (!newLocker) {
      throw new Error('新储物柜不存在');
    }

    if (newLocker.status !== LockerStatus.AVAILABLE) {
      throw new Error('新储物柜不可用');
    }

    await this.lockerService.updateLockerStatus(rental.lockerId, LockerStatus.AVAILABLE);
    await this.lockerService.updateLockerStatus(newLocker.id, LockerStatus.OCCUPIED);

    rental.lockerId = newLocker.id;
    const savedRental = await this.rentalRepository.save(rental);

    await this.auditService.logLockerChange(
      rentalId,
      oldLockerNumber,
      newLockerNumber,
      operatorId,
      reason
    );

    return savedRental;
  }

  async reportLostItem(request: ReportLostItemRequest): Promise<void> {
    const { rentalId, description, reporterId } = request;

    const rental = await this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['locker'],
    });

    if (!rental) {
      throw new Error('租用记录不存在');
    }

    await this.auditService.logLostItem(
      rentalId,
      rental.locker.lockerNumber,
      rental.memberId,
      reporterId,
      description
    );
  }

  async reportDoorOpen(request: ReportDoorOpenRequest): Promise<void> {
    const { lockerNumber, reporterId, remark } = request;

    const locker = await this.lockerService.getLockerByNumber(lockerNumber);
    if (!locker) {
      throw new Error('储物柜不存在');
    }

    await this.auditService.logDoorOpen(lockerNumber, reporterId, remark);
  }

  async getRentalById(rentalId: string): Promise<Rental | null> {
    return this.rentalRepository.findOne({
      where: { id: rentalId },
      relations: ['locker', 'member'],
    });
  }

  async getMemberRentals(memberId: string, status?: RentalStatus): Promise<Rental[]> {
    const where: any = { memberId };
    if (status) {
      where.status = status;
    }

    return this.rentalRepository.find({
      where,
      relations: ['locker'],
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveRentalByLocker(lockerNumber: string): Promise<Rental | null> {
    const locker = await this.lockerService.getLockerByNumber(lockerNumber);
    if (!locker) return null;

    return this.rentalRepository.findOne({
      where: {
        lockerId: locker.id,
        status: In([RentalStatus.ACTIVE, RentalStatus.OVERDUE]),
      },
      relations: ['member', 'locker'],
      order: { createdAt: 'DESC' },
    });
  }

  async checkAndUpdateOverdue(): Promise<{ updated: number }> {
    const activeRentals = await this.rentalRepository.find({
      where: { status: RentalStatus.ACTIVE },
      relations: ['locker'],
    });

    let updatedCount = 0;

    for (const rental of activeRentals) {
      const durationHours = moment(rental.expectedEndTime).diff(moment(rental.startTime), 'hours');
      const { isOverdue } = this.lockerService.calculateCurrentOvertime(
        rental.startTime,
        durationHours,
        rental.locker.overtimeRate
      );

      if (isOverdue) {
        rental.status = RentalStatus.OVERDUE;
        await this.rentalRepository.save(rental);
        updatedCount++;
      }
    }

    return { updated: updatedCount };
  }

  async getMemberById(memberId: string): Promise<Member | null> {
    return this.memberRepository.findOne({ where: { id: memberId } });
  }

  async getAllMembers(): Promise<Member[]> {
    return this.memberRepository.find();
  }
}
