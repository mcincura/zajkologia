import { readFileSync } from 'node:fs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCartCheckoutSession, createCheckoutSession, quoteCheckout } from '../api/client';
import { CartProvider } from '../cart/CartContext';
import { CART_STORAGE_KEY } from '../cart/cartState';
import { ProductDetailView } from './ProductDetails';

vi.mock('../api/client', () => ({
  apiUrl: (path) => path,
  createCartCheckoutSession: vi.fn(),
  createCheckoutSession: vi.fn(),
  quoteCheckout: vi.fn(),
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
  window.localStorage.clear();
});

describe('ProductDetailView', () => {
  it('keeps product coupon status and purchase controls inside the summary card', () => {
    const stylesheet = readFileSync('src/styles/product-details.css', 'utf8');

    expect(stylesheet).toMatch(
      /\.product-page__checkout-controls\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);[\s\S]*?min-width:\s*0;/
    );
    expect(stylesheet).toMatch(
      /\.product-page__checkout-controls > \.product-page__cta,[\s\S]*?\.product-page__checkout-controls > \.product-page__cart-button\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?white-space:\s*normal;/
    );
    expect(stylesheet).toMatch(
      /\.product-page__coupon-applied\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(0,\s*1fr\);[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*100%;/
    );
  });

  it('routes mixed bundle buy-now through one-item cart checkout', async () => {
    vi.mocked(createCartCheckoutSession).mockImplementation(() => new Promise(() => {}));
    vi.mocked(quoteCheckout).mockResolvedValue({
      currency: 'eur',
      subtotal: 1299,
      discountAmount: 130,
      total: 1319,
      normalizedCode: 'MIX10',
      coupon: { code: 'MIX10', name: 'Mix discount' },
      items: [{ discountAmount: 130, netAmount: 1169 }],
    });
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      version: 2,
      items: [],
      coupon: { code: 'MIX10', source: 'manual' },
    }));
    renderProductDetail();

    await waitFor(() => expect(quoteCheckout).toHaveBeenCalled());
    expect(await screen.findByText('MIX10')).toBeInTheDocument();
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

  it('offers a direct free PDF download without cart or checkout controls', () => {
    renderProductDetail({ ...mixedProduct, slug: 'free-guide', productType: 'digital', isFree: true, originalPrice: '9,99 €', saleDescription: 'Paid promo copy', deliveryNote: 'Po zaplatení PDF e-mailom.' });

    expect(screen.getAllByRole('link', { name: /stiahnuť pdf zdarma/i })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /stiahnuť pdf zdarma/i })[0]).toHaveAttribute(
      'href',
      '/api/products/free-guide/free-download'
    );
    expect(screen.getAllByText('Bez platby a registrácie. PDF si stiahnete ihneď.').length).toBeGreaterThan(0);
    expect(screen.getByText('Príručku si stiahnete priamo do zariadenia.')).toBeInTheDocument();
    expect(screen.queryByText('Paid promo copy')).not.toBeInTheDocument();
    expect(screen.queryByText('Po zaplatení PDF e-mailom.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /do košíka/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /kúpiť|predobjednať/i })).not.toBeInTheDocument();
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(createCartCheckoutSession).not.toHaveBeenCalled();
  });

  it('shows a direct download choice for each available language', () => {
    renderProductDetail({
      ...mixedProduct,
      slug: 'free-guide',
      productType: 'digital',
      isFree: true,
      freeDownloads: [
        { index: 0, label: 'Slovak PDF', filename: 'guide-sk.pdf', languageCode: 'sk' },
        { index: 1, label: 'Czech PDF', filename: 'guide-cz.pdf', languageCode: 'cs' },
      ],
    });

    const slovakLinks = screen.getAllByRole('link', { name: /stiahnuť pdf v slovenčine \(sk\)/i });
    const czechLinks = screen.getAllByRole('link', { name: /stiahnuť pdf v češtine \(cz\)/i });
    expect(slovakLinks).toHaveLength(2);
    expect(czechLinks).toHaveLength(2);
    expect(slovakLinks[0]).toHaveAttribute('href', '/api/products/free-guide/free-download?file=0');
    expect(czechLinks[0]).toHaveAttribute('href', '/api/products/free-guide/free-download?file=1');
  });

  it('shows an unavailable state for a free product preview with no files', () => {
    renderProductDetail({
      ...mixedProduct,
      slug: 'free-guide',
      productType: 'digital',
      isFree: true,
      isMock: true,
      freeDownloads: [],
      purchaseLabel: 'Dočasne nedostupné',
    });

    expect(screen.getAllByText('Dočasne nedostupné')).toHaveLength(2);
    expect(screen.queryByRole('link', { name: /stiahnuť pdf/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /košík|kúpiť|predobjednať/i })).not.toBeInTheDocument();
  });
});
