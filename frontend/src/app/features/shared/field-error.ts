import { Component, computed, input } from '@angular/core';

/** The parts of a Signal Forms field this component needs (any FieldTree matches this shape). */
interface FieldLike {
  (): { touched(): boolean; errors(): readonly { kind: string; message?: string }[] };
}

/** Shows the first validation error of a field once the user has touched it. */
@Component({
  selector: 'app-field-error',
  template: `
    @if (message(); as msg) {
      <p class="field-error" role="alert">{{ msg }}</p>
    }
  `,
  styles: `
    .field-error {
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
      margin: -12px 0 12px 16px;
    }
  `,
})
export class FieldError {
  readonly field = input.required<FieldLike>();

  protected readonly message = computed(() => {
    const state = this.field()();
    if (!state.touched()) {
      return null;
    }
    const first = state.errors()[0];
    return first ? (first.message ?? 'Invalid value') : null;
  });
}
