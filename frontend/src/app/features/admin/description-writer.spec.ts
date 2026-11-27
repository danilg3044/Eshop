import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { Product } from '../../core/models';
import { DescriptionWriter } from './description-writer';

const mug: Product = {
  id: 3, sku: 'HOME-002', name: 'Ceramic Mug Set', description: 'Old text', category: 'Home',
  price: 29.9, stock: 12, imageUrl: null, active: true,
};

describe('DescriptionWriter', () => {
  let fixture: ComponentFixture<DescriptionWriter>;
  let http: HttpTestingController;
  let dialogRef: { close: ReturnType<typeof vi.fn> };
  let el: HTMLElement;

  beforeEach(async () => {
    dialogRef = { close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [DescriptionWriter],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DIALOG_DATA, useValue: mug },
        { provide: MatDialogRef, useValue: dialogRef },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DescriptionWriter);
    el = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  const button = (text: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === text)!;
  const textarea = () => el.querySelector<HTMLTextAreaElement>('textarea')!;

  it('starts from the current description', () => {
    expect(textarea().value).toBe('Old text');
  });

  it('asks the AI service with the product facts and keywords, and shows the suggestion', async () => {
    const keywords = el.querySelector<HTMLInputElement>('input')!;
    keywords.value = ' hand-glazed , set of 4,, ';
    keywords.dispatchEvent(new Event('input'));

    button('Write with AI').click();
    const req = http.expectOne('/api/ai/product-descriptions');
    expect(req.request.body).toEqual({
      name: 'Ceramic Mug Set',
      category: 'Home',
      keywords: ['hand-glazed', 'set of 4'],
      currentDescription: 'Old text',
    });
    req.flush({ description: 'Four hand-glazed mugs.', highlights: ['Hand-glazed', 'Set of four'] });
    await fixture.whenStable();

    expect(textarea().value).toBe('Four hand-glazed mugs.');
    expect(el.querySelector('[data-testid=highlights]')?.textContent).toContain('Set of four');
  });

  it("shows the AI service's explanation when no provider is configured", async () => {
    button('Write with AI').click();
    http.expectOne('/api/ai/product-descriptions').flush(
      { status: 503, detail: 'No AI provider is configured.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('No AI provider is configured.');
  });

  it('saves the (edited) text and closes with the updated product', async () => {
    textarea().value = 'Edited by the admin.';
    textarea().dispatchEvent(new Event('input'));

    button('Apply').click();
    const req = http.expectOne('/api/admin/products/3/description');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ description: 'Edited by the admin.' });
    req.flush({ ...mug, description: 'Edited by the admin.' });

    expect(dialogRef.close).toHaveBeenCalledWith({ ...mug, description: 'Edited by the admin.' });
  });
});
