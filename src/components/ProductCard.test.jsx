import { readFileSync } from 'node:fs';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { CartProvider } from '../cart/CartContext';
import { CART_STORAGE_KEY } from '../cart/cartState';
import ProductCard from './ProductCard';

const renderCard = (product) =>
  render(
    <CartProvider>
      <MemoryRouter>
        <ProductCard product={product} />
      </MemoryRouter>
    </CartProvider>
  );

beforeEach(() => {
  window.localStorage.clear();
});

describe('ProductCard', () => {
  it('keeps card navigation underlay active while purchase links receive pointer input', () => {
    const stylesheet = readFileSync('src/styles/products.css', 'utf8');
    expect(stylesheet).toMatch(/\.product-card__content\s*\{[^}]*z-index:\s*3;[^}]*pointer-events:\s*none;/);
    expect(stylesheet).toMatch(/\.product-card__content a,[\s\S]*?\.product-card__content button\s*\{\s*pointer-events:\s*auto;/);
  });

  it('adds digital products to the local cart', async () => {
    renderCard({
      id: 1,
      slug: 'digital-guide',
      name: 'Digital Guide',
      productType: 'digital',
      image: '/guide.jpg',
      price: '4,99 €',
    });

    await userEvent.click(screen.getByRole('button', { name: /pridať digital guide/i }));

    expect(screen.getByRole('button', { name: /pridať digital guide/i })).toHaveTextContent('Pridané');
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([
        expect.objectContaining({
          productSlug: 'digital-guide',
          quantity: 1,
        }),
      ]);
    });
  });

  it('labels free PDFs and links directly to the download without adding to cart', async () => {
    renderCard({
      id: 4,
      slug: 'free-guide',
      name: 'Free Guide',
      productType: 'digital',
      isFree: true,
      image: '/guide.jpg',
      price: '4,99 €',
    });

    expect(screen.getByText('PDF zdarma')).toBeInTheDocument();
    expect(screen.getByText('Zadarmo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /stiahnuť zdarma free guide/i })).toHaveAttribute(
      'href',
      '/api/products/free-guide/free-download'
    );
    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([]);
  });

  it('routes multi-file free PDF cards to the product detail choices', () => {
    renderCard({
      id: 5,
      slug: 'free-guide',
      name: 'Free Guide',
      productType: 'digital',
      isFree: true,
      freeDownloads: [
        { index: 0, label: 'Slovak PDF', filename: 'guide-sk.pdf', languageCode: 'sk' },
        { index: 1, label: 'Czech PDF', filename: 'guide-cz.pdf', languageCode: 'cs' },
      ],
      image: '/guide.jpg',
    });

    expect(screen.getByRole('link', { name: /vybrať pdf zdarma pre free guide/i })).toHaveAttribute(
      'href',
      '/product/free-guide'
    );
  });

  it('shows an unavailable state for free products whose PDF is missing', () => {
    renderCard({
      id: 6,
      slug: 'temporarily-unavailable',
      name: 'Free Guide',
      productType: 'digital',
      isFree: true,
      isMock: true,
      freeDownloads: [],
      purchaseLabel: 'Dočasne nedostupné',
      image: '/guide.jpg',
    });

    expect(screen.getByText('Dočasne nedostupné')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('link', { name: /stiahnuť zdarma/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /košík|kúpiť/i })).not.toBeInTheDocument();
  });

  it('routes physical cards to detail for variant selection', async () => {
    renderCard({
      id: 2,
      slug: 'physical-ball',
      name: 'Physical Ball',
      productType: 'physical',
      image: '/ball.jpg',
      price: '7,99 €',
    });

    await userEvent.click(screen.getByRole('button', { name: /vybrať farebnú kombináciu/i }));

    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([]);
  });

  it('routes mixed bundle cards to detail for variant selection', async () => {
    renderCard({
      id: 3,
      slug: 'mixed-bundle',
      name: 'Mixed Bundle',
      productType: 'mixed',
      fulfillmentType: 'physical_preorder',
      image: '/bundle.jpg',
      price: '12,99 €',
    });

    await userEvent.click(screen.getByRole('button', { name: /vybrať farebnú kombináciu/i }));

    expect(JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY)).items).toEqual([]);
  });
});
