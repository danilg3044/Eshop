import { expect, test } from '@playwright/test';
import { newCustomer, registerCustomer } from './helpers';

test('visitors can browse and search the catalog', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('product-card').first()).toBeVisible();

  await page.getByTestId('search').fill('mug');
  await page.getByTestId('search').press('Enter');

  await expect(page.getByTestId('product-card')).toHaveCount(1);
  await expect(page.getByTestId('product-card')).toContainText('Ceramic Mug Set');
});

test('checkout requires signing in', async ({ page }) => {
  await page.goto('/checkout');
  await expect(page).toHaveURL(/\/login\?returnUrl=%2Fcheckout/);
});

test('a new customer registers, buys two products and sees the order', async ({ page }) => {
  const customer = newCustomer();
  await registerCustomer(page, customer);

  // Add two different products to the cart from the catalog.
  const cards = page.getByTestId('product-card');
  await cards.nth(0).getByRole('button', { name: 'Add to cart' }).click();
  await cards.nth(1).getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('link', { name: /Shopping cart, 2 items/ }).click();
  await expect(page.getByTestId('cart-line')).toHaveCount(2);

  // Checkout: the name is pre-filled from the profile; fill in the rest of the address.
  await page.getByRole('link', { name: 'Checkout' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue(`${customer.firstName} ${customer.lastName}`);
  await page.getByLabel('Address').fill('1 Herzl St');
  await page.getByLabel('City').fill('Haifa');
  await page.getByLabel('Postal code').fill('31000');
  await page.getByLabel('Country').fill('Israel');
  await page.getByRole('button', { name: 'Place order' }).click();

  await expect(page).toHaveURL(/\/orders\?placed=\d+/);
  await expect(page.getByRole('status')).toContainText('has been placed');
  await expect(page.getByTestId('order')).toHaveCount(1);
  await expect(page.getByTestId('order')).toContainText('PENDING');
});

test('customers cannot open the back office', async ({ page }) => {
  await registerCustomer(page, newCustomer());
  await page.goto('/admin');
  await expect(page).toHaveURL('/');
});
