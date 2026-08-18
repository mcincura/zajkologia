import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cancelCheckoutAttempt,
  loadCheckoutAttempt,
  recordCheckoutReturn,
  saveCheckoutCustomer,
} from '../api/client';
import { CartProvider } from '../cart/CartContext';
import CheckoutPage from './CheckoutPage';

const stripeActions = vi.hoisted(() => ({
  validateElements: vi.fn(),
  confirm: vi.fn(),
}));
const stripeHook = vi.hoisted(() => ({ type: 'success', error: null }));

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(async () => ({ mocked: true })),
}));

vi.mock('@stripe/react-stripe-js/checkout', () => ({
  CheckoutElementsProvider: ({ children }) => <>{children}</>,
  useCheckoutElements: () => ({ ...stripeHook, checkout: stripeActions }),
  PaymentElement: ({ onChange, onReady }) => (
    <button type="button" data-testid="payment-element" onClick={() => {
      onReady?.({ focus: vi.fn() });
      onChange?.({ complete: true });
    }}>Complete payment</button>
  ),
}));

vi.mock('../api/client', () => ({
  cancelCheckoutAttempt: vi.fn(),
  loadCheckoutAttempt: vi.fn(),
  recordCheckoutReturn: vi.fn(),
  saveCheckoutCustomer: vi.fn(),
}));

const ATTEMPT_ID = '123e4567-e89b-42d3-a456-426614174000';
const ATTEMPT_TOKEN = 'browser-owned-attempt-token-1234567890';

const display = {
  kind: 'single',
  hasDigitalItems: true,
  hasPhysicalItems: false,
  items: [{ productSlug: 'guide', name: 'Príručka', quantity: 1, unitAmount: 499, netAmount: 399, discountAmount: 100, currency: 'eur' }],
  subtotal: 499,
  discountAmount: 100,
  shipping: { amount: 0, allowedCountries: [], packeta: null },
  total: 399,
  currency: 'eur',
  coupon: { code: 'SAVE20', discountAmount: 100 },
  consent: { version: 'digital-v1', text: 'Súhlasím s okamžitým dodaním digitálneho obsahu.' },
  returnPath: '/product/guide',
};

const draftBootstrap = {
  ok: true,
  checkoutMode: 'elements',
  checkoutPageUrl: `/checkout/${ATTEMPT_ID}`,
  attempt: { id: ATTEMPT_ID, kind: 'single', status: 'open' },
  stripe: null,
  display,
};

const customer = {
  email: 'buyer@example.com',
  billing: {
    name: 'Buyer Rabbit',
    phone: '',
    address: {
      line1: 'Hlavná 1',
      line2: '',
      city: 'Bratislava',
      state: '',
      postal_code: '81101',
      country: 'SK',
    },
  },
  shipping: null,
  delivery: null,
  consent: { accepted: true, version: 'digital-v1' },
};

const readyBootstrap = {
  ...draftBootstrap,
  attempt: { ...draftBootstrap.attempt, status: 'ready_to_confirm' },
  customer,
  stripe: {
    publishableKey: 'pk_test_example',
    clientSecret: 'cs_test_example_secret_memory',
    sessionId: 'cs_test_example',
    returnUrl: `https://zajkologia.com/checkout/return?session_id=cs_test_example&attempt_id=${ATTEMPT_ID}`,
  },
};

const renderCheckout = (route = `/checkout/${ATTEMPT_ID}`) => render(
  <CartProvider>
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/checkout/:attemptId" element={<CheckoutPage />} />
        <Route path="/checkout/return" element={<CheckoutPage />} />
      </Routes>
    </MemoryRouter>
  </CartProvider>
);

const fillBillingDetails = async ({ email = true } = {}) => {
  if (email) await userEvent.type(screen.getByLabelText(/^e-mail$/i), 'buyer@example.com');
  await userEvent.type(screen.getByLabelText(/meno a priezvisko/i), 'Buyer Rabbit');
  await userEvent.type(screen.getByLabelText(/ulica a číslo/i), 'Hlavná 1');
  await userEvent.type(screen.getByLabelText(/^mesto$/i), 'Bratislava');
  await userEvent.type(screen.getByLabelText(/psč/i), '81101');
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  delete window.Packeta;
  window.sessionStorage.setItem(
    `zajkologia_checkout_attempt_v2:${ATTEMPT_ID}`,
    JSON.stringify({
      id: ATTEMPT_ID,
      token: ATTEMPT_TOKEN,
      contractVersion: '2',
      kind: 'single',
      scope: 'single:guide',
      createdAt: Date.now(),
      createdOnServer: true,
    })
  );
  vi.mocked(loadCheckoutAttempt).mockResolvedValue(draftBootstrap);
  vi.mocked(recordCheckoutReturn).mockResolvedValue(draftBootstrap);
  vi.mocked(saveCheckoutCustomer).mockResolvedValue(readyBootstrap);
  vi.mocked(cancelCheckoutAttempt).mockResolvedValue({ ok: true });
  stripeActions.validateElements.mockResolvedValue({ type: 'success' });
  stripeActions.confirm.mockResolvedValue({ type: 'success', session: { status: 'complete' } });
  stripeHook.type = 'success';
  stripeHook.error = null;
});

describe('first-party Checkout Elements page', () => {
  it('withholds Stripe UI until canonical details and consent are saved', async () => {
    renderCheckout();

    expect(await screen.findByRole('heading', { name: /dokončite objednávku/i })).toBeInTheDocument();
    expect(screen.getByText(/kód SAVE20 je už započítaný/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument();
    await fillBillingDetails();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /pokračovať k bezpečnej platbe/i }));

    await waitFor(() => expect(saveCheckoutCustomer).toHaveBeenCalledTimes(1));
    expect(saveCheckoutCustomer).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: ATTEMPT_ID,
      attemptToken: ATTEMPT_TOKEN,
      customer: expect.objectContaining({
        email: 'buyer@example.com',
        consent: { accepted: true, version: 'digital-v1' },
      }),
    }));
    expect(await screen.findByTestId('payment-element')).toBeInTheDocument();
    expect(stripeActions.confirm).not.toHaveBeenCalled();
  });

  it('passes the server-trusted return URL and canonical details to Stripe confirm', async () => {
    vi.mocked(loadCheckoutAttempt).mockResolvedValue(readyBootstrap);
    renderCheckout();
    await userEvent.click(await screen.findByTestId('payment-element'));
    await userEvent.click(screen.getByRole('button', { name: /zaplatiť 3,99/i }));

    await waitFor(() => expect(stripeActions.confirm).toHaveBeenCalledOnce());
    expect(stripeActions.confirm).toHaveBeenCalledWith(expect.objectContaining({
      returnUrl: readyBootstrap.stripe.returnUrl,
      redirect: 'if_required',
      email: 'buyer@example.com',
      billingAddress: expect.objectContaining({ name: 'Buyer Rabbit' }),
    }));
    const confirmInput = stripeActions.confirm.mock.calls[0][0];
    expect(confirmInput.billingAddress).not.toHaveProperty('phone');
    expect(saveCheckoutCustomer).not.toHaveBeenCalled();
  });

  it('recovers an already-finalized bootstrap after a lost details response', async () => {
    vi.mocked(loadCheckoutAttempt)
      .mockResolvedValueOnce(draftBootstrap)
      .mockResolvedValueOnce(readyBootstrap);
    vi.mocked(saveCheckoutCustomer).mockRejectedValue(new Error('network_down'));
    renderCheckout();
    await screen.findByRole('heading', { name: /dokončite objednávku/i });
    await fillBillingDetails();
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /pokračovať/i }));

    expect(await screen.findByTestId('payment-element')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('uses a synchronous submission lock to prevent duplicate confirmation', async () => {
    vi.mocked(loadCheckoutAttempt).mockResolvedValue(readyBootstrap);
    let finishConfirmation;
    stripeActions.confirm.mockImplementation(() => new Promise((resolve) => { finishConfirmation = resolve; }));
    renderCheckout();
    await userEvent.click(await screen.findByTestId('payment-element'));
    const submit = screen.getByRole('button', { name: /zaplatiť 3,99/i });
    fireEvent.click(submit);
    fireEvent.click(submit);
    await waitFor(() => expect(stripeActions.confirm).toHaveBeenCalledTimes(1));
    finishConfirmation({ type: 'success', session: { status: 'complete' } });
  });

  it('never reopens payment when the first status request fails after successful confirm', async () => {
    vi.mocked(loadCheckoutAttempt)
      .mockResolvedValueOnce(readyBootstrap)
      .mockRejectedValueOnce(new Error('network_down'));
    renderCheckout();
    await userEvent.click(await screen.findByTestId('payment-element'));
    await userEvent.click(screen.getByRole('button', { name: /zaplatiť/i }));

    const heading = await screen.findByRole('heading', { name: /platbu bezpečne potvrdzujeme/i });
    expect(heading).toHaveFocus();
    expect(screen.queryByRole('button', { name: /zaplatiť/i })).not.toBeInTheDocument();
  });

  it('uses the official Packeta picker and records a selected restricted-country point', async () => {
    const physicalDisplay = {
      ...display,
      hasDigitalItems: false,
      hasPhysicalItems: true,
      total: 599,
      shipping: {
        amount: 100,
        allowedCountries: ['SK', 'CZ'],
        label: 'Packeta / Z-BOX',
        packeta: {
          apiKey: '1234567890ABCDEF',
          options: { language: 'sk', country: 'sk,cz' },
        },
      },
      consent: { version: 'physical-v1', text: 'Súhlasím s podmienkami fyzickej objednávky.' },
    };
    vi.mocked(loadCheckoutAttempt).mockResolvedValue({ ...draftBootstrap, display: physicalDisplay });
    window.Packeta = {
      Widget: {
        pick: vi.fn((_key, callback) => callback({
          id: '12345',
          name: 'Z-BOX Bratislava',
          group: 'zbox',
          street: 'Hlavná 10',
          city: 'Bratislava',
          zip: '811 01',
          country: 'sk',
        })),
      },
    };
    renderCheckout();

    expect(await screen.findByRole('heading', { name: /doručenie/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /vybrať výdajné miesto na mape/i }));
    expect(window.Packeta.Widget.pick).toHaveBeenCalledWith(
      '1234567890ABCDEF',
      expect.any(Function),
      expect.objectContaining({ country: 'sk,cz' })
    );
    expect(screen.getByText(/ID 12345 · Z-BOX/i)).toBeInTheDocument();
    expect(screen.queryByText(/dostupné krajiny/i)).not.toBeInTheDocument();
  });

  it('shows a focused accessible error and never initializes payment when details are missing', async () => {
    renderCheckout();
    await screen.findByRole('heading', { name: /dokončite objednávku/i });
    await userEvent.click(screen.getByRole('button', { name: /pokračovať k bezpečnej platbe/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveFocus();
    expect(saveCheckoutCustomer).not.toHaveBeenCalled();
    expect(stripeActions.confirm).not.toHaveBeenCalled();
  });

  it('supports a zero-total authoritative Session without mounting a payment field', async () => {
    vi.mocked(loadCheckoutAttempt).mockResolvedValue({
      ...readyBootstrap,
      display: { ...display, discountAmount: 499, total: 0, coupon: { code: 'FREE100', discountAmount: 499 } },
    });
    renderCheckout();
    expect(await screen.findByText(/platobná karta nie je potrebná/i)).toBeInTheDocument();
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /dokončiť objednávku/i }));
    await waitFor(() => expect(stripeActions.confirm).toHaveBeenCalledOnce());
  });

  it('keeps a verified membership email immutable before payment bootstrap', async () => {
    const membershipDraft = {
      ...draftBootstrap,
      attempt: { ...draftBootstrap.attempt, kind: 'membership' },
      display: {
        ...display,
        kind: 'membership',
        recurring: { interval: 'month', intervalCount: 1 },
        customer: { email: 'member@example.invalid' },
        coupon: null,
      },
    };
    vi.mocked(loadCheckoutAttempt).mockResolvedValue(membershipDraft);
    renderCheckout();
    expect(await screen.findByText('member@example.invalid')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^e-mail$/i)).not.toBeInTheDocument();
    await fillBillingDetails({ email: false });
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /pokračovať/i }));
    await waitFor(() => expect(saveCheckoutCustomer).toHaveBeenCalledWith(expect.objectContaining({
      customer: expect.objectContaining({ email: 'member@example.invalid' }),
    })));
  });

  it('announces a decline and allows a safe retry', async () => {
    vi.mocked(loadCheckoutAttempt).mockResolvedValue(readyBootstrap);
    stripeActions.confirm.mockResolvedValue({ type: 'error', error: { code: 'paymentFailed', message: 'Karta bola zamietnutá.' } });
    renderCheckout();
    await userEvent.click(await screen.findByTestId('payment-element'));
    await userEvent.click(screen.getByRole('button', { name: /zaplatiť/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Karta bola zamietnutá.');
    expect(alert).toHaveFocus();
    expect(screen.getByRole('button', { name: /zaplatiť/i })).toBeEnabled();
  });

  it('records an authentication return and renders only authoritative processing state', async () => {
    vi.mocked(recordCheckoutReturn).mockResolvedValue({
      ...readyBootstrap,
      attempt: { ...readyBootstrap.attempt, resultState: 'processing' },
      stripe: { sessionId: 'cs_test_example' },
    });
    renderCheckout(`/checkout/return?attempt_id=${ATTEMPT_ID}`);
    const heading = await screen.findByRole('heading', { name: /platbu bezpečne potvrdzujeme/i });
    expect(heading).toHaveFocus();
    expect(recordCheckoutReturn).toHaveBeenCalledWith(ATTEMPT_ID, ATTEMPT_TOKEN);
    expect(screen.getByText(/čakáme na podpísaný Stripe webhook/i)).toBeInTheDocument();
  });

  it('surfaces Stripe initialization errors instead of leaving a silent disabled form', async () => {
    vi.mocked(loadCheckoutAttempt).mockResolvedValue(readyBootstrap);
    stripeHook.type = 'error';
    stripeHook.error = { message: 'Stripe sa nepodarilo načítať.' };
    renderCheckout();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Stripe sa nepodarilo načítať.');
    expect(alert).toHaveFocus();
    expect(screen.getByRole('button', { name: /zaplatiť/i })).toBeDisabled();
  });
});
