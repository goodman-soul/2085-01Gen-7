import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Rental } from './Rental';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  memberNumber!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  phone!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({ default: true })
  isActive!: boolean;

  @OneToMany(() => Rental, rental => rental.member)
  rentals!: Rental[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
