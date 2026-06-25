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
  items: [
    { productSlug: 'digital-guide', productName: 'Digital Guide', quantity: 1 },
    {
      productSlug: 'physical-ball',
      productName: 'Physical Ball',
      variantCode: 'black',
      variantName: 'Black',
      quantity: 1,
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
      version: 1,
      items: [{ productSlug: 'digital-guide', quantity: 1, addedAt: '2026-06-25T12:00:00.000Z' }],
    }));
    vi.mocked(apiFetch).mockResolvedValue({ ok: true, order: cartOrder });

    renderSuccess();

    expect(await screen.findByText(/Digital Guide/)).toBeInTheDocument();
    expect(screen.getByText(/Physical Ball/)).toBeInTheDocument();
    expect(screen.getByText(/Variant:/)).toBeInTheDocument();

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([]);
    });
  });

  it('does not clear local cart for single-product buy-now orders', async () => {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 1,
      items: [{ productSlug: 'digital-guide', quantity: 1, addedAt: '2026-06-25T12:00:00.000Z' }],
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
        items: [{ productSlug: 'digital-guide', productName: 'Digital Guide', quantity: 1 }],
      },
    });

    renderSuccess();

    expect(await screen.findByText(/Digital Guide/)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([
      expect.objectContaining({ productSlug: 'digital-guide' }),
    ]);
  });
});
