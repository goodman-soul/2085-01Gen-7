import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { AuditLogType } from '../types';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'simple-enum',
    enum: AuditLogType
  })
  type!: AuditLogType;

  @Column({ nullable: true })
  rentalId?: string;

  @Column({ nullable: true })
  lockerNumber?: string;

  @Column({ nullable: true })
  memberId?: string;

  @Column({ nullable: true })
  operatorId?: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
