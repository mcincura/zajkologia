export const CLUB_PREVIEW_UNLOCK_STORAGE_KEY = 'zajkologia.club-preview-unlock.v1';
export const CLUB_PREVIEW_UNLOCK_TTL_MS = 24 * 60 * 60 * 1000;

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const parseExpiry = (value) => {
  try {
    const parsed = JSON.parse(value || '');
    return Number(parsed?.expiresAt) || 0;
  } catch {
    return 0;
  }
};

export const hasClubPreviewPresentationUnlock = (now = Date.now()) => {
  if (typeof window === 'undefined') return false;
  try {
    const target = storage();
    if (!target) return false;
    const expiresAt = parseExpiry(target.getItem(CLUB_PREVIEW_UNLOCK_STORAGE_KEY));
    if (expiresAt > now) return true;
    if (expiresAt) target.removeItem(CLUB_PREVIEW_UNLOCK_STORAGE_KEY);
    return false;
  } catch {
    // Safari can deny storage access even though the page itself is available.
    return false;
  }
};

// This flag unlocks only the pre-launch presentation screen. It is never sent
// to the API and must not be used as a membership or content entitlement.
export const unlockClubPreviewPresentation = (now = Date.now()) => {
  if (typeof window === 'undefined') return false;
  try {
    const target = storage();
    if (!target) return false;
    target.setItem(
      CLUB_PREVIEW_UNLOCK_STORAGE_KEY,
      JSON.stringify({ expiresAt: now + CLUB_PREVIEW_UNLOCK_TTL_MS }),
    );
    return true;
  } catch {
    // The current render can still be unlocked without persisting the flag.
    return false;
  }
};
