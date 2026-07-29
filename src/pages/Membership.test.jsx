import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMembershipCheckout,
  loadMembershipContent,
  loadMembershipOffer,
  loadMembershipSession,
  requestMembershipCode,
  verifyMembershipCode,
} from '../api/client';
import Membership from './Membership';

vi.mock('../api/client', () => ({
  createMembershipBillingPortal: vi.fn(),
  createMembershipCheckout: vi.fn(),
  downloadMembershipFile: vi.fn(),
  loadMembershipContent: vi.fn(),
  loadMembershipOffer: vi.fn(),
  loadMembershipSession: vi.fn(),
  logoutMembership: vi.fn(),
  requestMembershipCode: vi.fn(),
  verifyMembershipCode: vi.fn(),
}));

const renderPage = (route = '/klub') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Membership />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadMembershipOffer).mockResolvedValue({
    available: true,
    unitAmount: 500,
    currency: 'eur',
    interval: 'month',
  });
});

describe('Membership', () => {
  it('shows the offer and requests a passwordless login code', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });

    renderPage();

    expect(await screen.findByRole('heading', { name: /Istota v starostlivosti/i })).toBeInTheDocument();
    expect(screen.getByText('5,00 €')).toBeInTheDocument();

    const loginEmail = screen.getByLabelText(/Členský e-mail/i);
    await user.type(loginEmail, 'member@example.com');
    await user.click(screen.getByRole('button', { name: /Poslať kód/i }));

    expect(requestMembershipCode).toHaveBeenCalledWith('member@example.com');
    expect(await screen.findByLabelText(/6-miestny kód/i)).toBeInTheDocument();
  });

  it('starts the purchase with email verification before Stripe', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });

    renderPage();

    const signupEmail = await screen.findByLabelText(/E-mail pre členstvo/i);
    await user.type(signupEmail, 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: /Pokračovať k platbe/i }));

    expect(requestMembershipCode).toHaveBeenCalledWith('new-member@example.com');
    expect(createMembershipCheckout).not.toHaveBeenCalled();
    expect(await screen.findByLabelText(/6-miestny kód/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Overiť a prejsť k platbe/i })).toBeInTheDocument();
  });

  it('continues directly to checkout after the purchase code is verified', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });
    vi.mocked(verifyMembershipCode).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 8, email: 'new-member@example.com' },
    });
    vi.mocked(createMembershipCheckout).mockRejectedValue({
      data: { error: 'membership_checkout_unavailable' },
    });

    renderPage();

    await user.type(await screen.findByLabelText(/E-mail pre členstvo/i), 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: /Pokračovať k platbe/i }));
    await user.type(screen.getByLabelText(/Členský e-mail/i), 'existing-member@example.com');
    await user.type(await screen.findByLabelText(/6-miestny kód/i), '123456');
    await user.click(screen.getByRole('button', { name: /Overiť a prejsť k platbe/i }));

    expect(verifyMembershipCode).toHaveBeenCalledWith({
      email: 'new-member@example.com',
      code: '123456',
    });
    expect(createMembershipCheckout).toHaveBeenCalledWith('new-member@example.com');
    expect(
      await screen.findByText(/Členstvo sa práve nedá objednať/i)
    ).toBeInTheDocument();
  });

  it('shows a non-duplicating confirmation state while Stripe access syncs', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: false,
      member: { id: 9, email: 'pending@example.com', hasStripeCustomer: true },
      subscription: null,
    });

    renderPage('/klub?checkout=success');

    expect(await screen.findByText(/Potvrdzujeme platbu/i)).toBeInTheDocument();
    expect(screen.getByText(/Túto stránku nemusíte obnovovať/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aktivovať členstvo/i })).not.toBeInTheDocument();
  });

  it('unlocks the portal when the Stripe confirmation poll grants access', async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(loadMembershipSession)
        .mockResolvedValueOnce({
          isAuthenticated: true,
          hasAccess: false,
          member: { id: 10, email: 'pending@example.com', hasStripeCustomer: true },
          subscription: null,
        })
        .mockResolvedValueOnce({
          isAuthenticated: true,
          hasAccess: true,
          member: { id: 10, email: 'pending@example.com', hasStripeCustomer: true },
          subscription: {
            status: 'active',
            grantsAccess: true,
            currentPeriodEnd: '2026-08-29T00:00:00.000Z',
          },
        });
      vi.mocked(loadMembershipContent).mockResolvedValue([
        {
          id: 11,
          title: 'Čerstvo odomknutý materiál',
          description: 'Obsah sprístupnený po potvrdení platby.',
          contentType: 'pdf',
          filename: 'odomknuty-material.pdf',
          hasFile: true,
        },
      ]);

      renderPage('/klub?checkout=success');

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(screen.getByText(/Potvrdzujeme platbu/i)).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1200);
      });

      expect(screen.getByText(/Členstvo je aktívne/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Čerstvo odomknutý materiál' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders protected member content for an active session', async () => {
    vi.mocked(loadMembershipSession).mockResolvedValue({
      isAuthenticated: true,
      hasAccess: true,
      member: { id: 7, email: 'member@example.com' },
      subscription: {
        status: 'active',
        grantsAccess: true,
        currentPeriodEnd: '2026-08-29T00:00:00.000Z',
      },
    });
    vi.mocked(loadMembershipContent).mockResolvedValue([
      {
        id: 4,
        title: 'Letná starostlivosť',
        description: 'Praktický členský materiál.',
        contentType: 'pdf',
        filename: 'letna-starostlivost.pdf',
        hasFile: true,
      },
    ]);

    renderPage();

    expect(await screen.findByText(/Členstvo je aktívne/i)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Letná starostlivosť' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stiahnuť/i })).toBeInTheDocument();
  });
});
