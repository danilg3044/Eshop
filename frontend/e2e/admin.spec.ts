import { expect, test } from '@playwright/test';
import { ADMIN, newCustomer, registerCustomer } from './helpers';

test('admin sees a new order under Current orders and moves it to history', async ({ browser }) => {
  // A customer places an order (in its own browser context).
  const customer = newCustomer();
  const shopper = await browser.newPage();
  await registerCustomer(shopper, customer);
  await shopper.getByTestId('product-card').first().getByRole('button', { name: 'Add to cart' }).click();
  await shopper.goto('/checkout');
  await shopper.getByLabel('Address').fill('2 Allenby St');
  await shopper.getByLabel('City').fill('Tel Aviv');
  await shopper.getByLabel('Postal code').fill('61000');
  await shopper.getByLabel('Country').fill('Israel');
  await shopper.getByRole('button', { name: 'Place order' }).click();
  await expect(shopper).toHaveURL(/placed=(\d+)/);
  const orderId = new URL(shopper.url()).searchParams.get('placed')!;
  await shopper.close();

  // The admin signs in through the admin entry point (no social login offered there).
  const admin = await browser.newPage();
  await admin.goto('/admin');
  await expect(admin.getByRole('heading', { name: 'Administrator sign in' })).toBeVisible();
  await expect(admin.getByText('or continue with')).toHaveCount(0);
  await admin.getByLabel('Email').fill(ADMIN.email);
  await admin.getByLabel('Password').fill(ADMIN.password);
  await admin.getByRole('button', { name: 'Sign in' }).click();
  await expect(admin.getByText('EShop back office')).toBeVisible();

  // The order is listed under Current orders.
  const row = admin.getByTestId('admin-order').filter({ hasText: customer.email });
  await expect(row).toContainText(orderId);
  await expect(row).toContainText('PENDING');

  // Move it along: paid -> shipped -> delivered.
  for (const next of ['paid', 'shipped', 'delivered']) {
    await row.getByRole('button', { name: /Change status/ }).click();
    await admin.getByRole('menuitem', { name: `Mark as ${next}` }).click();
    await expect(admin.getByText(`Order #${orderId} is now ${next}`)).toBeVisible();
  }

  // Delivered orders leave "Current" and show up in "Order history".
  await expect(row).toHaveCount(0);
  await admin.getByRole('tab', { name: 'Order history' }).click();
  await expect(admin.getByTestId('admin-order').filter({ hasText: customer.email })).toContainText('DELIVERED');

  // The customer's profile is visible to the admin.
  await admin.getByRole('link', { name: 'Users' }).click();
  await admin.getByLabel('Search by email or name').fill(customer.email);
  await admin.getByLabel('Search by email or name').press('Enter');
  await admin.getByRole('link', { name: customer.email }).click();
  await expect(admin.getByRole('heading', { name: `${customer.firstName} ${customer.lastName}` })).toBeVisible();
  await expect(admin.getByText('Orders (1)')).toBeVisible();
});

test('admin can browse the full product repository including inactive items', async ({ page }) => {
  await page.goto('/admin/products');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Password').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/admin\/products/);
  await page.getByLabel('Search by name, description or SKU').fill('TOY-003');
  await page.getByLabel('Search by name, description or SKU').press('Enter');
  await expect(page.getByRole('row', { name: /Retro Board Game/ })).toContainText('Inactive');
});
