import { readFileSync } from 'node:fs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCartCheckoutSession, quoteCheckout } from '../api/client';
import { CartProvider } from '../cart/CartContext';
import { CART_STORAGE_KEY } from '../cart/cartState';
import { useProducts } from '../hooks/useProducts';
import CartPage from './CartPage';

vi.mock('../api/client', () => ({
  createCartCheckoutSession: vi.fn(),
  quoteCheckout: vi.fn(),
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
  {
    slug: 'mixed-bundle',
    name: 'Mixed Bundle',
    productType: 'mixed',
    fulfillmentType: 'physical_preorder',
    amount: 1299,
    shippingAmount: 150,
    maxQuantity: 1,
    currency: 'eur',
    image: '/bundle.jpg',
    isPublished: true,
    colorVariants: [{
      code: 'bundle',
      name: 'Bundle',
      amount: 1299,
      available: 1,
      isActive: true,
      image: '/bundle-variant.jpg',
    }],
  },
];

const renderCartPage = (items, { coupon = null, route = '/cart' } = {}) => {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 2, items, coupon }));
  return render(
    <CartProvider>
      <MemoryRouter initialEntries={[route]}>
        <CartPage />
      </MemoryRouter>
    </CartProvider>
  );
};

describe('cart coupon layout', () => {
  it('allows long applied coupon names and codes to wrap inside the summary', () => {
    const stylesheet = readFileSync('src/styles/cart.css', 'utf8');

    expect(stylesheet).toMatch(
      /\.cart-summary__applied div\s*\{[\s\S]*?min-width:\s*0;/
    );
    expect(stylesheet).toMatch(
      /\.cart-summary__applied strong,[\s\S]*?\.cart-summary__applied span\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/
    );
  });
});

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(createCartCheckoutSession).mockReset();
  vi.mocked(quoteCheckout).mockReset();
  vi.mocked(quoteCheckout).mockImplementation(async (items, options = {}) => {
    const subtotal = items.reduce((total, item) => total + (item.productSlug === 'digital-guide' ? 499 : item.productSlug === 'physical-ball' ? 799 * item.quantity : 1299), 0);
    const shippingAmount = items.some((item) => item.productSlug !== 'digital-guide') ? (items.some((item) => item.productSlug === 'mixed-bundle') ? 150 : 100) : 0;
    const hasCoupon = Boolean(options.couponCode);
    const discountAmount = hasCoupon ? 200 : 0;
    return {
      currency: 'eur',
      subtotal,
      discountAmount,
      netSubtotal: subtotal - discountAmount,
      shippingAmount,
      total: subtotal - discountAmount + shippingAmount,
      normalizedCode: hasCoupon ? options.couponCode : null,
      couponName: hasCoupon ? 'Test zľava' : null,
      coupon: hasCoupon ? { code: options.couponCode, name: 'Test zľava' } : null,
      items: items.map((item) => ({
        productSlug: item.productSlug,
        variantCode: item.variantCode || null,
        discountAmount: 0,
        netAmount: item.productSlug === 'digital-guide' ? 499 : item.productSlug === 'physical-ball' ? 799 * item.quantity : 1299,
      })),
    };
  });
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

    await userEvent.type(screen.getByLabelText(/zľavový kód/i), 'cart10');
    await userEvent.click(screen.getByRole('button', { name: /použiť/i }));
    expect((await screen.findAllByText(/kód CART10 je použitý/i)).length).toBeGreaterThan(0);
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

  it('shows authoritative savings, persists Apply, and clears only on explicit Remove', async () => {
    renderCartPage([{ productSlug: 'digital-guide', quantity: 1 }]);

    await userEvent.type(screen.getByLabelText(/zľavový kód/i), 'cart10');
    await userEvent.click(screen.getByRole('button', { name: /použiť/i }));

    expect((await screen.findAllByText(/kód CART10 je použitý/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/−\s*2,00\s*€/)).toBeInTheDocument();
    expect(screen.getByText(/2,99\s*€/)).toBeInTheDocument();
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).coupon)
        .toMatchObject({ code: 'CART10', source: 'manual' });
    });

    await userEvent.click(screen.getByRole('button', { name: /odstrániť kód CART10/i }));
    expect(await screen.findByText(/zľavový kód bol odstránený/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText(/zľavový kód/i)).toHaveFocus();
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).coupon).toBeNull();
    });
  });

  it('keeps a welcome claim on Stripe cancel/back without showing a second coupon entry', async () => {
    vi.mocked(createCartCheckoutSession).mockRejectedValue(new Error('stop-before-redirect'));
    renderCartPage(
      [{ productSlug: 'digital-guide', quantity: 1 }],
      {
        coupon: { code: 'WELCOME25', claimToken: 'private-token', source: 'welcome' },
        route: '/cart?checkout=cancelled',
      }
    );

    expect(await screen.findByText(/platba nebola dokončená/i)).toHaveTextContent(/zľavový kód zostali uložené/i);
    expect((await screen.findAllByText(/kód WELCOME25 je použitý/i)).length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/^zľavový kód$/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /prejsť do pokladne/i }));
    await waitFor(() => expect(createCartCheckoutSession).toHaveBeenCalledWith(
      [{ productSlug: 'digital-guide', quantity: 1 }],
      { couponCode: 'WELCOME25', claimToken: 'private-token' }
    ));
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).coupon)
      .toMatchObject({ code: 'WELCOME25', claimToken: 'private-token' });
  });

  it('displays unavailable cart items and disables checkout', async () => {
    vi.mocked(useProducts).mockReturnValue({ products: [], loading: false, error: '' });
    renderCartPage([
      { productSlug: 'missing-product', quantity: 1, addedAt: '2026-06-25T12:00:00.000Z' },
    ]);

    expect(screen.getByText('Produkt už nie je dostupný.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /prejsť do pokladne/i })).toBeDisabled();
  });

  it('renders mixed bundle lines as physical-capable and submits the selected variant', async () => {
    vi.mocked(createCartCheckoutSession).mockRejectedValue(new Error('stop-before-redirect'));
    renderCartPage([
      {
        productSlug: 'mixed-bundle',
        variantCode: 'bundle',
        quantity: 1,
        addedAt: '2026-06-25T12:02:00.000Z',
      },
    ]);

    expect(screen.getByText('Digitálny PDF + fyzický produkt')).toBeInTheDocument();
    expect(screen.getByText(/Doprava Packeta/)).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('button', { name: /prejsť do pokladne/i }));

    await waitFor(() => {
      expect(createCartCheckoutSession).toHaveBeenCalledWith([
        { productSlug: 'mixed-bundle', variantCode: 'bundle', quantity: 1 },
      ], {
      });
    });
  });

  it('announces a specific coupon error and keeps checkout blocked', async () => {
    vi.mocked(quoteCheckout).mockImplementation(async (_items, options = {}) => {
      if (options.couponCode) {
        const error = new Error('coupon_expired');
        error.data = { error: 'coupon_expired' };
        throw error;
      }
      return { currency: 'eur', subtotal: 499, discountAmount: 0, netSubtotal: 499, shippingAmount: 0, total: 499, coupon: null, items: [{ netAmount: 499, discountAmount: 0 }] };
    });
    renderCartPage([{ productSlug: 'digital-guide', quantity: 1 }]);
    await userEvent.type(screen.getByLabelText(/zľavový kód/i), 'old');
    await userEvent.click(screen.getByRole('button', { name: /použiť/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/platnosť.*skončila/i);
  });

  it('lets the customer remove a persisted coupon that no longer validates', async () => {
    vi.mocked(quoteCheckout).mockImplementation(async (_items, options = {}) => {
      if (options.couponCode) {
        const error = new Error('coupon_expired');
        error.data = { error: 'coupon_expired' };
        throw error;
      }
      return { currency: 'eur', subtotal: 499, discountAmount: 0, netSubtotal: 499, shippingAmount: 0, total: 499, coupon: null, items: [{ netAmount: 499, discountAmount: 0 }] };
    });
    renderCartPage(
      [{ productSlug: 'digital-guide', quantity: 1 }],
      { coupon: { code: 'OLD', source: 'manual' } }
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/platnosť.*skončila/i);
    await userEvent.click(screen.getByRole('button', { name: /odstrániť uložený kód OLD/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/zľavový kód/i)).toHaveFocus();
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).coupon).toBeNull();
    });
  });
});
