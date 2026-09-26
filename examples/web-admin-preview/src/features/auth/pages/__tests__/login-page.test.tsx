// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LoginPage } from '../login-page';
import { demoAuthCredentials } from '@/features/auth/lib/session';

const { login, push } = vi.hoisted(() => ({ login: vi.fn(), push: vi.fn() }));
vi.mock('@/app/providers/auth-provider', () => ({
  useAuth: () => ({ login })
}));
vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ history: { push } })
}));
let root: Root;
let container: HTMLDivElement;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  login.mockReset();
  push.mockReset();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(<LoginPage redirectTo='https://untrusted.example' />)
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
async function submit() {
  await act(async () =>
    container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click()
  );
}
async function enter(name: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(
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

it('validates before authentication and focuses the first invalid field', async () => {
  await enter('account', '   ');
  await enter('password', '');
  expect(container.querySelector('[role="alert"]')).toBeNull();
  await submit();
  expect(login).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(
    container.querySelector('input[name="account"]')
  );
  expect(container.textContent).toContain('请输入登录密码');
});

it('preserves credentials on failed authentication and keeps remember and safe redirect behavior', async () => {
  await enter('account', `  ${demoAuthCredentials.account}  `);
  await act(async () =>
    container.querySelector<HTMLButtonElement>('[role="checkbox"]')!.click()
  );
  login.mockImplementationOnce(() => {
    throw new Error('Invalid credentials');
  });
  await submit();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    'Invalid credentials'
  );
  expect(
    container.querySelector<HTMLInputElement>('input[name="password"]')?.value
  ).toBe(demoAuthCredentials.password);
  expect(push).not.toHaveBeenCalled();
  await submit();
  expect(login).toHaveBeenLastCalledWith({
    account: demoAuthCredentials.account,
    password: demoAuthCredentials.password,
    remember: false
  });
  expect(push).toHaveBeenCalledWith('/');
});
