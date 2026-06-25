import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCartCheckoutSession } from '../api/client';
import { CartProvider } from '../cart/CartContext';
import { CART_STORAGE_KEY } from '../cart/cartState';
import { useProducts } from '../hooks/useProducts';
import CartPage from './CartPage';

vi.mock('../api/client', () => ({
  createCartCheckoutSession: vi.fn(),
}));

vi.mock('../hooks/useProducts', () => ({
  useProducts: vi.fn(),
}));

const products = [
  {
    slug: 'digital-guide',
    name: 'Digital Guide',
    productType: 'digital',
    amount: 499,
    currency: 'eur',
    image: '/guide.jpg',
    isPublished: true,
  },
  {
    slug: 'physical-ball',
    name: 'Physical Ball',
    productType: 'physical',
    amount: 799,
    shippingAmount: 100,
    maxQuantity: 2,
    currency: 'eur',
    image: '/ball.jpg',
    isPublished: true,
    colorVariants: [{
      code: 'black',
      name: 'Black',
      amount: 799,
      available: 2,
      isActive: true,
      image: '/ball-black.jpg',
    }],
  },
];

const renderCartPage = (items) => {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items }));
  return render(
    <CartProvider>
      <MemoryRouter initialEntries={['/cart']}>
        <CartPage />
      </MemoryRouter>
    </CartProvider>
  );
};

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(createCartCheckoutSession).mockReset();
  vi.mocked(useProducts).mockReturnValue({ products, loading: false, error: '' });
});

describe('CartPage', () => {
  it('submits normalized cart checkout payload with cart coupon', async () => {
    vi.mocked(createCartCheckoutSession).mockRejectedValue(new Error('stop-before-redirect'));
    renderCartPage([
      { productSlug: 'digital-guide', quantity: 1, addedAt: '2026-06-25T12:00:00.000Z' },
      {
        productSlug: 'physical-ball',
        variantCode: 'black',
        quantity: 2,
        addedAt: '2026-06-25T12:01:00.000Z',
      },
    ]);

    await userEvent.type(screen.getByLabelText(/zľavový kód pre košík/i), 'cart10');
    await userEvent.click(screen.getByRole('button', { name: /prejsť do pokladne/i }));

    await waitFor(() => {
      expect(createCartCheckoutSession).toHaveBeenCalledWith([
        { productSlug: 'digital-guide', quantity: 1 },
        { productSlug: 'physical-ball', variantCode: 'black', quantity: 2 },
      ], {
        couponCode: 'CART10',
      });
    });
  });

  it('displays unavailable cart items and disables checkout', () => {
    vi.mocked(useProducts).mockReturnValue({ products: [], loading: false, error: '' });
    renderCartPage([
      { productSlug: 'missing-product', quantity: 1, addedAt: '2026-06-25T12:00:00.000Z' },
    ]);

    expect(screen.getByText('Produkt už nie je dostupný.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /prejsť do pokladne/i })).toBeDisabled();
  });
});
