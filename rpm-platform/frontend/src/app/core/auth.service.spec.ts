import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { LoginResponse } from './models';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  const providerLogin: LoginResponse = {
    token: 'fake.jwt.token',
    user: { username: 'dr.chen', role: 'provider', displayName: 'Dr. Grace Chen', patientId: null }
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts logged out', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.user()).toBeNull();
  });

  it('stores token + user and flips signals on successful login', () => {
    service.login('dr.chen', 'provider123').subscribe();
    const req = http.expectOne('http://localhost:3000/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(providerLogin);

    expect(service.isLoggedIn()).toBe(true);
    expect(service.isProvider()).toBe(true);
    expect(service.token).toBe('fake.jwt.token');
    expect(localStorage.getItem('rpm_token')).toBe('fake.jwt.token');
  });

  it('clears everything on logout', () => {
    service.login('dr.chen', 'provider123').subscribe();
    http.expectOne('http://localhost:3000/api/auth/login').flush(providerLogin);

    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.token).toBeNull();
    expect(localStorage.getItem('rpm_user')).toBeNull();
  });

  it('restores a persisted session from localStorage', () => {
    localStorage.setItem('rpm_token', 't');
    localStorage.setItem('rpm_user', JSON.stringify(providerLogin.user));
    // A freshly constructed service should read the persisted user in its constructor.
    const fresh = new AuthService({} as HttpClient);
    expect(fresh.user()?.username).toBe('dr.chen');
    expect(fresh.isLoggedIn()).toBe(true);
  });

  it('reports patient role correctly', () => {
    service.login('pt-1002', 'patient123').subscribe();
    http.expectOne('http://localhost:3000/api/auth/login').flush({
      token: 't2',
      user: { username: 'pt-1002', role: 'patient', displayName: 'Marcus Bell', patientId: 'pt-1002' }
    } as LoginResponse);

    expect(service.isProvider()).toBe(false);
    expect(service.user()?.patientId).toBe('pt-1002');
  });
});
