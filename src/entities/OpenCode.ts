import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OpenCodeStatus } from '../types';
import { Rental } from './Rental';

@Entity('open_codes')
export class OpenCode {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  rentalId!: string;

  @Column()
  code!: string;

  @Column({
    type: 'simple-enum',
    enum: OpenCodeStatus,
    default: OpenCodeStatus.ACTIVE
  })
  status!: OpenCodeStatus;

  @Column({ type: 'datetime' })
  expiresAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  usedAt?: Date;

  @Column({ nullable: true })
  generatedBy?: string;

  @ManyToOne(() => Rental, rental => rental.openCodes)
  @JoinColumn({ name: 'rentalId' })
  rental!: Rental;

  @CreateDateColumn()
  createdAt!: Date;
}
