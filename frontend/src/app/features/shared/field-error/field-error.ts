import { Component, computed, input } from '@angular/core';

/** The parts of a Signal Forms field this component needs (any FieldTree matches this shape). */
interface FieldLike {
  (): { touched(): boolean; errors(): readonly { kind: string; message?: string }[] };
}

/** Shows the first validation error of a field once the user has touched it. */
@Component({
  selector: 'app-field-error',
  templateUrl: './field-error.html',
  styleUrl: './field-error.scss',
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
