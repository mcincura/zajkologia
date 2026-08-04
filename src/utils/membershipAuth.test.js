import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearMembershipSession,
  getMembershipSessionToken,
  storeMembershipSession,
} from './membershipAuth';

describe('portable membership browser session', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists a valid token across page loads', () => {
    expect(storeMembershipSession({
      token: 'member-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    })).toBe(true);
    expect(getMembershipSessionToken()).toBe('member-token');
  });

  it('removes expired or explicitly cleared sessions', () => {
    expect(storeMembershipSession({
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 1).toISOString(),
    })).toBe(false);
    expect(getMembershipSessionToken()).toBe('');

    storeMembershipSession({
      token: 'member-token',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    clearMembershipSession();
    expect(getMembershipSessionToken()).toBe('');
  });
});
