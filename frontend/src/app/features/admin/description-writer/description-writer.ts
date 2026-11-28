import { Component, inject, signal } from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AdminApi } from '../../../core/admin-api';
import { errorMessage } from '../../../core/errors';
import { Product } from '../../../core/models';

export const MAX_DESCRIPTION = 2000; // products.description column

/**
 * Dialog: cloud/ai-service (Spring AI) suggests a product description from the facts the admin gives;
 * the admin can edit it and decides whether to save it. Closes with the updated product, or nothing.
 */
@Component({
  selector: 'app-description-writer',
  imports: [FormField, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  templateUrl: './description-writer.html',
  styleUrl: './description-writer.scss',
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
