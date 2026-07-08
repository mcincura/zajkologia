import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCartCheckoutSession, createCheckoutSession } from '../api/client';
import { CartProvider } from '../cart/CartContext';
import { ProductDetailView } from './ProductDetails';

vi.mock('../api/client', () => ({
  createCartCheckoutSession: vi.fn(),
  createCheckoutSession: vi.fn(),
  loadVisitorCountry: vi.fn(async () => 'SK'),
}));

const mixedProduct = {
  id: 8,
  slug: 'mixed-bundle',
  name: 'Mixed Bundle',
  shortDescription: 'PDF guide with a shipped product.',
  description: 'PDF guide with a shipped product.',
  productType: 'mixed',
  fulfillmentType: 'physical_preorder',
  price: '12,99 €',
  amount: 1299,
  currency: 'eur',
  shippingAmount: 150,
  shippingNote: 'Doprava CZ/SK + 1,50 €',
  deliveryNote: 'PDF na email + fyzický produkt cez Packetu.',
  image: '/bundle.jpg',
  heroImage: '/bundle.jpg',
  maxQuantity: 1,
  languages: ['sk'],
  colorVariants: [{
    code: 'bundle',
    name: 'Bundle',
    available: 1,
    amount: 1299,
    price: '12,99 €',
    isActive: true,
    image: '/bundle-variant.jpg',
  }],
};

const renderProductDetail = (product = mixedProduct) =>
  render(
    <CartProvider>
      <MemoryRouter>
        <ProductDetailView
          product={product}
          relatedProducts={[]}
          countryCodeOverride="SK"
        />
      </MemoryRouter>
    </CartProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ProductDetailView', () => {
  it('routes mixed bundle buy-now through one-item cart checkout', async () => {
    vi.mocked(createCartCheckoutSession).mockImplementation(() => new Promise(() => {}));
    renderProductDetail();

    await userEvent.type(screen.getByPlaceholderText(/zľavový kód/i), 'mix10');
    await userEvent.click(screen.getAllByRole('button', { name: /predobjednať za/i })[0]);

    await waitFor(() => {
      expect(createCartCheckoutSession).toHaveBeenCalledWith([
        {
          productSlug: 'mixed-bundle',
          variantCode: 'bundle',
          quantity: 1,
        },
      ], {
        couponCode: 'MIX10',
      });
    });
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });
});
