import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from './CartContext';
import Header from '../components/Header';
import CartPage from '../pages/CartPage';

vi.mock('../api/client', () => ({ quoteCheckout: vi.fn(), createCartCheckoutSession: vi.fn() }));
vi.mock('../hooks/useProducts', () => ({ useProducts: () => ({ products: [], loading: false }) }));

beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });

describe('cart entry navigation', () => {
  it.each(['/product/prirucka?lang=sk#popis', '/post/vyziva#seno', '/?category=Produkty'])('returns from the header cart to %s', async (entry) => {
    const user = userEvent.setup();
    render(
      <CartProvider><MemoryRouter initialEntries={[entry]}>
        <Header />
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="*" element={<h1>Pôvodná stránka</h1>} />
        </Routes>
      </MemoryRouter></CartProvider>
    );
    await user.click(screen.getByRole('link', { name: /Košík,/ }));
    expect(await screen.findByRole('heading', { name: 'Košík je prázdny' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Späť' })).toHaveAttribute('href', entry);
    await user.click(screen.getByRole('link', { name: 'Späť' }));
    expect(await screen.findByRole('heading', { name: 'Pôvodná stránka' })).toBeInTheDocument();
  });
});
