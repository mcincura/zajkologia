import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client';
import Admin from './Admin';

vi.mock('../api/client', () => ({ apiFetch: vi.fn(), apiUrl: (path) => path, mapPostFromApi: (post) => post }));

let orders;
let failCompletion;
const cardIds = () => screen.getAllByRole('article', { name: /^Objednávka/ }).map((card) => card.getAttribute('aria-label'));
const renderAdmin = () => render(<MemoryRouter><Admin section="orders" /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  failCompletion = false;
  orders = [
    { id: 'completed', createdAt: '2026-11-02T12:00:00Z', completedAt: '2026-11-02T12:01:00Z' },
    { id: 'older', createdAt: '2026-11-01T12:00:00Z', completedAt: null },
    { id: 'newest', createdAt: '2026-11-02T10:00:00Z', completedAt: null },
  ].map((order) => ({ ...order, productName: order.id, status: 'fulfilled', orderType: 'digital', amountTotal: 0 }));
  vi.mocked(apiFetch).mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { isAuthenticated: true, username: 'admin' };
    if (path === '/api/categories') return { categories: [] };
    if (path === '/api/posts') return { posts: [] };
    if (path.startsWith('/api/analytics/summary')) return { totals: {}, perDay: [] };
    if (path.startsWith('/api/orders/admin?')) {
      const filter = new URL(path, 'http://localhost').searchParams.get('filter');
      return { orders: orders.filter((order) => filter !== 'completed' || order.completedAt).map((order) => ({ ...order })) };
    }
    if (path.endsWith('/completion')) {
      if (failCompletion) throw new Error('save_failed');
      const id = path.split('/').at(-2);
      const order = orders.find((candidate) => candidate.id === id);
      order.completedAt = JSON.parse(options.body).completed ? '2026-11-02T13:00:00Z' : null;
      return { order: { ...order } };
    }
    return {};
  });
});

describe('admin processing state', () => {
  it('shows new orders newest first, with completed orders kept below them', async () => {
    renderAdmin();
    await screen.findByRole('article', { name: 'Objednávka newest' });
    expect(cardIds()).toEqual(['Objednávka newest', 'Objednávka older', 'Objednávka completed']);
    expect(within(screen.getByRole('article', { name: 'Objednávka newest' })).getByText('Nová objednávka')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Objednávka completed' })).getByText('Vybavená')).toBeInTheDocument();
  });

  it('marks and reopens an order, retaining all cards and refreshing its position', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const card = await screen.findByRole('article', { name: 'Objednávka newest' });
    await user.click(within(card).getByRole('button', { name: 'Označiť ako vybavenú' }));
    await screen.findByText('Objednávka bola označená ako vybavená.');
    expect(apiFetch).toHaveBeenCalledWith('/api/orders/admin/newest/completion', {
      method: 'PATCH', body: JSON.stringify({ completed: true }),
    });
    expect(cardIds()).toEqual(['Objednávka older', 'Objednávka completed', 'Objednávka newest']);
    expect(within(card).getByText('Vybavená')).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Označiť ako novú' }));
    await screen.findByText('Objednávka je opäť označená ako nová.');
    expect(cardIds()).toEqual(['Objednávka newest', 'Objednávka older', 'Objednávka completed']);
  });

  it('keeps the original state if saving fails', async () => {
    failCompletion = true;
    const user = userEvent.setup();
    renderAdmin();
    const card = await screen.findByRole('article', { name: 'Objednávka newest' });
    await user.click(within(card).getByRole('button', { name: 'Označiť ako vybavenú' }));
    expect(await screen.findByText('Stav objednávky sa nepodarilo uložiť. Skúste to znova.')).toBeInTheDocument();
    await waitFor(() => expect(within(card).getByRole('button', { name: 'Označiť ako vybavenú' })).toBeEnabled());
    expect(cardIds()[0]).toBe('Objednávka newest');
  });

  it('provides a separate completed-order view', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await screen.findByRole('article', { name: 'Objednávka newest' });
    await user.selectOptions(screen.getByRole('combobox', { name: /Filter/ }), 'completed');
    await waitFor(() => expect(cardIds()).toEqual(['Objednávka completed']));
    expect(screen.getByText('Vybavená')).toBeInTheDocument();
  });
});
