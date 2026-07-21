import { Routes } from '@angular/router';
import { authGuard, providerGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Provider Dashboard',
    canActivate: [providerGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'patients/:id',
    title: 'Patient Detail',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/patient-detail/patient-detail.component').then(m => m.PatientDetailComponent)
  },
  {
    path: 'submit',
    title: 'Submit Vitals',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/submit-vitals/submit-vitals.component').then(m => m.SubmitVitalsComponent)
  },
  { path: '**', redirectTo: 'dashboard' }
];
