const MEMBERSHIP_SESSION_STORAGE_KEY = 'zajkologia.membership-session.v1';

let memorySession = null;

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const clearMembershipSession = () => {
  memorySession = null;
  try {
    storage()?.removeItem(MEMBERSHIP_SESSION_STORAGE_KEY);
  } catch {
    // Private browsing and hardened browsers may make storage unavailable.
  }
};

export const storeMembershipSession = ({ token, expiresAt }) => {
  const normalizedToken = String(token || '').trim();
  const expiration = new Date(expiresAt || 0).getTime();
  if (!normalizedToken || !Number.isFinite(expiration) || expiration <= Date.now()) {
    clearMembershipSession();
    return false;
  }
  const nextSession = {
    token: normalizedToken,
    expiresAt: new Date(expiration).toISOString(),
  };
  // Keep the just-verified session usable during this page visit even when
  // Safari refuses persistent storage. Route changes do not reload the module.
  memorySession = nextSession;
  try {
    const target = storage();
    if (!target) return true;
    target.setItem(
      MEMBERSHIP_SESSION_STORAGE_KEY,
      JSON.stringify(nextSession)
    );
    return true;
  } catch {
    return true;
  }
};

export const getMembershipSessionToken = () => {
  try {
    const raw = storage()?.getItem(MEMBERSHIP_SESSION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const expiration = new Date(parsed?.expiresAt || 0).getTime();
      const token = String(parsed?.token || '').trim();
      if (token && Number.isFinite(expiration) && expiration > Date.now()) {
        memorySession = { token, expiresAt: new Date(expiration).toISOString() };
        return token;
      }
      storage()?.removeItem(MEMBERSHIP_SESSION_STORAGE_KEY);
    }
  } catch {
    // Fall through to the in-memory session created by the current OTP login.
  }

  const memoryExpiration = new Date(memorySession?.expiresAt || 0).getTime();
  const memoryToken = String(memorySession?.token || '').trim();
  if (memoryToken && Number.isFinite(memoryExpiration) && memoryExpiration > Date.now()) {
    return memoryToken;
  }
  memorySession = null;
  return '';
};
