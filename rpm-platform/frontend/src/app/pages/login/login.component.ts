import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="shell">
      <div class="card">
        <div class="brand"><span class="dot">💓</span> RPM Platform</div>
        <h1>Sign in</h1>
        <p class="muted">Remote Patient Monitoring</p>

        <label class="fld"><span>Username</span>
          <input [(ngModel)]="username" (keyup.enter)="submit()" autocomplete="username" />
        </label>
        <label class="fld"><span>Password</span>
          <input type="password" [(ngModel)]="password" (keyup.enter)="submit()" autocomplete="current-password" />
        </label>

        <button class="btn-primary full" [disabled]="loading" (click)="submit()">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
        <p class="err" *ngIf="error">{{ error }}</p>

        <div class="demo">
          <b>Demo accounts</b>
          <button class="chip" (click)="fill('dr.chen','provider123')">Provider — dr.chen</button>
          <button class="chip" (click)="fill('pt-1002','patient123')">Patient — Marcus Bell</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .shell { min-height: 100vh; display: grid; place-items: center; padding: 24px;
      background: linear-gradient(120deg, var(--brand), var(--brand-2)); }
    .card { width: 100%; max-width: 380px; }
    .brand { font-weight: 700; font-size: 18px; display: flex; align-items: center; gap: 10px; color: var(--brand); margin-bottom: 14px; }
    .dot { width: 34px; height: 34px; border-radius: 9px; background: var(--soft); display: grid; place-items: center; }
    h1 { font-size: 22px; } .muted { margin: 2px 0 18px; }
    .fld { display: block; margin-bottom: 14px; }
    .fld > span { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
    .full { width: 100%; }
    .err { color: var(--critical); font-size: 13px; margin: 10px 0 0; }
    .demo { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line); font-size: 13px; }
    .demo b { display: block; margin-bottom: 8px; color: var(--muted); font-weight: 600; }
    .chip { display: block; width: 100%; text-align: left; background: var(--soft); color: var(--brand);
      margin-bottom: 6px; font-size: 13px; padding: 8px 12px; }
    .chip:hover { background: #e2eef3; }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error = '';

  constructor(private auth: AuthService, private router: Router) {}

  fill(u: string, p: string): void { this.username = u; this.password = p; }

  submit(): void {
    if (!this.username || !this.password) { this.error = 'Enter username and password.'; return; }
    this.loading = true;
    this.error = '';
    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.user.role === 'provider') this.router.navigate(['/dashboard']);
        else this.router.navigate(['/patients', res.user.patientId]);
      },
      error: (e) => { this.loading = false; this.error = e?.error?.error || 'Login failed.'; }
    });
  }
}
