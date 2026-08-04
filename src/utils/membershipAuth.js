const MEMBERSHIP_SESSION_STORAGE_KEY = 'zajkologia.membership-session.v1';

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const clearMembershipSession = () => {
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
  try {
    const target = storage();
    if (!target) return false;
    target.setItem(
      MEMBERSHIP_SESSION_STORAGE_KEY,
      JSON.stringify({ token: normalizedToken, expiresAt: new Date(expiration).toISOString() })
    );
    return true;
  } catch {
    return false;
  }
};

export const getMembershipSessionToken = () => {
  try {
    const raw = storage()?.getItem(MEMBERSHIP_SESSION_STORAGE_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    const expiration = new Date(parsed?.expiresAt || 0).getTime();
    const token = String(parsed?.token || '').trim();
    if (!token || !Number.isFinite(expiration) || expiration <= Date.now()) {
      clearMembershipSession();
      return '';
    }
    return token;
  } catch {
    clearMembershipSession();
    return '';
  }
};
