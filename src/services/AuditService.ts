import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AuditLog } from '../entities/AuditLog';
import { AuditLogType } from '../types';

export class AuditService {
  private auditLogRepository: Repository<AuditLog>;

  constructor() {
    this.auditLogRepository = AppDataSource.getRepository(AuditLog);
  }

  async log(
    type: AuditLogType,
    description: string,
    options: {
      rentalId?: string;
      lockerNumber?: string;
      memberId?: string;
      operatorId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<AuditLog> {
    const log = this.auditLogRepository.create({
      type,
      description,
      rentalId: options.rentalId,
      lockerNumber: options.lockerNumber,
      memberId: options.memberId,
      operatorId: options.operatorId,
      metadata: options.metadata,
    });

    return await this.auditLogRepository.save(log);
  }

  async logLostItem(
    rentalId: string,
    lockerNumber: string,
    memberId: string,
    reporterId: string,
    description: string
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.LOST_ITEM,
      `遗失物上报：${description}`,
      {
        rentalId,
        lockerNumber,
        memberId,
        operatorId: reporterId,
        metadata: { description },
      }
    );
  }

  async logDoorOpen(
    lockerNumber: string,
    reporterId: string,
    remark?: string
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.DOOR_OPEN,
      `柜门未关：${lockerNumber}${remark ? `，备注：${remark}` : ''}`,
      {
        lockerNumber,
        operatorId: reporterId,
        metadata: { remark },
      }
    );
  }

  async logForceOpen(
    lockerNumber: string,
    operatorId: string,
    reason: string,
    rentalId?: string
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.FORCE_OPEN,
      `管理员强制开柜：${lockerNumber}，原因：${reason}`,
      {
        rentalId,
        lockerNumber,
        operatorId,
        metadata: { reason },
      }
    );
  }

  async logLockerChange(
    rentalId: string,
    oldLockerNumber: string,
    newLockerNumber: string,
    operatorId: string,
    reason: string
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.LOCKER_CHANGE,
      `换柜：从 ${oldLockerNumber} 换到 ${newLockerNumber}，原因：${reason}`,
      {
        rentalId,
        lockerNumber: newLockerNumber,
        operatorId,
        metadata: { oldLockerNumber, newLockerNumber, reason },
      }
    );
  }

  async logRentalStart(
    rentalId: string,
    lockerNumber: string,
    memberId: string
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.RENTAL_START,
      `开始租用：${lockerNumber}`,
      {
        rentalId,
        lockerNumber,
        memberId,
      }
    );
  }

  async logRentalEnd(
    rentalId: string,
    lockerNumber: string,
    memberId: string,
    totalFee: number
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.RENTAL_END,
      `结束租用：${lockerNumber}，费用：${totalFee}元`,
      {
        rentalId,
        lockerNumber,
        memberId,
        metadata: { totalFee },
      }
    );
  }

  async logOvertimeFee(
    rentalId: string,
    lockerNumber: string,
    memberId: string,
    overtimeHours: number,
    overtimeFee: number
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.OVERTIME_FEE,
      `超时收费：超时${overtimeHours}小时，加收${overtimeFee}元`,
      {
        rentalId,
        lockerNumber,
        memberId,
        metadata: { overtimeHours, overtimeFee },
      }
    );
  }

  async logCodeGenerated(
    rentalId: string,
    lockerNumber: string,
    memberId: string,
    code: string
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.CODE_GENERATED,
      `生成开柜码：${code}`,
      {
        rentalId,
        lockerNumber,
        memberId,
        metadata: { code },
      }
    );
  }

  async logCodeUsed(
    rentalId: string,
    lockerNumber: string,
    memberId: string,
    code: string
  ): Promise<AuditLog> {
    return this.log(
      AuditLogType.CODE_USED,
      `使用开柜码：${code}`,
      {
        rentalId,
        lockerNumber,
        memberId,
        metadata: { code },
      }
    );
  }

  async getLogs(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      type?: AuditLogType;
      lockerNumber?: string;
      memberId?: string;
      operatorId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('log');

    if (filters) {
      if (filters.type) {
        queryBuilder.andWhere('log.type = :type', { type: filters.type });
      }
      if (filters.lockerNumber) {
        queryBuilder.andWhere('log.lockerNumber = :lockerNumber', { lockerNumber: filters.lockerNumber });
      }
      if (filters.memberId) {
        queryBuilder.andWhere('log.memberId = :memberId', { memberId: filters.memberId });
      }
      if (filters.operatorId) {
        queryBuilder.andWhere('log.operatorId = :operatorId', { operatorId: filters.operatorId });
      }
      if (filters.startDate) {
        queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
      }
      if (filters.endDate) {
        queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
      }
    }

    const [logs, total] = await queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { logs, total };
  }
}
