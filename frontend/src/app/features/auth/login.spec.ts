import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { AuthActions } from '../../core/auth/auth.actions';
import { initialAuthState } from '../../core/auth/auth.reducer';
import { Login } from './login';

/**
 * The page only dispatches actions and renders store state, so it is tested with a MockStore:
 * no effects, no navigation. (What happens after the dispatch is covered by auth.effects.spec.ts.)
 */
describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let http: HttpTestingController;
  let store: MockStore;
  let el: HTMLElement;

  async function render(returnUrl?: string) {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: initialAuthState } }),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
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

  async function setAuthState(patch: Partial<typeof initialAuthState>) {
    store.setState({ auth: { ...initialAuthState, ...patch } });
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

  it('clears an error left over from an earlier attempt when opened', async () => {
    await render();

    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.clearError());
  });

  it('shows validation errors and does not dispatch a login for an empty form', async () => {
    await render();
    await submit();

    expect(el.textContent).toContain('Email is required');
    expect(el.textContent).toContain('Password is required');
    expect(store.dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: AuthActions.login.type }));
  });

  it('dispatches a login with the return URL', async () => {
    await render('/checkout');

    type('input[type=email]', 'dana@example.com');
    type('input[type=password]', 'Secret123!');
    await submit();

    expect(store.dispatch).toHaveBeenCalledWith(
      AuthActions.login({ email: 'dana@example.com', password: 'Secret123!', returnUrl: '/checkout' }),
    );
  });

  it('disables the button while signing in and shows the error from the store', async () => {
    await render();
    const button = el.querySelector<HTMLButtonElement>('button[type=submit]')!;

    await setAuthState({ pending: true });
    expect(button.disabled).toBe(true);

    await setAuthState({ pending: false, error: 'Invalid email or password' });
    expect(button.disabled).toBe(false);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('Invalid email or password');
  });
});
