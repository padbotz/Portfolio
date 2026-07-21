import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard, providerGuard } from './auth.guard';
import { AuthService } from './auth.service';

// Minimal fake AuthService — the guards only read these three members.
function fakeAuth(over: Partial<Record<'loggedIn' | 'provider' | 'patientId', unknown>>) {
  return {
    isLoggedIn: () => !!over.loggedIn,
    isProvider: () => !!over.provider,
    user: () => (over.patientId !== undefined ? { patientId: over.patientId } : null)
  } as unknown as AuthService;
}

function run(guard: typeof authGuard, auth: AuthService) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: auth }]
  });
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
  );
}

describe('authGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('allows a logged-in user', () => {
    expect(run(authGuard, fakeAuth({ loggedIn: true }))).toBe(true);
  });

  it('redirects an anonymous user to /login', () => {
    const result = run(authGuard, fakeAuth({ loggedIn: false }));
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/login');
  });
});

describe('providerGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('allows a provider', () => {
    expect(run(providerGuard, fakeAuth({ loggedIn: true, provider: true }))).toBe(true);
  });

  it('redirects a patient to their own record', () => {
    const result = run(providerGuard, fakeAuth({ loggedIn: true, provider: false, patientId: 'pt-1002' }));
    expect((result as UrlTree).toString()).toBe('/patients/pt-1002');
  });

  it('redirects an anonymous user to /login', () => {
    const result = run(providerGuard, fakeAuth({ loggedIn: false }));
    expect((result as UrlTree).toString()).toBe('/login');
  });
});
