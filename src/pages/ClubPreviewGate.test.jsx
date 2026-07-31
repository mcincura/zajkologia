import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMembershipPreviewAccess } from '../api/client';
import ClubPreviewGate from './ClubPreviewGate';

vi.mock('../api/client', () => ({
  loadMembershipPreviewAccess: vi.fn(),
}));

const renderGate = () => render(
  <MemoryRouter>
    <ClubPreviewGate>
      <h1>Súkromný náhľad klubu</h1>
    </ClubPreviewGate>
  </MemoryRouter>
);

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

describe('ClubPreviewGate', () => {
  beforeEach(() => {
    vi.mocked(loadMembershipPreviewAccess).mockReset();
  });

  it('fails closed while the network check is still loading', () => {
    vi.mocked(loadMembershipPreviewAccess).mockReturnValue(new Promise(() => {}));

    renderGate();

    expect(screen.getByRole('heading', { name: /klub pre vás práve pripravujeme/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /súkromný náhľad klubu/i })).not.toBeInTheDocument();
  });

  it('shows the real club only when the backend allows the visitor IP', async () => {
    vi.mocked(loadMembershipPreviewAccess).mockResolvedValue(true);

    renderGate();

    expect(await screen.findByRole('heading', { name: /súkromný náhľad klubu/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /klub pre vás práve pripravujeme/i })).not.toBeInTheDocument();
  });

  it('keeps showing the construction page after a denied response settles', async () => {
    const access = createDeferred();
    vi.mocked(loadMembershipPreviewAccess).mockReturnValue(access.promise);

    renderGate();

    await act(async () => {
      access.resolve(false);
      await access.promise;
    });

    expect(screen.getByRole('heading', { name: /klub pre vás práve pripravujeme/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /súkromný náhľad klubu/i })).not.toBeInTheDocument();
  });

  it('keeps showing the construction page after an API failure settles', async () => {
    const access = createDeferred();
    vi.mocked(loadMembershipPreviewAccess).mockReturnValue(access.promise);

    renderGate();

    await act(async () => {
      access.reject(new Error('network_error'));
      await access.promise.catch(() => {});
    });

    expect(screen.getByRole('heading', { name: /klub pre vás práve pripravujeme/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /súkromný náhľad klubu/i })).not.toBeInTheDocument();
  });
});
