import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Order, Page } from '../../core/models';
import { AdminOrders } from './admin-orders';

const order = (id: number, status: Order['status']): Order => ({
  id, userId: 3, userEmail: 'dana@example.com', status, total: 59.8,
  createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z',
  shipping: { name: 'Dana', addressLine: '1 Main St', city: 'Haifa', postalCode: '31000', country: 'Israel' },
  items: [{ productId: 1, productName: 'Mug', unitPrice: 29.9, quantity: 2, lineTotal: 59.8 }],
});

const page = (content: Order[]): Page<Order> => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1 });

describe('AdminOrders', () => {
  let fixture: ComponentFixture<AdminOrders>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AdminOrders],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminOrders);
    // Not whenStable(): it would wait for the httpResource request, which the test flushes below.
    TestBed.tick();
  });

  afterEach(() => http.verify());

  it('loads current orders first and lists them', async () => {
    const req = http.expectOne((r) => r.url === '/api/admin/orders');
    expect(req.request.params.get('scope')).toBe('CURRENT');
    req.flush(page([order(5, 'PENDING'), order(6, 'SHIPPED')]));
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid=admin-order]');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('dana@example.com');
    expect(rows[0].textContent).toContain('PENDING');
  });

  it('only offers a status change when one is possible', async () => {
    http.expectOne((r) => r.url === '/api/admin/orders').flush(page([order(5, 'PENDING'), order(7, 'DELIVERED')]));
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('[data-testid=admin-order]');
    expect(rows[0].querySelector('button')).not.toBeNull();
    expect(rows[1].querySelector('button')).toBeNull();
  });
});
