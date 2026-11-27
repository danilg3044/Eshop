import { Component, inject, signal } from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdminApi } from '../../core/admin-api';
import { errorMessage } from '../../core/errors';
import { Product } from '../../core/models';

export const MAX_DESCRIPTION = 2000; // products.description column

/**
 * Dialog: cloud/ai-service (Spring AI) suggests a product description from the facts the admin gives;
 * the admin can edit it and decides whether to save it. Closes with the updated product, or nothing.
 */
@Component({
  selector: 'app-description-writer',
  imports: [FormField, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  template: `
    <h2 mat-dialog-title>Description for {{ product.name }}</h2>
    <mat-dialog-content>
      <p class="hint">The AI service writes a suggestion using only the facts below. Check it before you apply it.</p>

      <mat-form-field class="wide">
        <mat-label>Keywords</mat-label>
        <input matInput [formField]="draft.keywords" placeholder="hand-glazed, set of 4, dishwasher safe" />
        <mat-hint>Comma-separated facts the text may use</mat-hint>
      </mat-form-field>

      <div class="generate">
        <button mat-stroked-button type="button" (click)="generate()" [disabled]="busy()">
          {{ generated() ? 'Write another' : 'Write with AI' }}
        </button>
      </div>
      @if (busy()) {
        <mat-progress-bar mode="indeterminate" aria-label="Working" />
      }
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }

      <mat-form-field class="wide">
        <mat-label>Description</mat-label>
        <textarea matInput rows="6" [formField]="draft.description"></textarea>
        <mat-hint align="end">{{ model().description.length }} / {{ max }}</mat-hint>
        @for (e of draft.description().errors(); track e.kind) {
          <mat-error>{{ e.message }}</mat-error>
        }
      </mat-form-field>

      @if (highlights().length) {
        <h3>Highlights</h3>
        <ul data-testid="highlights">
          @for (h of highlights(); track h) {
            <li>{{ h }}</li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button type="button" (click)="apply()" [disabled]="busy() || draft().invalid()">Apply</button>
    </mat-dialog-actions>
  `,
  styles: `
    .wide { width: 100%; }
    .hint { color: var(--mat-sys-on-surface-variant); margin-top: 0; }
    .generate { margin: 4px 0 16px; }
    .error { color: var(--mat-sys-error); }
    h3 { font: var(--mat-sys-title-small); margin: 8px 0 0; }
  `,
})
export class DescriptionWriter {
  protected readonly product = inject<Product>(MAT_DIALOG_DATA);
  private readonly api = inject(AdminApi);
  private readonly dialogRef = inject<MatDialogRef<DescriptionWriter, Product>>(MatDialogRef);

  protected readonly max = MAX_DESCRIPTION;
  protected readonly model = signal({ keywords: '', description: this.product.description ?? '' });
  protected readonly draft = form(this.model, (p) => {
    maxLength(p.description, MAX_DESCRIPTION, { message: `At most ${MAX_DESCRIPTION} characters` });
  });

  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly generated = signal(false);
  protected readonly highlights = signal<string[]>([]);

  protected generate(): void {
    const { keywords, description } = this.model();
    this.start();
    this.api
      .suggestDescription({
        name: this.product.name,
        category: this.product.category,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 10),
        currentDescription: description.trim() || null,
      })
      .subscribe({
        next: (suggestion) => {
          this.model.update((m) => ({ ...m, description: suggestion.description }));
          this.highlights.set(suggestion.highlights ?? []);
          this.generated.set(true);
          this.busy.set(false);
        },
        error: (err: unknown) => this.fail(err, 'The AI service is not reachable. Is cloud/ai-service running?'),
      });
  }

  protected apply(): void {
    this.start();
    this.api.changeDescription(this.product.id, this.model().description).subscribe({
      next: (product) => this.dialogRef.close(product),
      error: (err: unknown) => this.fail(err, 'Could not save the description'),
    });
  }

  private start(): void {
    this.busy.set(true);
    this.error.set(null);
  }

  private fail(err: unknown, fallback: string): void {
    this.error.set(errorMessage(err, fallback));
    this.busy.set(false);
  }
}
