export const WELCOME_DISCOUNT_STORAGE_KEY = 'zajkologia.welcomeDiscountCode';
export const WELCOME_DISCOUNT_TOKEN_STORAGE_KEY = 'zajkologia.welcomeDiscountToken';
export const EMAIL_CAPTURE_SUPPRESSED_STORAGE_KEY = 'zajkologia.emailCaptureSuppressed';
export const WELCOME_DISCOUNT_OFFER_CHANGED_EVENT = 'zajkologia:welcome-discount-offer-changed';
export const EMAIL_CAPTURE_VISIBILITY_CHANGED_EVENT = 'zajkologia:email-capture-visibility-changed';
export const WELCOME_DISCOUNT_CODE = 'ZAJKOLOGIA25';

const LEGACY_WELCOME_DISCOUNT_CODES = new Set(['ZAJKOLOGIA30']);
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export const normalizeWelcomeDiscountCode = (discountCode) => {
  const normalizedCode = String(discountCode || '').trim();
  if (LEGACY_WELCOME_DISCOUNT_CODES.has(normalizedCode.toUpperCase())) {
    return WELCOME_DISCOUNT_CODE;
  }

  return normalizedCode;
};

const notifyWelcomeDiscountOfferChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WELCOME_DISCOUNT_OFFER_CHANGED_EVENT));
};

const notifyEmailCaptureVisibilityChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EMAIL_CAPTURE_VISIBILITY_CHANGED_EVENT));
};

const setCookie = (name, value, maxAge = ONE_YEAR_SECONDS) => {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; path=/; SameSite=Lax`;
};

const expireCookie = (name) => {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
};

const getCookie = (name) => {
  if (typeof document === 'undefined' || !document.cookie) return '';

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  if (!cookie) return '';

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return cookie.slice(prefix.length);
  }
};

export const getStoredWelcomeDiscountCode = () => {
  if (typeof window === 'undefined') return '';

  try {
    const storedCode = window.localStorage.getItem(WELCOME_DISCOUNT_STORAGE_KEY) || '';
    const normalizedCode = normalizeWelcomeDiscountCode(storedCode);

    if (storedCode && storedCode !== normalizedCode) {
      window.localStorage.setItem(WELCOME_DISCOUNT_STORAGE_KEY, normalizedCode);
    }

    return normalizedCode;
  } catch {
    return '';
  }
};

export const getStoredWelcomeDiscountToken = () => {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(WELCOME_DISCOUNT_TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

export const getStoredWelcomeDiscountOffer = () => ({
  discountCode: getStoredWelcomeDiscountCode(),
  discountToken: getStoredWelcomeDiscountToken(),
});

export const storeWelcomeDiscountOffer = ({ discountCode, discountToken }) => {
  const normalizedCode = normalizeWelcomeDiscountCode(discountCode);
  if (typeof window === 'undefined' || !normalizedCode || !discountToken) return;

  try {
    window.localStorage.setItem(WELCOME_DISCOUNT_STORAGE_KEY, normalizedCode);
    window.localStorage.setItem(WELCOME_DISCOUNT_TOKEN_STORAGE_KEY, discountToken);
  } catch {
    // The discount is still shown in the current UI even if storage is unavailable.
  }

  suppressEmailCaptureOffers('discount_activated');
  notifyWelcomeDiscountOfferChanged();
};

export const clearStoredWelcomeDiscountOffer = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(WELCOME_DISCOUNT_STORAGE_KEY);
    window.localStorage.removeItem(WELCOME_DISCOUNT_TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the server remains the source of truth.
  }

  expireCookie(WELCOME_DISCOUNT_STORAGE_KEY);
  expireCookie(WELCOME_DISCOUNT_TOKEN_STORAGE_KEY);
  notifyWelcomeDiscountOfferChanged();
};

export const isEmailCaptureSuppressed = () => {
  if (typeof window === 'undefined') return false;

  try {
    const stored = window.localStorage.getItem(EMAIL_CAPTURE_SUPPRESSED_STORAGE_KEY);
    if (stored) return true;
  } catch {
    // Fall back to the cookie check below.
  }

  return getCookie(EMAIL_CAPTURE_SUPPRESSED_STORAGE_KEY) === 'true';
};

export const suppressEmailCaptureOffers = (reason = 'subscribed') => {
  if (typeof window === 'undefined') return;

  const value = JSON.stringify({
    reason,
    suppressedAt: new Date().toISOString(),
  });

  try {
    window.localStorage.setItem(EMAIL_CAPTURE_SUPPRESSED_STORAGE_KEY, value);
  } catch {
    // Cookie still suppresses the offer if local storage is unavailable.
  }

  setCookie(EMAIL_CAPTURE_SUPPRESSED_STORAGE_KEY, 'true');
  notifyEmailCaptureVisibilityChanged();
};

export const clearEmailCaptureSuppression = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(EMAIL_CAPTURE_SUPPRESSED_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }

  expireCookie(EMAIL_CAPTURE_SUPPRESSED_STORAGE_KEY);
  notifyEmailCaptureVisibilityChanged();
};
