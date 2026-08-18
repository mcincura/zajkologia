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
  shipping: { amount: 0, allowedCountries: [] },
  total: 399,
  currency: 'eur',
  coupon: { code: 'SAVE20', discountAmount: 100 },
  consent: { version: 'digital-v1', text: 'Súhlasím s okamžitým dodaním digitálneho obsahu.' },
  returnPath: '/product/guide',
};

const physicalDisplay = {
  ...display,
  hasDigitalItems: false,
  hasPhysicalItems: true,
  total: 599,
  shipping: {
    amount: 100,
    allowedCountries: ['SK', 'CZ'],
    label: 'Packeta / Z-BOX',
    addressEntry: 'manual_packeta',
  },
  consent: { version: 'physical-v1', text: 'Súhlasím s podmienkami fyzickej objednávky.' },
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
  await userEvent.type(screen.getByLabelText(/^ulica a číslo$/i), 'Hlavná 1');
  await userEvent.type(screen.getByLabelText(/^mesto$/i), 'Bratislava');
  await userEvent.type(screen.getByLabelText(/^psč$/i), '81101');
};

const fillManualPacketaAddress = async () => {
  await userEvent.type(screen.getByLabelText(/meno príjemcu/i), 'Buyer Rabbit');
  await userEvent.type(screen.getByLabelText(/telefón príjemcu/i), '+421900000000');
  await userEvent.selectOptions(screen.getByLabelText(/typ výdajného miesta/i), 'zbox');
  await userEvent.type(screen.getByLabelText(/ulica a číslo Packeta/i), 'Hlavná 10');
  await userEvent.type(screen.getByLabelText(/názov alebo označenie miesta/i), 'Z-BOX Bratislava');
  await userEvent.type(screen.getByLabelText(/mesto Packeta/i), 'Bratislava');
  await userEvent.type(screen.getByLabelText(/PSČ Packeta/i), '81101');
  await userEvent.selectOptions(screen.getByLabelText(/krajina doručenia/i), 'SK');
  await userEvent.type(screen.getByLabelText(/poznámka pre doručenie/i), 'Volajte po príchode.');
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
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

  it('saves the manually entered Packeta address and explicit address confirmation', async () => {
    vi.mocked(loadCheckoutAttempt).mockResolvedValue({ ...draftBootstrap, display: physicalDisplay });
    vi.mocked(saveCheckoutCustomer).mockResolvedValue({
      ...readyBootstrap,
      display: physicalDisplay,
      customer: {
        ...customer,
        shipping: {
          name: 'Buyer Rabbit',
          phone: '+421900000000',
          address: {
            line1: 'Hlavná 10',
            line2: 'Z-BOX Bratislava',
            city: 'Bratislava',
            state: '',
            postal_code: '81101',
            country: 'SK',
          },
        },
        delivery: {
          method: 'zbox',
          pointId: '',
          addressConfirmed: true,
          instructions: 'Volajte po príchode.',
        },
        consent: { accepted: true, version: 'physical-v1' },
      },
    });
    renderCheckout();

    expect(await screen.findByRole('heading', { name: /doručenie/i })).toBeInTheDocument();
    expect(screen.getByText(/nezadávajte domácu adresu/i)).toBeInTheDocument();
    expect(screen.queryByText(/vybrať výdajné miesto na mape/i)).not.toBeInTheDocument();

    await fillBillingDetails();
    await fillManualPacketaAddress();
    await userEvent.click(screen.getByLabelText(/zadal\/a som adresu vybraného Packeta/i));
    await userEvent.click(screen.getByLabelText(/súhlasím s podmienkami fyzickej objednávky/i));
    await userEvent.click(screen.getByRole('button', { name: /pokračovať k bezpečnej platbe/i }));

    await waitFor(() => expect(saveCheckoutCustomer).toHaveBeenCalledOnce());
    expect(saveCheckoutCustomer).toHaveBeenCalledWith(expect.objectContaining({
      customer: expect.objectContaining({
        shipping: {
          name: 'Buyer Rabbit',
          phone: '+421900000000',
          address: {
            line1: 'Hlavná 10',
            line2: 'Z-BOX Bratislava',
            city: 'Bratislava',
            state: '',
            postal_code: '81101',
            country: 'SK',
          },
        },
        delivery: {
          method: 'zbox',
          pointId: '',
          addressConfirmed: true,
          instructions: 'Volajte po príchode.',
        },
        consent: { accepted: true, version: 'physical-v1' },
      }),
    }));
  });

  it('focuses the required Packeta-address confirmation before saving', async () => {
    vi.mocked(loadCheckoutAttempt).mockResolvedValue({ ...draftBootstrap, display: physicalDisplay });
    renderCheckout();

    await screen.findByRole('heading', { name: /doručenie/i });
    await fillBillingDetails();
    await fillManualPacketaAddress();
    await userEvent.click(screen.getByLabelText(/súhlasím s podmienkami fyzickej objednávky/i));
    await userEvent.click(screen.getByRole('button', { name: /pokračovať k bezpečnej platbe/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/vyplňte prosím všetky povinné údaje/i);
    expect(screen.getByLabelText(/zadal\/a som adresu vybraného Packeta/i)).toHaveFocus();
    expect(saveCheckoutCustomer).not.toHaveBeenCalled();
  });

  it('announces missing details, focuses the first invalid field, and never initializes payment', async () => {
    renderCheckout();
    await screen.findByRole('heading', { name: /dokončite objednávku/i });
    await userEvent.click(screen.getByRole('button', { name: /pokračovať k bezpečnej platbe/i }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/vyplňte prosím všetky povinné údaje/i);
    expect(screen.getByLabelText(/^e-mail$/i)).toHaveFocus();
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
