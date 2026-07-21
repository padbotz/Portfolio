import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Alert, Patient, PatientSummary, Reading, VitalDefs, VitalMetric } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  /** Point this at your backend. Override via environment for production. */
  private readonly base = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getVitalDefs(): Observable<VitalDefs> {
    return this.http.get<VitalDefs>(`${this.base}/vital-defs`);
  }

  getPatients(): Observable<PatientSummary[]> {
    return this.http.get<PatientSummary[]>(`${this.base}/patients`);
  }

  getAlerts(): Observable<Alert[]> {
    return this.http.get<Alert[]>(`${this.base}/alerts`);
  }

  getPatient(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.base}/patients/${id}`);
  }

  submitVitals(id: string, vitals: Partial<Record<VitalMetric, number>>): Observable<Reading> {
    return this.http.post<Reading>(`${this.base}/patients/${id}/vitals`, vitals);
  }
}
