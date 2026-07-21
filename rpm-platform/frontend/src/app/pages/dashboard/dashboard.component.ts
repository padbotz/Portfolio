import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Alert, PatientSummary } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container">
      <div class="head">
        <div>
          <h1>Provider Dashboard</h1>
          <p class="muted">Monitoring {{ patients.length }} enrolled patients · sickest first</p>
        </div>
        <button class="btn-ghost" (click)="load()">↻ Refresh</button>
      </div>

      <div *ngIf="loading" class="state">Loading patients…</div>
      <div *ngIf="error" class="state err">
        {{ error }}<br /><span class="muted">Is the backend running on http://localhost:3000?</span>
      </div>

      <ng-container *ngIf="!loading && !error">
        <!-- Alerts strip -->
        <section class="alerts card" *ngIf="alerts.length; else noAlerts">
          <h2>⚠ Active alerts <span class="count">{{ alerts.length }}</span></h2>
          <a *ngFor="let a of alerts" class="alert-row" [routerLink]="['/patients', a.patientId]">
            <span class="badge" [ngClass]="a.status">{{ a.status }}</span>
            <b>{{ a.patientName }}</b>
            <span class="muted flags">{{ a.flags.join(' · ') }}</span>
            <span class="when muted">{{ a.takenAt | date:'MMM d, h:mm a' }}</span>
          </a>
        </section>
        <ng-template #noAlerts>
          <section class="card ok-banner">✓ No active alerts — all latest readings within range.</section>
        </ng-template>

        <!-- Patient grid -->
        <div class="grid">
          <a *ngFor="let p of patients" class="patient card" [routerLink]="['/patients', p.id]">
            <div class="p-top">
              <div class="avatar" [ngClass]="p.status">{{ initials(p.name) }}</div>
              <div class="p-id">
                <b>{{ p.name }}</b>
                <span class="muted">{{ p.age }}y · {{ p.sex }} · {{ p.conditions.join(', ') }}</span>
              </div>
              <span class="badge" [ngClass]="p.status">{{ p.status }}</span>
            </div>
            <div class="vitals" *ngIf="p.latest as r">
              <div class="v"><span class="muted">BP</span><b>{{ r.systolic }}/{{ r.diastolic }}</b></div>
              <div class="v"><span class="muted">HR</span><b>{{ r.heartRate }}</b></div>
              <div class="v"><span class="muted">SpO₂</span><b>{{ r.spo2 }}%</b></div>
              <div class="v"><span class="muted">Glu</span><b>{{ r.glucose }}</b></div>
            </div>
            <div class="p-foot muted" *ngIf="p.latest as r">
              Last reading {{ r.takenAt | date:'MMM d, h:mm a' }} · {{ p.readingCount }} total
            </div>
          </a>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; gap: 16px; }
    h1 { font-size: 24px; }
    .state { padding: 40px; text-align: center; color: var(--muted); }
    .state.err { color: var(--critical); }
    .alerts { margin-bottom: 22px; padding: 16px 18px; }
    .alerts h2 { font-size: 15px; color: var(--critical); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .count { background: var(--critical-bg); color: var(--critical); font-size: 12px; padding: 1px 9px; border-radius: 999px; }
    .alert-row {
      display: grid; grid-template-columns: 90px 150px 1fr auto; gap: 12px; align-items: center;
      padding: 9px 6px; border-top: 1px solid var(--line); color: var(--ink);
    }
    .alert-row:hover { text-decoration: none; background: var(--soft); border-radius: 8px; }
    .alert-row .flags { font-size: 13px; }
    .alert-row .when { font-size: 12px; }
    .ok-banner { margin-bottom: 22px; color: var(--normal); font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
    .patient { color: var(--ink); transition: .15s; }
    .patient:hover { text-decoration: none; transform: translateY(-2px); box-shadow: 0 12px 28px rgba(16,45,71,.12); }
    .p-top { display: flex; align-items: center; gap: 12px; }
    .avatar { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; color: #fff; font-size: 14px; background: var(--brand-2); }
    .avatar.warning { background: var(--warning); }
    .avatar.critical { background: var(--critical); }
    .avatar.normal { background: var(--normal); }
    .p-id { flex: 1; display: flex; flex-direction: column; }
    .p-id span { font-size: 12px; }
    .vitals { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0 10px; }
    .v { background: var(--soft); border-radius: 9px; padding: 8px; text-align: center; }
    .v span { display: block; font-size: 11px; }
    .v b { font-size: 15px; }
    .p-foot { font-size: 12px; }
  `]
})
export class DashboardComponent implements OnInit {
  patients: PatientSummary[] = [];
  alerts: Alert[] = [];
  loading = true;
  error = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    forkJoin({ patients: this.api.getPatients(), alerts: this.api.getAlerts() }).subscribe({
      next: ({ patients, alerts }) => {
        this.patients = patients;
        this.alerts = alerts;
        this.loading = false;
      },
      error: (e) => { this.error = 'Could not load data.'; this.loading = false; console.error(e); }
    });
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
}
