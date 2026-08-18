const CONTRACT_VERSION = '2';
const ACTIVE_PREFIX = 'zajkologia_checkout_active_v2:';
const ATTEMPT_PREFIX = 'zajkologia_checkout_attempt_v2:';
const ACTIVE_TTL_MS = 45 * 60 * 1000;
const preparationLocks = new Map();

const getStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
  );
};

const requestFingerprint = async (kind, payload) => {
  if (!window.crypto?.subtle) throw new Error('checkout_crypto_unavailable');
  const encoded = new TextEncoder().encode(
    JSON.stringify(stableValue({ kind, payload }))
  );
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const randomToken = () => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
};

const readJson = (key) => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return JSON.parse(storage.getItem(key) || 'null');
  } catch {
    storage.removeItem(key);
    return null;
  }
};

const writeAttempt = (attempt) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(`${ATTEMPT_PREFIX}${attempt.id}`, JSON.stringify(attempt));
  storage.setItem(`${ACTIVE_PREFIX}${attempt.scope}`, JSON.stringify(attempt));
};

const prepareCheckoutAttemptUnlocked = async ({ kind, scope, payload }) => {
  const fingerprint = await requestFingerprint(kind, payload);
  const active = readJson(`${ACTIVE_PREFIX}${scope}`);
  if (
    active?.contractVersion === CONTRACT_VERSION &&
    active.fingerprint === fingerprint &&
    Date.now() - Number(active.createdAt || 0) < ACTIVE_TTL_MS
  ) {
    return { attempt: active, superseded: null };
  }

  const attempt = {
    id: window.crypto.randomUUID(),
    token: randomToken(),
    contractVersion: CONTRACT_VERSION,
    kind,
    scope,
    fingerprint,
    createdAt: Date.now(),
    createdOnServer: false,
  };
  writeAttempt(attempt);
  return {
    attempt,
    superseded: active?.createdOnServer ? active : null,
  };
};

export const prepareCheckoutAttempt = ({ kind, scope, payload }) => {
  const previous = preparationLocks.get(scope) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => prepareCheckoutAttemptUnlocked({ kind, scope, payload }));
  preparationLocks.set(scope, next);
  return next.finally(() => {
    if (preparationLocks.get(scope) === next) preparationLocks.delete(scope);
  });
};

export const markCheckoutAttemptCreated = (attempt) => {
  const next = { ...attempt, createdOnServer: true };
  writeAttempt(next);
  return next;
};

export const getCheckoutAttempt = (attemptId) =>
  readJson(`${ATTEMPT_PREFIX}${String(attemptId || '').trim().toLowerCase()}`);

export const clearCheckoutAttempt = (attemptId) => {
  const storage = getStorage();
  if (!storage) return;
  const attempt = getCheckoutAttempt(attemptId);
  storage.removeItem(`${ATTEMPT_PREFIX}${attemptId}`);
  if (attempt?.scope) {
    const active = readJson(`${ACTIVE_PREFIX}${attempt.scope}`);
    if (active?.id === attemptId) storage.removeItem(`${ACTIVE_PREFIX}${attempt.scope}`);
  }
};

export const checkoutAttemptFields = (attempt) => ({
  attemptId: attempt.id,
  attemptToken: attempt.token,
  checkoutContractVersion: attempt.contractVersion,
});
