import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMembershipPreviewAccess } from './api/client';
import App from './App';

vi.mock('./api/client', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    loadMembershipPreviewAccess: vi.fn(),
  };
});

vi.mock('./pages/Membership', () => ({
  default: ({ loginOnly = false }) => (
    <h1>{loginOnly ? 'Len prihlásenie do klubu' : 'Skutočný prehľad klubu'}</h1>
  ),
}));

vi.mock('./pages/MembershipPost', () => ({
  default: () => <h1>Skutočný detail príspevku</h1>,
}));

const renderRoute = (path) => {
  window.history.replaceState({}, '', path);
  return render(<App />);
};

describe('private club preview routes', () => {
  beforeEach(() => {
    vi.mocked(loadMembershipPreviewAccess).mockReset();
  });

  it('renders the real club index on an allowed network', async () => {
    vi.mocked(loadMembershipPreviewAccess).mockResolvedValue(true);

    renderRoute('/klub');

    expect(await screen.findByRole('heading', { name: /skutočný prehľad klubu/i })).toBeInTheDocument();
  });

  it('renders the real post route on an allowed network', async () => {
    vi.mocked(loadMembershipPreviewAccess).mockResolvedValue(true);

    renderRoute('/klub/testovaci-prispevok');

    expect(await screen.findByRole('heading', { name: /skutočný detail príspevku/i })).toBeInTheDocument();
  });

  it('keeps a direct post URL on the construction page when denied', async () => {
    vi.mocked(loadMembershipPreviewAccess).mockResolvedValue(false);

    renderRoute('/klub/testovaci-prispevok');

    expect(await screen.findByRole('heading', { name: /klub pre vás práve pripravujeme/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /skutočný detail príspevku/i })).not.toBeInTheDocument();
  });

  it('keeps the explicit login path reachable without the preview allowlist', async () => {
    renderRoute('/klub/prihlasenie');

    expect(await screen.findByRole('heading', { name: /len prihlásenie do klubu/i })).toBeInTheDocument();
    expect(loadMembershipPreviewAccess).not.toHaveBeenCalled();
  });
});
