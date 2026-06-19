export enum LockerStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance',
  OUT_OF_SERVICE = 'out_of_service'
}

export enum RentalStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum OpenCodeStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired'
}

export enum AuditLogType {
  LOST_ITEM = 'lost_item',
  DOOR_OPEN = 'door_open',
  FORCE_OPEN = 'force_open',
  LOCKER_CHANGE = 'locker_change',
  RENTAL_START = 'rental_start',
  RENTAL_END = 'rental_end',
  OVERTIME_FEE = 'overtime_fee',
  CODE_GENERATED = 'code_generated',
  CODE_USED = 'code_used'
}

export interface CreateRentalRequest {
  memberId: string;
  lockerNumber: string;
  durationHours: number;
}

export interface GenerateOpenCodeRequest {
  rentalId: string;
}

export interface ForceOpenRequest {
  lockerNumber: string;
  operatorId: string;
  reason: string;
}

export interface ChangeLockerRequest {
  rentalId: string;
  newLockerNumber: string;
  operatorId: string;
  reason: string;
}

export interface ReportLostItemRequest {
  rentalId: string;
  description: string;
  reporterId: string;
}

export interface ReportDoorOpenRequest {
  lockerNumber: string;
  reporterId: string;
  remark?: string;
}
