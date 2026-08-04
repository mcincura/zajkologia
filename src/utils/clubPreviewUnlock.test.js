import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CLUB_PREVIEW_UNLOCK_STORAGE_KEY,
  CLUB_PREVIEW_UNLOCK_TTL_MS,
  hasClubPreviewPresentationUnlock,
  unlockClubPreviewPresentation,
} from './clubPreviewUnlock';

describe('club preview presentation unlock', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('persists only a local, expiring presentation flag', () => {
    const now = 1_000;

    expect(unlockClubPreviewPresentation(now)).toBe(true);
    expect(hasClubPreviewPresentationUnlock(now + CLUB_PREVIEW_UNLOCK_TTL_MS - 1)).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(CLUB_PREVIEW_UNLOCK_STORAGE_KEY))).toEqual({
      expiresAt: now + CLUB_PREVIEW_UNLOCK_TTL_MS,
    });
  });

  it('expires and removes a stale local presentation flag', () => {
    unlockClubPreviewPresentation(1_000);

    expect(hasClubPreviewPresentationUnlock(1_000 + CLUB_PREVIEW_UNLOCK_TTL_MS)).toBe(false);
    expect(window.localStorage.getItem(CLUB_PREVIEW_UNLOCK_STORAGE_KEY)).toBeNull();
  });

  it('fails safely instead of crashing when Safari blocks storage reads', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError');
    });

    expect(hasClubPreviewPresentationUnlock()).toBe(false);
  });

  it('keeps the page usable when Safari blocks storage writes', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage is unavailable', 'SecurityError');
    });

    expect(unlockClubPreviewPresentation()).toBe(false);
  });
});
