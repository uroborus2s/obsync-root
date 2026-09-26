// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormDialog } from '../form-dialog';
import { mockUsers } from '@/features/users/data/mock-users';
import { UserFormDialog } from '@/features/users/components/user-form-dialog';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function render(node: ReactNode) {
  await act(async () => root.render(node));
}
async function click(label: string) {
  const button = [...document.querySelectorAll('button')].find(
    (element) => element.textContent === label
  );
  expect(button, label).toBeTruthy();
  await act(async () => button!.click());
}
async function enter(name: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(
    `input[name="${name}"]`
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('FormDialog', () => {
  it('uses a dialog and confirms discarding dirty input', async () => {
    const close = vi.fn();
    await render(
      <FormDialog
        open
        onOpenChange={close}
        title='Edit'
        description='Profile'
        onSubmit={vi.fn()}
        isDirty
      >
        <input defaultValue='Unfinished' />
      </FormDialog>
    );
    expect(
      document.querySelector('[data-slot="dialog-content"]')
    ).not.toBeNull();
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeNull();
    await click('Cancel');
    expect(close).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    await click('Keep editing');
    expect(document.querySelector('input')?.value).toBe('Unfinished');
    await click('Cancel');
    await click('Discard changes');
    expect(close).toHaveBeenCalledWith(false);
  });

  it('blocks repeat submit and closing while pending, then preserves input on rejection', async () => {
    let reject!: (reason: Error) => void;
    const submit = vi.fn(
      () =>
        new Promise<void>((_resolve, rejectPromise) => {
          reject = rejectPromise;
        })
    );
    const close = vi.fn();
    await render(
      <FormDialog
        open
        onOpenChange={close}
        title='Edit'
        description='Profile'
        onSubmit={submit}
      >
        <input defaultValue='Keep me' />
      </FormDialog>
    );
    await click('Save changes');
    expect(document.querySelector('fieldset')?.disabled).toBe(true);
    await click('Saving...');
    await click('Cancel');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(close).not.toHaveBeenCalled();
    await act(async () => reject(new Error('Server unavailable')));
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Server unavailable'
    );
    expect(document.querySelector('input')?.value).toBe('Keep me');
    expect(document.querySelector('fieldset')?.disabled).toBe(false);
  });

  it('honors external mutation pending state for synchronous callbacks', async () => {
    const submit = vi.fn();
    await render(
      <FormDialog
        open
        submitting
        onOpenChange={vi.fn()}
        title='Edit'
        description='Profile'
        onSubmit={submit}
      >
        <input />
      </FormDialog>
    );
    await click('Saving...');
    expect(submit).not.toHaveBeenCalled();
    expect(document.querySelector('fieldset')?.disabled).toBe(true);
  });

  it('validates user fields on submit, focuses the first error and submits corrected values', async () => {
    const submit = vi.fn();
    await render(
      <UserFormDialog
        open
        mode='create'
        onOpenChange={vi.fn()}
        onSubmit={submit}
      />
    );
    expect(document.querySelector('[aria-invalid="true"]')).toBeNull();
    await click('Create user');
    expect(submit).not.toHaveBeenCalled();
    expect(
      document.querySelector('input[name="name"]')?.getAttribute('aria-invalid')
    ).toBe('true');
    expect(document.activeElement).toBe(
      document.querySelector('input[name="name"]')
    );
    await enter('name', 'Alex Operator');
    await enter('email', 'alex@example.com');
    await click('Create user');
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Alex Operator',
        email: 'alex@example.com'
      })
    );
  });
  it('keeps edited values after mutation failure and background detail refresh', async () => {
    const submit = vi.fn().mockRejectedValue(new Error('Version conflict'));
    const props = {
      open: true,
      mode: 'edit' as const,
      onOpenChange: vi.fn(),
      onSubmit: submit
    };
    await render(<UserFormDialog {...props} initialUser={mockUsers[0]} />);
    await enter('name', 'Unsaved operator');
    await click('Save changes');
    expect(document.querySelector('[role="alert"]')?.textContent).toContain(
      'Version conflict'
    );
    await render(
      <UserFormDialog
        {...props}
        initialUser={{ ...mockUsers[0], name: 'Refetched operator' }}
      />
    );
    expect(
      document.querySelector<HTMLInputElement>('input[name="name"]')?.value
    ).toBe('Unsaved operator');
    await render(
      <UserFormDialog {...props} open={false} initialUser={mockUsers[0]} />
    );
    await render(<UserFormDialog {...props} initialUser={mockUsers[0]} />);
    expect(
      document.querySelector<HTMLInputElement>('input[name="name"]')?.value
    ).toBe(mockUsers[0].name);
    expect(document.querySelector('[role="alert"]')).toBeNull();
  });
});
