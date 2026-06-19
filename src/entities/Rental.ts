import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { RentalStatus } from '../types';
import { Locker } from './Locker';
import { Member } from './Member';
import { OpenCode } from './OpenCode';

@Entity('rentals')
export class Rental {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  memberId!: string;

  @Column()
  lockerId!: string;

  @Column({
    type: 'simple-enum',
    enum: RentalStatus,
    default: RentalStatus.ACTIVE
  })
  status!: RentalStatus;

  @Column({ type: 'timestamp' })
  startTime!: Date;

  @Column({ type: 'timestamp' })
  expectedEndTime!: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualEndTime?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  overtimeFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalFee!: number;

  @Column({ default: 0 })
  overtimeHours!: number;

  @Column({ nullable: true, type: 'text' })
  remarks?: string;

  @ManyToOne(() => Locker, locker => locker.rentals)
  @JoinColumn({ name: 'lockerId' })
  locker!: Locker;

  @ManyToOne(() => Member, member => member.rentals)
  @JoinColumn({ name: 'memberId' })
  member!: Member;

  @OneToMany(() => OpenCode, openCode => openCode.rental)
  openCodes!: OpenCode[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
