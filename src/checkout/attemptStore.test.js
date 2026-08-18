import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkoutAttemptFields,
  clearCheckoutAttempt,
  getCheckoutAttempt,
  markCheckoutAttemptCreated,
  prepareCheckoutAttempt,
} from './attemptStore';

const UUIDS = [
  '123e4567-e89b-42d3-a456-426614174000',
  '223e4567-e89b-42d3-a456-426614174000',
];

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  let index = 0;
  vi.spyOn(window.crypto, 'randomUUID').mockImplementation(() => UUIDS[index++] || UUIDS.at(-1));
  vi.spyOn(window.crypto, 'getRandomValues').mockImplementation((bytes) => {
    bytes.fill(7);
    return bytes;
  });
});

afterEach(() => vi.restoreAllMocks());

describe('checkout attempt session ownership', () => {
  it('reuses the same attempt for a duplicate request and never writes it to localStorage', async () => {
    const first = await prepareCheckoutAttempt({
      kind: 'cart',
      scope: 'cart',
      payload: { items: [{ productSlug: 'guide', quantity: 1 }] },
    });
    const second = await prepareCheckoutAttempt({
      kind: 'cart',
      scope: 'cart',
      payload: { items: [{ productSlug: 'guide', quantity: 1 }] },
    });

    expect(second.attempt.id).toBe(first.attempt.id);
    expect(second.attempt.token).toBe(first.attempt.token);
    expect(checkoutAttemptFields(first.attempt)).toMatchObject({
      attemptId: UUIDS[0],
      checkoutContractVersion: '2',
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBeGreaterThan(0);
  });

  it('supersedes a server-created attempt when the cart contract changes', async () => {
    const first = (await prepareCheckoutAttempt({
      kind: 'cart',
      scope: 'cart',
      payload: { items: [{ productSlug: 'guide', quantity: 1 }] },
    })).attempt;
    markCheckoutAttemptCreated(first);

    const next = await prepareCheckoutAttempt({
      kind: 'cart',
      scope: 'cart',
      payload: { items: [{ productSlug: 'guide', quantity: 2 }] },
    });

    expect(next.attempt.id).toBe(UUIDS[1]);
    expect(next.superseded.id).toBe(UUIDS[0]);
  });

  it('clears only the matching attempt and active pointer after success', async () => {
    const attempt = (await prepareCheckoutAttempt({
      kind: 'single',
      scope: 'single:guide',
      payload: { productSlug: 'guide' },
    })).attempt;
    expect(getCheckoutAttempt(attempt.id)).toMatchObject({ id: attempt.id });
    clearCheckoutAttempt(attempt.id);
    expect(getCheckoutAttempt(attempt.id)).toBeNull();
  });

  it('stores only a digest of request data, not membership email PII', async () => {
    const attempt = (await prepareCheckoutAttempt({
      kind: 'membership',
      scope: 'membership',
      payload: { email: 'buyer@example.invalid' },
    })).attempt;
    const persisted = window.sessionStorage.getItem(
      `zajkologia_checkout_attempt_v2:${attempt.id}`
    );
    expect(attempt.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted).not.toContain('buyer@example.invalid');
  });
});
