import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { PatientSummary, Reading, VitalDefs, VitalMetric } from '../../core/models';

@Component({
  selector: 'app-submit-vitals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="container narrow">
      <h1>Submit Vitals</h1>
      <p class="muted">Patient self-reporting. Values are checked against clinical thresholds on submit.</p>

      <div class="card form">
        <label class="fld" *ngIf="isProvider; else patientLabel">
          <span>Patient</span>
          <select [(ngModel)]="patientId">
            <option value="">Select patient…</option>
            <option *ngFor="let p of patients" [value]="p.id">{{ p.name }} ({{ p.age }}y)</option>
          </select>
        </label>
        <ng-template #patientLabel>
          <div class="fld"><span class="lbl">Patient</span>
            <div class="self">{{ auth.user()?.displayName }}</div>
          </div>
        </ng-template>

        <div class="grid">
          <label class="fld" *ngFor="let m of metrics">
            <span>{{ defs?.[m]?.label }} <small class="muted">{{ defs?.[m]?.unit }}</small></span>
            <input type="number" step="any" [(ngModel)]="values[m]" [placeholder]="placeholder(m)" />
          </label>
        </div>

        <div class="row">
          <button class="btn-primary" [disabled]="!canSubmit() || submitting" (click)="submit()">
            {{ submitting ? 'Submitting…' : 'Submit reading' }}
          </button>
          <button class="btn-ghost" (click)="reset()">Clear</button>
        </div>
        <p class="err" *ngIf="error">{{ error }}</p>
      </div>

      <!-- Instant feedback -->
      <div class="card result" *ngIf="result as r">
        <div class="r-head">
          <h2>Reading recorded</h2>
          <span class="badge" [ngClass]="r.status">{{ r.status }}</span>
        </div>
        <p *ngIf="r.flags.length; else allClear" class="flags">
          ⚠ Flagged: {{ r.flags.join(' · ') }}
        </p>
        <ng-template #allClear><p class="clear">✓ All submitted values within normal range.</p></ng-template>
        <a class="btn-ghost view" [routerLink]="['/patients', patientId]">View patient trends →</a>
      </div>
    </div>
  `,
  styles: [`
    .narrow { max-width: 720px; }
    h1 { font-size: 24px; }
    .form { margin-top: 18px; }
    .lbl { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .self { padding: 10px 12px; background: var(--soft); border-radius: 9px; font-weight: 600; }
    .fld { display: block; margin-bottom: 14px; }
    .fld > span { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
    .row { display: flex; gap: 10px; margin-top: 8px; }
    .err { color: var(--critical); font-size: 13px; margin: 10px 0 0; }
    .result { margin-top: 20px; }
    .r-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .r-head h2 { font-size: 16px; }
    .flags { color: var(--critical); font-weight: 600; margin: 0 0 14px; }
    .clear { color: var(--normal); font-weight: 600; margin: 0 0 14px; }
    .view { display: inline-block; }
    .view:hover { text-decoration: none; }
  `]
})
export class SubmitVitalsComponent implements OnInit {
  patients: PatientSummary[] = [];
  defs?: VitalDefs;
  patientId = '';
  metrics: VitalMetric[] = ['systolic', 'diastolic', 'heartRate', 'spo2', 'glucose', 'temperature', 'weight'];
  values: Partial<Record<VitalMetric, number | null>> = {};
  submitting = false;
  error = '';
  result?: Reading;

  private placeholders: Record<string, string> = {
    systolic: 'e.g. 120', diastolic: 'e.g. 80', heartRate: 'e.g. 72',
    spo2: 'e.g. 98', glucose: 'e.g. 110', temperature: 'e.g. 36.8', weight: 'e.g. 75'
  };

  auth = inject(AuthService);
  isProvider = this.auth.isProvider();

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getVitalDefs().subscribe(d => this.defs = d);
    if (this.isProvider) {
      this.api.getPatients().subscribe(p => this.patients = p);
    } else {
      // Patient can only submit for themselves
      this.patientId = this.auth.user()?.patientId ?? '';
    }
  }

  placeholder(m: VitalMetric): string { return this.placeholders[m] ?? ''; }

  canSubmit(): boolean {
    return !!this.patientId && this.metrics.some(m => this.values[m] != null && this.values[m] !== undefined);
  }

  submit(): void {
    this.error = '';
    this.result = undefined;
    const payload: Partial<Record<VitalMetric, number>> = {};
    for (const m of this.metrics) {
      const v = this.values[m];
      if (v != null && !Number.isNaN(Number(v))) payload[m] = Number(v);
    }
    this.submitting = true;
    this.api.submitVitals(this.patientId, payload).subscribe({
      next: r => { this.result = r; this.submitting = false; },
      error: e => {
        this.error = e?.error?.error || 'Submission failed. Is the backend running?';
        this.submitting = false; console.error(e);
      }
    });
  }

  reset(): void { this.values = {}; this.result = undefined; this.error = ''; }
}
