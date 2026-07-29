import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createMembershipCheckout,
  loadMembershipContent,
  loadMembershipOffer,
  loadMembershipSession,
  requestMembershipCode,
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
    unitAmount: 990,
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
    expect(screen.getByText('9,90 €')).toBeInTheDocument();

    const loginEmail = screen.getByLabelText(/Členský e-mail/i);
    await user.type(loginEmail, 'member@example.com');
    await user.click(screen.getByRole('button', { name: /Poslať kód/i }));

    expect(requestMembershipCode).toHaveBeenCalledWith('member@example.com');
    expect(await screen.findByLabelText(/6-miestny kód/i)).toBeInTheDocument();
  });

  it('requires email verification before starting a new checkout', async () => {
    const user = userEvent.setup();
    vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: false });
    vi.mocked(createMembershipCheckout).mockRejectedValue({
      data: { error: 'membership_login_required' },
    });
    vi.mocked(requestMembershipCode).mockResolvedValue({ ok: true });

    renderPage();

    const signupEmail = await screen.findByLabelText(/E-mail pre členstvo/i);
    await user.type(signupEmail, 'new-member@example.com');
    await user.click(screen.getByRole('button', { name: /Stať sa členom/i }));

    expect(requestMembershipCode).toHaveBeenCalledWith('new-member@example.com');
    expect(await screen.findByLabelText(/6-miestny kód/i)).toBeInTheDocument();
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
