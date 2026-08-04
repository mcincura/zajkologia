import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearMembershipSession,
  getMembershipSessionToken,
  storeMembershipSession,
} from './membershipAuth';

describe('portable membership browser session', () => {
  beforeEach(() => {
    clearMembershipSession();
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

  it('keeps the verified token for the current visit when Safari rejects storage access', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError');
    });

    try {
      expect(storeMembershipSession({
        token: 'iphone-token',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })).toBe(true);
      expect(getMembershipSessionToken()).toBe('iphone-token');
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});
