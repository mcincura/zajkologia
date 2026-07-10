import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client';
import Admin from './Admin';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(),
  apiUrl: (path) => path,
  mapPostFromApi: (post) => post,
}));

const order = {
  id: 'order-1',
  productName: 'Košík',
  orderType: 'digital',
  status: 'fulfilled',
  fulfillmentStatus: 'pdf_sent',
  customerEmail: 'buyer@example.com',
  amountTotal: 499,
  currency: 'eur',
  refundedAmount: 0,
  refundStatus: 'none',
  paidAt: '2026-07-06T10:00:00.000Z',
  items: [{ id: 1, productName: 'Digital Journal', quantity: 1 }],
  refundRequests: [],
  auditEvents: [],
  digitalDelivery: {
    status: 'available',
    links: [
      {
        id: 10,
        filename: 'journal.pdf',
        status: 'available',
        downloadCount: 1,
        maxDownloads: null,
        expiresAt: '2026-08-06T10:00:00.000Z',
        emailSentAt: '2026-07-06T10:01:00.000Z',
        recentEvents: [{ id: 99, eventType: 'download_started', createdAt: '2026-07-06T10:05:00.000Z' }],
      },
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.mocked(apiFetch).mockImplementation(async (path) => {
    if (path === '/api/auth/me') return { isAuthenticated: true, username: 'admin' };
    if (path === '/api/categories') return { categories: [] };
    if (path === '/api/posts') return { posts: [] };
    if (String(path).startsWith('/api/analytics/summary')) {
      return { totals: { revenueMinor: 499, revenueCurrency: 'eur', paidOrders: 1 }, perDay: [] };
    }
    if (String(path).startsWith('/api/orders/admin?')) return { orders: [order] };
    if (path === '/api/orders/admin/order-1/digital-delivery/resend') {
      return { order: { ...order, digitalDelivery: { ...order.digitalDelivery, status: 'available' } } };
    }
    return {};
  });
});

describe('Admin digital delivery controls', () => {
  it('renders delivery status and calls resend endpoint', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Admin section="orders" />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Secure PDF delivery/i)).toBeInTheDocument();
    expect(screen.getByText(/journal.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Resend/i }));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/orders/admin/order-1/digital-delivery/resend',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
