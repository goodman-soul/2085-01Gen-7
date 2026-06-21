import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Locker } from '../entities/Locker';
import { LockerStatus, RentalStatus, OpenCodeStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import moment from 'moment';

export class LockerService {
  private lockerRepository: Repository<Locker>;

  constructor() {
    this.lockerRepository = AppDataSource.getRepository(Locker);
  }

  async initializeLockers(): Promise<void> {
    const count = await this.lockerRepository.count();
    if (count > 0) return;

    const zones = ['A', 'B', 'C'];
    const lockers: Locker[] = [];

    for (const zone of zones) {
      for (let i = 1; i <= 20; i++) {
        const locker = this.lockerRepository.create({
          lockerNumber: `${zone}${String(i).padStart(3, '0')}`,
          status: LockerStatus.AVAILABLE,
          zone,
          hourlyRate: 5,
          overtimeRate: 10,
        });
        lockers.push(locker);
      }
    }

    await this.lockerRepository.save(lockers);
  }

  async getAvailableLockers(): Promise<Locker[]> {
    return this.lockerRepository.find({
      where: { status: LockerStatus.AVAILABLE },
      order: { lockerNumber: 'ASC' },
    });
  }

  async getLockerByNumber(lockerNumber: string): Promise<Locker | null> {
    return this.lockerRepository.findOne({ where: { lockerNumber } });
  }

  async getLockerById(id: string): Promise<Locker | null> {
    return this.lockerRepository.findOne({ where: { id } });
  }

  async updateLockerStatus(id: string, status: LockerStatus): Promise<Locker | null> {
    const locker = await this.getLockerById(id);
    if (!locker) return null;

    locker.status = status;
    return this.lockerRepository.save(locker);
  }

  async getAllLockers(): Promise<Locker[]> {
    return this.lockerRepository.find({ order: { lockerNumber: 'ASC' } });
  }

  generateOpenCode(): string {
    const min = 100000;
    const max = 999999;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  calculateFees(
    hourlyRate: number,
    overtimeRate: number,
    durationHours: number,
    startTime: Date,
    actualEndTime: Date
  ): { baseFee: number; overtimeFee: number; totalFee: number; overtimeHours: number } {
    const baseFee = hourlyRate * durationHours;

    const expectedEndTime = moment(startTime).add(durationHours, 'hours').toDate();
    const actualEnd = moment(actualEndTime);
    const expectedEnd = moment(expectedEndTime);

    let overtimeHours = 0;
    let overtimeFee = 0;

    if (actualEnd.isAfter(expectedEnd)) {
      const diffMilliseconds = actualEnd.diff(expectedEnd);
      overtimeHours = Math.ceil(diffMilliseconds / (1000 * 60 * 60));
      overtimeFee = overtimeHours * overtimeRate;
    }

    const totalFee = baseFee + overtimeFee;

    return {
      baseFee,
      overtimeFee,
      totalFee,
      overtimeHours,
    };
  }

  checkOverdue(rental: { expectedEndTime: Date; status: RentalStatus }): boolean {
    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.OVERDUE) return false;
    return moment().isAfter(moment(rental.expectedEndTime));
  }

  calculateCurrentOvertime(
    startTime: Date,
    durationHours: number,
    overtimeRate: number
  ): { overtimeHours: number; overtimeFee: number; isOverdue: boolean } {
    const expectedEndTime = moment(startTime).add(durationHours, 'hours').toDate();
    const now = moment();

    if (!now.isAfter(moment(expectedEndTime))) {
      return { overtimeHours: 0, overtimeFee: 0, isOverdue: false };
    }

    const diffMilliseconds = now.diff(moment(expectedEndTime));
    const overtimeHours = Math.ceil(diffMilliseconds / (1000 * 60 * 60));
    const overtimeFee = overtimeHours * overtimeRate;

    return { overtimeHours, overtimeFee, isOverdue: true };
  }
}
