import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Locker } from '../entities/Locker';
import { Member } from '../entities/Member';
import { Rental } from '../entities/Rental';
import { OpenCode } from '../entities/OpenCode';
import { AuditLog } from '../entities/AuditLog';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './gym_locker.db',
  synchronize: true,
  logging: false,
  entities: [Locker, Member, Rental, OpenCode, AuditLog],
  migrations: [],
  subscribers: [],
});
