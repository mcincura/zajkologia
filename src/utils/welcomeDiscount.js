export const WELCOME_DISCOUNT_STORAGE_KEY = 'zajkologia.welcomeDiscountCode';
export const WELCOME_DISCOUNT_TOKEN_STORAGE_KEY = 'zajkologia.welcomeDiscountToken';
export const WELCOME_DISCOUNT_OFFER_CHANGED_EVENT = 'zajkologia:welcome-discount-offer-changed';

const notifyWelcomeDiscountOfferChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(WELCOME_DISCOUNT_OFFER_CHANGED_EVENT));
};

export const getStoredWelcomeDiscountCode = () => {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(WELCOME_DISCOUNT_STORAGE_KEY) || '';
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
  if (typeof window === 'undefined' || !discountCode || !discountToken) return;

  try {
    window.localStorage.setItem(WELCOME_DISCOUNT_STORAGE_KEY, discountCode);
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
