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
