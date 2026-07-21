import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { Patient, Reading, VitalDefs, VitalMetric } from '../../core/models';
import { LineChartComponent } from '../../shared/line-chart.component';

interface TrendCard {
  metric: VitalMetric;
  label: string;
  unit: string;
  values: number[];
  labels: string[];
  current?: number;
  status: string;
  band: [number, number] | null;
}

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, LineChartComponent],
  template: `
    <div class="container" *ngIf="patient as p; else loadingTpl">
      <a routerLink="/dashboard" class="back">← Back to dashboard</a>

      <div class="head card">
        <div class="avatar" [ngClass]="latest?.status || 'normal'">{{ initials(p.name) }}</div>
        <div class="who">
          <h1>{{ p.name }}</h1>
          <p class="muted">{{ p.age }}y · {{ p.sex }} · {{ p.conditions.join(', ') }}</p>
        </div>
        <div class="head-right" *ngIf="latest as r">
          <span class="badge" [ngClass]="r.status">{{ r.status }}</span>
          <span class="muted">Latest {{ r.takenAt | date:'MMM d, h:mm a' }}</span>
        </div>
      </div>

      <div class="flags card" *ngIf="latest?.flags?.length">
        <b>⚠ Out-of-range on latest reading:</b> {{ latest?.flags?.join(' · ') }}
      </div>

      <h2 class="sec">14-day trends</h2>
      <div class="trends">
        <div class="trend card" *ngFor="let t of trends">
          <div class="t-head">
            <span class="muted">{{ t.label }}</span>
            <span class="cur" [ngClass]="t.status">
              {{ t.current ?? '—' }}<small>{{ t.unit }}</small>
            </span>
          </div>
          <app-line-chart [values]="t.values" [labels]="t.labels" [unit]="t.unit"
                          [band]="t.band" [stroke]="strokeFor(t.status)" />
          <div class="t-range muted" *ngIf="t.band">Dashed lines = normal range {{ t.band[0] }}–{{ t.band[1] }} {{ t.unit }}</div>
        </div>
      </div>

      <h2 class="sec">Reading history</h2>
      <div class="card table-wrap">
        <table>
          <thead>
            <tr><th>When</th><th>BP</th><th>HR</th><th>SpO₂</th><th>Glucose</th><th>Temp</th><th>Weight</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of reversed">
              <td>{{ r.takenAt | date:'MMM d, h:mm a' }}</td>
              <td>{{ r.systolic }}/{{ r.diastolic }}</td>
              <td>{{ r.heartRate }}</td>
              <td>{{ r.spo2 }}</td>
              <td>{{ r.glucose }}</td>
              <td>{{ r.temperature }}</td>
              <td>{{ r.weight }}</td>
              <td><span class="badge" [ngClass]="r.status">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="container">
        <div class="state" [class.err]="error">{{ error || 'Loading patient…' }}</div>
      </div>
    </ng-template>
  `,
  styles: [`
    .back { display: inline-block; margin-bottom: 16px; font-size: 14px; }
    .head { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
    .avatar { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; font-weight: 700; color: #fff; font-size: 18px; background: var(--brand-2); }
    .avatar.warning { background: var(--warning); } .avatar.critical { background: var(--critical); } .avatar.normal { background: var(--normal); }
    .who { flex: 1; } h1 { font-size: 22px; }
    .head-right { text-align: right; display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    .head-right .muted { font-size: 12px; }
    .flags { margin-bottom: 18px; color: var(--critical); background: var(--critical-bg); border-color: #fecaca; }
    .sec { font-size: 16px; margin: 26px 0 14px; }
    .trends { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .t-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .cur { font-size: 20px; font-weight: 700; }
    .cur.warning { color: var(--warning); } .cur.critical { color: var(--critical); } .cur.normal { color: var(--ink); }
    .cur small { font-size: 12px; font-weight: 500; margin-left: 2px; color: var(--muted); }
    .t-range { font-size: 11px; margin-top: 8px; }
    .table-wrap { overflow-x: auto; padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th, td { padding: 10px 14px; text-align: left; white-space: nowrap; }
    thead th { background: var(--soft); color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .03em; }
    tbody tr { border-top: 1px solid var(--line); }
    .state { padding: 40px; text-align: center; color: var(--muted); }
    .state.err { color: var(--critical); }
  `]
})
export class PatientDetailComponent implements OnInit {
  patient?: Patient;
  defs?: VitalDefs;
  trends: TrendCard[] = [];
  error = '';

  private readonly order: VitalMetric[] =
    ['systolic', 'diastolic', 'heartRate', 'spo2', 'glucose', 'temperature', 'weight'];

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    this.api.getVitalDefs().subscribe(d => { this.defs = d; this.buildTrends(); });
    this.route.paramMap.pipe(
      switchMap(pm => this.api.getPatient(pm.get('id')!))
    ).subscribe({
      next: p => { this.patient = p; this.buildTrends(); },
      error: e => { this.error = 'Patient not found or backend unavailable.'; console.error(e); }
    });
  }

  get latest(): Reading | undefined {
    return this.patient?.readings[this.patient.readings.length - 1];
  }
  get reversed(): Reading[] {
    return this.patient ? [...this.patient.readings].reverse() : [];
  }

  private buildTrends(): void {
    if (!this.patient || !this.defs) return;
    const last = this.latest;
    const fmt = (iso: string) => new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
    this.trends = this.order.map(metric => {
      const def = this.defs![metric];
      const rows = this.patient!.readings.filter(r => r[metric] != null);
      return {
        metric, label: def.label, unit: def.unit,
        values: rows.map(r => r[metric] as number),
        labels: rows.map(r => fmt(r.takenAt)),
        current: last?.[metric],
        status: last?.metricStatus?.[metric] ?? 'normal',
        band: def.warn
      };
    }).filter(t => t.values.length > 0);
  }

  strokeFor(status: string): string {
    return status === 'critical' ? '#dc2626' : status === 'warning' ? '#c2740c' : '#1591c9';
  }
  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }
}
