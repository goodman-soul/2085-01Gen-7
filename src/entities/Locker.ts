import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { LockerStatus } from '../types';
import { Rental } from './Rental';

@Entity('lockers')
export class Locker {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  lockerNumber!: string;

  @Column({
    type: 'simple-enum',
    enum: LockerStatus,
    default: LockerStatus.AVAILABLE
  })
  status!: LockerStatus;

  @Column()
  zone!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  hourlyRate!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  overtimeRate!: number;

  @Column({ nullable: true })
  lastMaintenanceDate?: Date;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @OneToMany(() => Rental, rental => rental.locker)
  rentals!: Rental[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
