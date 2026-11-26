import { Page, expect } from '@playwright/test';

export const ADMIN = {
  email: process.env['E2E_ADMIN_EMAIL'] ?? 'admin@eshop.local',
  password: process.env['E2E_ADMIN_PASSWORD'] ?? 'Admin123!',
};

/** A fresh customer per run, so tests don't depend on earlier data. */
export function newCustomer() {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { email: `e2e.${id}@example.com`, password: 'Secret123!', firstName: 'Eve', lastName: `Tester${id}` };
}

export async function registerCustomer(page: Page, c: ReturnType<typeof newCustomer>) {
  await page.goto('/register');
  await page.getByLabel('First name').fill(c.firstName);
  await page.getByLabel('Last name').fill(c.lastName);
  await page.getByLabel('Email').fill(c.email);
  await page.getByLabel('Password').fill(c.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByTestId('account-menu')).toContainText(c.email);
}

export async function signIn(page: Page, email: string, password: string, url = '/login') {
  await page.goto(url);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
