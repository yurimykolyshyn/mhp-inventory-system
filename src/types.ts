export type Role = 'manager' | 'auditor';

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}

export type AuditStatus = 'active' | 'completed';

export type ConfirmMethod = 'qr' | 'manual' | 'select';

export interface InventoryItem {
  id: string;
  molName: string;
  molCode: string;
  equipmentName: string;
  equipmentCode: string;
  isConfirmed: boolean;
  confirmedAt?: string;
  confirmedBy?: string;
  confirmMethod?: ConfirmMethod;
  notes?: string;
}

export interface InventoryAudit {
  id: string;
  title: string;
  createdBy: string;
  createdAt: string;
  deadline?: string;
  status: AuditStatus;
  items: InventoryItem[];
}
