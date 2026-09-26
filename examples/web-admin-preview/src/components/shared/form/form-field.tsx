import { useId, type ReactNode } from 'react';

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel
} from '@/components/ui/field';

export interface FormControlProps {
  'aria-describedby'?: string;
  'aria-invalid': boolean;
  id: string;
  name: string;
}

interface FormFieldLayoutProps {
  children: (controlProps: FormControlProps) => ReactNode;
  className?: string;
  controlFirst?: boolean;
  description?: ReactNode;
  errors?: readonly unknown[];
  label: ReactNode;
  name: string;
  orientation?: 'horizontal' | 'responsive' | 'vertical';
}

function collectFieldErrors(
  error: unknown,
  result: Array<{ message: string }>
): void {
  if (Array.isArray(error)) {
    for (const nestedError of error) {
      collectFieldErrors(nestedError, result);
    }
    return;
  }

  if (typeof error === 'string' && error.length > 0) {
    result.push({ message: error });
    return;
  }

  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.length > 0
  ) {
    result.push({ message: error.message });
  }
}

export function toFieldErrors(
  errors: readonly unknown[] = []
): Array<{ message: string }> {
  const result: Array<{ message: string }> = [];

  for (const error of errors) {
    collectFieldErrors(error, result);
  }

  return result;
}

export function FormFieldLayout({
  children,
  className,
  controlFirst = false,
  description,
  errors = [],
  label,
  name,
  orientation = 'vertical'
}: FormFieldLayoutProps) {
  const generatedId = useId();
  const controlId = `${name}-${generatedId}`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const normalizedErrors = toFieldErrors(errors);
  const invalid = normalizedErrors.length > 0;
  const describedBy = [
    description ? descriptionId : undefined,
    invalid ? errorId : undefined
  ]
    .filter(Boolean)
    .join(' ');
  const control = children({
    'aria-describedby': describedBy || undefined,
    'aria-invalid': invalid,
    id: controlId,
    name
  });
  const labelNode = <FieldLabel htmlFor={controlId}>{label}</FieldLabel>;
  const descriptionNode = description ? (
    <FieldDescription id={descriptionId}>{description}</FieldDescription>
  ) : null;
  const errorNode = invalid ? (
    <FieldError errors={normalizedErrors} id={errorId} />
  ) : null;

  if (controlFirst) {
    return (
      <Field
        className={className}
        data-invalid={invalid}
        orientation={orientation}
      >
        {control}
        <FieldContent>
          {labelNode}
          {descriptionNode}
          {errorNode}
        </FieldContent>
      </Field>
    );
  }

  return (
    <Field
      className={className}
      data-invalid={invalid}
      orientation={orientation}
    >
      {labelNode}
      {control}
      {descriptionNode}
      {errorNode}
    </Field>
  );
}
