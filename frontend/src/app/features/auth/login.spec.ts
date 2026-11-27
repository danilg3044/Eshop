import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { vi } from 'vitest';
import { AuthActions } from '../../core/auth/auth.actions';
import { initialAuthState } from '../../core/auth/auth.reducer';
import { Login } from './login';

/** The page only starts the sign-in (AuthEffects redirects to the auth server), so a MockStore is enough. */
describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let store: MockStore;
  let el: HTMLElement;

  async function render(returnUrl?: string, error: string | null = null) {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideMockStore({ initialState: { auth: { ...initialAuthState, error } } })],
    });
    store = TestBed.inject(MockStore);
    vi.spyOn(store, 'dispatch');
    fixture = TestBed.createComponent(Login);
    if (returnUrl) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    el = fixture.nativeElement;
    await fixture.whenStable();
  }

  it('starts the sign-in at the auth server, keeping where to come back to', async () => {
    await render('/checkout');

    expect(store.dispatch).toHaveBeenCalledWith(AuthActions.login({ returnUrl: '/checkout' }));
    expect(el.querySelector('[role=status]')?.textContent).toContain('Taking you to the sign-in page');
  });

  it('shows why the sign-in could not start and lets the user try again', async () => {
    await render(undefined, 'Could not start the sign-in.');

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Could not start the sign-in.');
    el.querySelector<HTMLButtonElement>('button')!.click();

    expect(store.dispatch).toHaveBeenCalledTimes(2);
    expect(store.dispatch).toHaveBeenLastCalledWith(AuthActions.login({ returnUrl: null }));
  });
});
