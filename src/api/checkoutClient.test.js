import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCartCheckoutSession,
  loadCheckoutAttempt,
  mutateCheckoutAttemptCoupon,
  saveCheckoutCustomer,
} from './client';

const ATTEMPT_ID = '123e4567-e89b-42d3-a456-426614174000';

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: vi.fn(async () => JSON.stringify(data)),
});

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  vi.spyOn(window.crypto, 'randomUUID').mockReturnValue(ATTEMPT_ID);
  vi.spyOn(window.crypto, 'getRandomValues').mockImplementation((bytes) => {
    bytes.fill(9);
    return bytes;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Elements checkout API contract', () => {
  it('adds stable attempt credentials and accepts an on-site bootstrap response', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      ok: true,
      checkoutMode: 'elements',
      checkoutPageUrl: `/checkout/${ATTEMPT_ID}`,
      attempt: { id: ATTEMPT_ID, kind: 'cart', status: 'open' },
      stripe: { publishableKey: 'pk_test_example', clientSecret: 'client_secret_memory_only' },
      display: { total: 499, currency: 'eur' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await createCartCheckoutSession(
      [{ productSlug: 'guide', quantity: 1 }],
      { couponCode: 'SAVE10', attribution: { source: 'test' } }
    );

    expect(response.checkoutPageUrl).toBe(`/checkout/${ATTEMPT_ID}`);
    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      items: [{ productSlug: 'guide', quantity: 1 }],
      couponCode: 'SAVE10',
      attemptId: ATTEMPT_ID,
      checkoutContractVersion: '2',
    });
    expect(body.attemptToken).toHaveLength(43);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.getItem(`zajkologia_checkout_attempt_v2:${ATTEMPT_ID}`))
      .not.toContain('client_secret_memory_only');
  });

  it('sends the attempt token only in the protected resume and mutation headers', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await loadCheckoutAttempt(ATTEMPT_ID, 'browser-owned-token');
    await saveCheckoutCustomer({
      attemptId: ATTEMPT_ID,
      attemptToken: 'browser-owned-token',
      customer: { email: 'buyer@example.com' },
    });
    await mutateCheckoutAttemptCoupon({
      attemptId: ATTEMPT_ID,
      attemptToken: 'browser-owned-token',
      action: 'apply',
      couponCode: 'WELCOME20',
      claimToken: 'private-claim-token',
      mutationId: '323e4567-e89b-42d3-a456-426614174000',
    });

    expect(fetchMock.mock.calls[0][1].headers['X-Checkout-Attempt-Token'])
      .toBe('browser-owned-token');
    expect(fetchMock.mock.calls[1][1].headers['X-Checkout-Attempt-Token'])
      .toBe('browser-owned-token');
    expect(fetchMock.mock.calls[1][1].body).not.toContain('browser-owned-token');
    expect(fetchMock.mock.calls[2][1]).toMatchObject({
      method: 'POST',
      headers: expect.objectContaining({
        'X-Checkout-Attempt-Token': 'browser-owned-token',
      }),
    });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      action: 'apply',
      mutationId: '323e4567-e89b-42d3-a456-426614174000',
      couponCode: 'WELCOME20',
      claimToken: 'private-claim-token',
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it('expires a superseded server attempt before creating a changed cart contract', async () => {
    const secondAttemptId = '223e4567-e89b-42d3-a456-426614174000';
    window.crypto.randomUUID
      .mockReturnValueOnce(ATTEMPT_ID)
      .mockReturnValueOnce(secondAttemptId);
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/cancel')) return jsonResponse({ ok: true, status: 'cancelled' });
      const bodyAttemptId = JSON.parse(fetchMock.mock.calls.at(-1)[1].body).attemptId;
      return jsonResponse({
        ok: true,
        checkoutMode: 'elements',
        checkoutPageUrl: `/checkout/${bodyAttemptId}`,
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await createCartCheckoutSession([{ productSlug: 'guide', quantity: 1 }]);
    await createCartCheckoutSession([{ productSlug: 'guide', quantity: 2 }]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/stripe/cart-checkout-session');
    expect(fetchMock.mock.calls[1][0]).toContain(`/api/checkout/attempts/${ATTEMPT_ID}/cancel`);
    expect(fetchMock.mock.calls[2][0]).toContain('/api/stripe/cart-checkout-session');
  });

  it('serializes same-tab double clicks onto one stable server attempt', async () => {
    const secondAttemptId = '223e4567-e89b-42d3-a456-426614174000';
    window.crypto.randomUUID
      .mockReturnValueOnce(ATTEMPT_ID)
      .mockReturnValueOnce(secondAttemptId);
    const fetchMock = vi.fn(async () => jsonResponse({
      ok: true,
      checkoutMode: 'elements',
      checkoutPageUrl: `/checkout/${ATTEMPT_ID}`,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await Promise.all([
      createCartCheckoutSession([{ productSlug: 'guide', quantity: 1 }]),
      createCartCheckoutSession([{ productSlug: 'guide', quantity: 1 }]),
    ]);

    const attemptIds = fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body).attemptId);
    expect(attemptIds).toEqual([ATTEMPT_ID, ATTEMPT_ID]);
    expect(window.crypto.randomUUID).toHaveBeenCalledTimes(1);
  });
});
