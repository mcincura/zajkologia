import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadMembershipSession,
  verifyMembershipCode,
} from './client';
import {
  getMembershipSessionToken,
  storeMembershipSession,
} from '../utils/membershipAuth';

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify(body),
});

describe('membership API portable session', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('sends the stored bearer token when a third-party cookie is unavailable', async () => {
    storeMembershipSession({
      token: 'portable-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    fetch.mockResolvedValue(jsonResponse({ isAuthenticated: true, hasAccess: true }));

    await loadMembershipSession();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/membership/me'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer portable-token' }),
      })
    );
  });

  it('stores the server session returned after OTP verification', async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    fetch.mockResolvedValue(jsonResponse({
      isAuthenticated: true,
      hasAccess: true,
      memberSessionToken: 'fresh-token',
      memberSessionExpiresAt: expiresAt,
    }));

    await verifyMembershipCode({ email: 'stanka.cirmanova@gmail.com', code: '123456' });

    expect(getMembershipSessionToken()).toBe('fresh-token');
  });
});
