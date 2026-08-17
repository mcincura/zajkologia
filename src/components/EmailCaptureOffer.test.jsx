import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWelcomeDiscountOffer, signupForWelcomeDiscount } from '../api/client';
import { CartProvider } from '../cart/CartContext';
import { CART_STORAGE_KEY } from '../cart/cartState';
import { clearEmailCaptureSuppression } from '../utils/welcomeDiscount';
import EmailCaptureOffer from './EmailCaptureOffer';

vi.mock('../api/client', () => ({
  loadWelcomeDiscountOffer: vi.fn(),
  signupForWelcomeDiscount: vi.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
  clearEmailCaptureSuppression();
  vi.clearAllMocks();
});

describe('EmailCaptureOffer', () => {
  const renderOffer = (placement = 'home') => render(
    <CartProvider>
      <EmailCaptureOffer placement={placement} />
    </CartProvider>
  );

  it('renders the canonical welcome amount instead of a hard-coded percentage', async () => {
    vi.mocked(loadWelcomeDiscountOffer).mockResolvedValue({
      name: 'Augustová uvítacia zľava',
      discountType: 'percent_off',
      percentOff: 30,
      amountOff: null,
      currency: 'eur',
    });

    renderOffer();

    expect((await screen.findAllByText(/30% zľav/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/25%/)).not.toBeInTheDocument();
  });

  it('does not solicit a claim when the canonical welcome coupon is unavailable', async () => {
    vi.mocked(loadWelcomeDiscountOffer).mockResolvedValue(null);
    renderOffer();

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /uvítacia zľava/i })).not.toBeInTheDocument();
    });
  });

  it('applies a directly issued welcome claim to the shared persisted checkout state', async () => {
    const user = userEvent.setup();
    vi.mocked(loadWelcomeDiscountOffer).mockResolvedValue({
      name: 'Uvítacia zľava',
      discountType: 'percent_off',
      percentOff: 25,
      currency: 'eur',
    });
    vi.mocked(signupForWelcomeDiscount).mockResolvedValue({
      discountAvailable: true,
      discountCode: 'welcome25',
      discountToken: 'private-claim-token',
      emailSent: true,
    });

    renderOffer();
    await user.type(await screen.findByLabelText('E-mailová adresa'), 'zakaznik@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /získať 25% zľavu/i }));

    expect(await screen.findByText('WELCOME25')).toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY));
      expect(stored.coupon).toMatchObject({
        code: 'WELCOME25',
        claimToken: 'private-claim-token',
        source: 'welcome',
      });
    });
  });
});
