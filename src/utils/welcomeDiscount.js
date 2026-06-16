export const WELCOME_DISCOUNT_STORAGE_KEY = 'zajkologia.welcomeDiscountCode';
export const WELCOME_DISCOUNT_TOKEN_STORAGE_KEY = 'zajkologia.welcomeDiscountToken';
export const WELCOME_DISCOUNT_OFFER_CHANGED_EVENT = 'zajkologia:welcome-discount-offer-changed';
export const WELCOME_DISCOUNT_CODE = 'ZAJKOLOGIA25';

const LEGACY_WELCOME_DISCOUNT_CODES = new Set(['ZAJKOLOGIA30']);

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
    notifyWelcomeDiscountOfferChanged();
  } catch {
    // The discount is still shown in the current UI even if storage is unavailable.
  }
};

export const clearStoredWelcomeDiscountOffer = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(WELCOME_DISCOUNT_STORAGE_KEY);
    window.localStorage.removeItem(WELCOME_DISCOUNT_TOKEN_STORAGE_KEY);
    notifyWelcomeDiscountOfferChanged();
  } catch {
    // Ignore storage failures; the server remains the source of truth.
  }
};
