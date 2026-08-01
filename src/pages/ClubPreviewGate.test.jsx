import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadMembershipPreviewAccess } from '../api/client';
import ClubPreviewGate from './ClubPreviewGate';
import { CLUB_PREVIEW_UNLOCK_STORAGE_KEY } from '../utils/clubPreviewUnlock';

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
    window.localStorage.removeItem(CLUB_PREVIEW_UNLOCK_STORAGE_KEY);
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

  it('shows the real club when the backend authorizes a current member on an unlisted network', async () => {
    vi.mocked(loadMembershipPreviewAccess).mockResolvedValue(true);

    renderGate();

    expect(await screen.findByRole('heading', { name: /súkromný náhľad klubu/i })).toBeInTheDocument();
  });

  it('opens the dedicated login-only path without checking or exposing the club feed', () => {
    render(
      <MemoryRouter>
        <ClubPreviewGate loginOnly>
          <h1>Len prihlásenie</h1>
        </ClubPreviewGate>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Len prihlásenie' })).toBeInTheDocument();
    expect(loadMembershipPreviewAccess).not.toHaveBeenCalled();
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

  it('uses an existing local presentation unlock only for the login route after an API failure', async () => {
    window.localStorage.setItem(
      CLUB_PREVIEW_UNLOCK_STORAGE_KEY,
      JSON.stringify({ expiresAt: Date.now() + 60_000 }),
    );
    vi.mocked(loadMembershipPreviewAccess).mockRejectedValue(new Error('network_error'));

    render(
      <MemoryRouter initialEntries={['/klub']}>
        <Routes>
          <Route
            path="/klub"
            element={(
              <ClubPreviewGate>
                <h1>Súkromný náhľad klubu</h1>
              </ClubPreviewGate>
            )}
          />
          <Route path="/klub/prihlasenie" element={<h1>Len prihlásenie</h1>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Len prihlásenie' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /súkromný náhľad klubu/i })).not.toBeInTheDocument();
  });
});
