import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar" *ngIf="auth.isLoggedIn()">
      <div class="inner">
        <a class="brand" [routerLink]="homeLink()">
          <span class="dot">💓</span> RPM Platform
          <span class="tag">Remote Patient Monitoring</span>
        </a>
        <nav>
          <a *ngIf="auth.isProvider()" routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a *ngIf="patientId() as pid" [routerLink]="['/patients', pid]" routerLinkActive="active">My Readings</a>
          <a routerLink="/submit" routerLinkActive="active">Submit Vitals</a>
        </nav>
        <div class="user">
          <span class="who">{{ auth.user()?.displayName }}
            <small>{{ auth.user()?.role }}</small>
          </span>
          <button class="logout" (click)="logout()">Sign out</button>
        </div>
      </div>
    </header>
    <router-outlet />
  `,
  styles: [`
    .topbar { background: linear-gradient(120deg, var(--brand), var(--brand-2)); color: #fff; }
    .inner { max-width: 1140px; margin: 0 auto; padding: 14px 28px;
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .brand { color: #fff; font-weight: 700; font-size: 18px; display: flex; align-items: center; gap: 10px; }
    .brand:hover { text-decoration: none; }
    .dot { width: 34px; height: 34px; border-radius: 9px; background: rgba(255,255,255,.18); display: grid; place-items: center; font-size: 16px; }
    .tag { font-size: 12px; background: rgba(255,255,255,.16); padding: 4px 10px; border-radius: 999px; font-weight: 500; }
    nav { display: flex; gap: 6px; margin-left: auto; }
    nav a { color: #fff; opacity: .85; font-size: 14px; padding: 7px 12px; border-radius: 8px; }
    nav a:hover { opacity: 1; text-decoration: none; background: rgba(255,255,255,.12); }
    nav a.active { opacity: 1; background: rgba(255,255,255,.2); }
    .user { display: flex; align-items: center; gap: 12px; }
    .who { font-size: 13px; line-height: 1.2; text-align: right; }
    .who small { display: block; opacity: .8; text-transform: capitalize; }
    .logout { background: rgba(255,255,255,.16); color: #fff; padding: 8px 14px; font-size: 13px; }
    .logout:hover { background: rgba(255,255,255,.26); }
  `]
})
export class AppComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  patientId(): string | null { return this.auth.user()?.patientId ?? null; }

  homeLink(): string[] {
    const u = this.auth.user();
    if (u?.role === 'provider') return ['/dashboard'];
    return u?.patientId ? ['/patients', u.patientId] : ['/login'];
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
