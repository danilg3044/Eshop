import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { fakeJwt } from '../../testing/fake-jwt';
import { Login } from './login';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let el: HTMLElement;

  async function render(returnUrl?: string) {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Login);
    if (returnUrl) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    el = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/auth/providers').flush(['google', 'facebook']);
    await fixture.whenStable();
  }

  function type(selector: string, value: string) {
    const input = el.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit() {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();
  }

  /** Lets the async submit action finish (it resolves a few microtasks after the HTTP flush). */
  async function settle() {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('shows the social login buttons that the server has configured', async () => {
    await render();
    const links = [...el.querySelectorAll<HTMLAnchorElement>('a[data-provider]')];

    expect(links.map((a) => a.textContent?.trim())).toEqual(['Google', 'Facebook']);
    expect(links[0].href).toBe('http://localhost:8080/oauth2/authorization/google');
  });

  it('hides social login on the admin sign-in page', async () => {
    await render('/admin');

    expect(el.querySelector('h1')?.textContent).toContain('Administrator');
    expect(el.querySelector('a[data-provider]')).toBeNull();
  });

  it('shows validation errors and does not call the server for an empty form', async () => {
    await render();
    await submit();

    expect(el.textContent).toContain('Email is required');
    expect(el.textContent).toContain('Password is required');
    http.expectNone('/api/auth/login');
  });

  it('signs in and navigates to the return URL', async () => {
    await render('/checkout');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    type('input[type=email]', 'dana@example.com');
    type('input[type=password]', 'Secret123!');
    await submit();

    http.expectOne('/api/auth/login').flush({ accessToken: fakeJwt(), expiresAt: '2030-01-01T00:00:00Z' });
    http.expectOne('/api/auth/me').flush({ id: 1, email: 'dana@example.com', role: 'USER', profile: {} });
    await settle();

    expect(navigate).toHaveBeenCalledWith('/checkout');
  });

  it('shows the server error for wrong credentials', async () => {
    await render();
    type('input[type=email]', 'dana@example.com');
    type('input[type=password]', 'wrong');
    await submit();

    http.expectOne('/api/auth/login').flush(
      { status: 401, detail: 'Invalid email or password' },
      { status: 401, statusText: 'Unauthorized' },
    );
    await settle();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Invalid email or password');
  });
});
