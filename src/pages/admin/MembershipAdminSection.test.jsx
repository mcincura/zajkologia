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
    unitAmount: 299,
    currency: 'eur',
  },
  content: [],
};

const draftPost = {
  id: 1,
  title: 'Draft guide',
  slug: 'draft-guide',
  excerpt: 'Not visible to members yet.',
  bodyMd: '# Draft guide',
  status: 'draft',
  isPinned: false,
  allowComments: true,
  publishedAt: null,
  scheduledFor: null,
  updatedAt: '2026-07-31T10:00:00.000Z',
  categories: [],
  assets: [],
  coverAssetId: null,
  commentCount: 0,
};

const installApiResponses = (overview = overviewResponse) => {
  vi.mocked(apiFetch).mockImplementation(async (path) => {
    if (path === '/api/membership/admin/overview') return overview;
    if (path === '/api/membership/admin/posts') {
      return { posts: [draftPost], categories: [] };
    }
    if (path === '/api/membership/admin/comments') return { comments: [] };
    if (path === '/api/membership/admin/analytics') return { posts: [] };
    throw new Error(`Unexpected API request: ${path}`);
  });
};

describe('MembershipAdminSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installApiResponses();
  });

  it('shows the sales-closed creator studio and draft publishing state', async () => {
    render(<MembershipAdminSection />);

    expect(await screen.findByText('Súkromná príprava')).toBeInTheDocument();
    expect(screen.getByText(/2,99/)).toBeInTheDocument();
    expect(screen.getByText('Koncept')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Nový príspevok' }).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Draft guide' })).toBeInTheDocument();
  });

  it('labels allowlisted QA access separately from paid Stripe access', async () => {
    const user = userEvent.setup();
    installApiResponses({
      ...overviewResponse,
      offer: {
        ...overviewResponse.offer,
        testAccessEnabled: true,
      },
      members: [
        {
          id: 7,
          email: 'mar.cincura@gmail.com',
          hasAccess: true,
          testAccess: true,
          subscription: null,
        },
      ],
      totals: { members: 1, active: 1, canceling: 0 },
    });

    render(<MembershipAdminSection />);

    expect(
      await screen.findByText('Platba je vypnutá · testovací prístup je aktívny')
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Členovia' }));

    expect(screen.getByText('mar.cincura@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('QA tester')).toBeInTheDocument();
    expect(screen.getByText('testovací')).toBeInTheDocument();
  });

  it('labels permanent complimentary access separately from Stripe', async () => {
    const user = userEvent.setup();
    installApiResponses({
      ...overviewResponse,
      members: [
        {
          id: 8,
          email: 'stanka.cirmanova@gmail.com',
          hasAccess: true,
          complimentaryAccess: true,
          testAccess: false,
          subscription: null,
        },
      ],
      totals: { members: 1, active: 1, canceling: 0 },
    });

    render(<MembershipAdminSection />);
    await user.click(await screen.findByRole('button', { name: 'Členovia' }));

    expect(screen.getByText('stanka.cirmanova@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Bezplatný člen')).toBeInTheDocument();
    expect(screen.getByText('trvalý')).toBeInTheDocument();
  });

  it('opens an existing post in the creator editor', async () => {
    const user = userEvent.setup();
    render(<MembershipAdminSection />);

    await user.click(await screen.findByRole('button', { name: 'Upraviť' }));

    expect(screen.getByRole('heading', { name: 'Upraviť príspevok' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Draft guide')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uložiť koncept' })).toBeInTheDocument();
  });
});
