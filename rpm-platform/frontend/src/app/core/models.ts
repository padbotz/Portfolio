export type VitalStatus = 'normal' | 'warning' | 'critical';

export type VitalMetric =
  | 'systolic' | 'diastolic' | 'heartRate' | 'spo2' | 'glucose' | 'temperature' | 'weight';

export interface VitalDef {
  label: string;
  unit: string;
  warn: [number, number] | null;
  crit: [number, number] | null;
}

export type VitalDefs = Record<VitalMetric, VitalDef>;

export interface Reading {
  id: string;
  takenAt: string;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  spo2?: number;
  glucose?: number;
  temperature?: number;
  weight?: number;
  status: VitalStatus;
  metricStatus: Partial<Record<VitalMetric, VitalStatus>>;
  flags: string[];
}

export interface PatientSummary {
  id: string;
  name: string;
  age: number;
  sex: string;
  conditions: string[];
  latest: Reading | null;
  status: VitalStatus;
  readingCount: number;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  sex: string;
  conditions: string[];
  readings: Reading[];
}

export interface Alert {
  patientId: string;
  patientName: string;
  status: VitalStatus;
  takenAt: string;
  flags: string[];
}

export type Role = 'provider' | 'patient';

export interface AuthUser {
  username: string;
  role: Role;
  displayName: string;
  patientId: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
