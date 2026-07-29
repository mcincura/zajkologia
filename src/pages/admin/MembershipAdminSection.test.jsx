import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from '../../api/client';
import MembershipAdminSection from './MembershipAdminSection';

vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
  apiUrl: vi.fn((path) => path),
}));

const overviewResponse = {
  members: [],
  totals: { members: 0, active: 0, canceling: 0 },
  offer: {
    available: false,
    configured: true,
    salesEnabled: false,
    billingPortalConfigured: true,
    unitAmount: 499,
    currency: 'eur',
  },
  content: [
    {
      id: 1,
      title: 'Draft guide',
      description: 'Not visible to members yet.',
      contentType: 'pdf',
      filename: 'draft-guide.pdf',
      hasFile: true,
      isActive: false,
      sortOrder: 0,
      publishedAt: null,
    },
    {
      id: 2,
      title: 'Scheduled video',
      description: 'Next week.',
      contentType: 'video',
      externalUrl: 'https://example.com/video',
      hasFile: false,
      isActive: true,
      sortOrder: 1,
      publishedAt: '2099-08-05T10:00:00.000Z',
    },
  ],
};

describe('MembershipAdminSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiFetch).mockResolvedValue(overviewResponse);
  });

  it('shows sales-closed readiness and explicit content staging states', async () => {
    render(<MembershipAdminSection />);

    expect(await screen.findByText('Private staging')).toBeInTheDocument();
    expect(
      screen.getByText('4,99 € / month · Stripe Price ready · Billing Portal ready')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Draft')).toHaveLength(2);
    expect(screen.getByText(/Scheduled ·/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Member-facing preview' })).toBeInTheDocument();
  });

  it('opens an existing item for metadata editing', async () => {
    const user = userEvent.setup();
    render(<MembershipAdminSection />);

    await user.click(await screen.findByRole('button', { name: 'Edit Draft guide' }));

    expect(screen.getByRole('heading', { name: 'Edit member content' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Draft guide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Type *')).toBeDisabled();
  });
});
