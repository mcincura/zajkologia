import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client';
import { CartProvider } from '../cart/CartContext';
import { CART_STORAGE_KEY } from '../cart/cartState';
import CheckoutSuccess from './CheckoutSuccess';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
}));

const renderSuccess = () =>
  render(
    <CartProvider>
      <MemoryRouter initialEntries={['/checkout/success?session_id=cs_test']}>
        <CheckoutSuccess />
      </MemoryRouter>
    </CartProvider>
  );

const cartOrder = {
  id: 'order-cart',
  checkoutKind: 'cart',
  productName: 'Košík (2 položky)',
  orderType: 'mixed',
  hasDigitalItems: true,
  hasPhysicalItems: true,
  status: 'paid',
  subtotalAmount: 1498,
  discountAmount: 200,
  shippingAmount: 100,
  amountTotal: 1398,
  currency: 'eur',
  couponCode: 'CART10',
  items: [
    { productSlug: 'digital-guide', productName: 'Digital Guide', quantity: 1, netAmount: 499, currency: 'eur' },
    {
      productSlug: 'physical-ball',
      productName: 'Physical Ball',
      variantCode: 'black',
      variantName: 'Black',
      quantity: 1,
      netAmount: 799,
      currency: 'eur',
    },
  ],
};

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(apiFetch).mockReset();
});

describe('CheckoutSuccess', () => {
  it('renders all cart order items and clears local cart after cart checkout load', async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 2,
      items: [{ productSlug: 'digital-guide', quantity: 1, addedAt: '2026-06-25T12:00:00.000Z' }],
      coupon: { code: 'CART10', source: 'manual' },
    }));
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, order: cartOrder });

    renderSuccess();

    expect(await screen.findByText(/Digital Guide/)).toBeInTheDocument();
    expect(screen.getByText(/Physical Ball/)).toBeInTheDocument();
    expect(screen.getByText(/Variant: Black/)).toBeInTheDocument();
    expect(screen.getByText(/Zľava CART10/)).toBeInTheDocument();
    expect(screen.getByText(/13,98\s*€/)).toBeInTheDocument();

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([]);
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).coupon).toBeNull();
    });
  });

  it('does not clear local cart for single-product buy-now orders', async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 2,
      items: [{ productSlug: 'digital-guide', quantity: 1, addedAt: '2026-06-25T12:00:00.000Z' }],
      coupon: { code: 'CART10', source: 'manual' },
    }));
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      order: {
        ...cartOrder,
        id: 'order-single',
        checkoutKind: 'single',
        orderType: 'digital',
        hasDigitalItems: true,
        hasPhysicalItems: false,
        items: [{ productSlug: 'digital-guide', productName: 'Digital Guide', quantity: 1, netAmount: 499, currency: 'eur' }],
      },
    });

    renderSuccess();

    expect(await screen.findByText(/Digital Guide/)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([
      expect.objectContaining({ productSlug: 'digital-guide' }),
    ]);
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).coupon).toBeNull();
    });
  });
});
