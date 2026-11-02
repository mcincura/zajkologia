const CART_RETURN_KEY = 'zajkologia.cart.returnTo.v1';
export const CART_FALLBACK = '/?category=Produkty';

export const safeCartReturnTo = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || /^\/(cart|checkout)(\/|$)/i.test(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

export const cartNavigationState = (location) => {
  const cartReturnTo = safeCartReturnTo(`${location.pathname}${location.search}${location.hash}`);
  return cartReturnTo ? { cartReturnTo } : undefined;
};

export const rememberCartReturnTo = (value) => {
  const path = safeCartReturnTo(value);
  if (!path) return;
  try {
    window.sessionStorage.setItem(CART_RETURN_KEY, path);
  } catch { /* Navigation still works when browser storage is unavailable. */ }
};

export const resolveCartReturnTo = (state) => {
  const explicit = safeCartReturnTo(state?.cartReturnTo);
  if (explicit) return explicit;
  try {
    const stored = safeCartReturnTo(window.sessionStorage.getItem(CART_RETURN_KEY));
    if (stored) return stored;
  } catch { /* Fall back to a same-site referrer or the product list. */ }
  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin === window.location.origin) {
      const path = safeCartReturnTo(`${referrer.pathname}${referrer.search}${referrer.hash}`);
      if (path) return path;
    }
  } catch { /* A direct visit has no usable referrer. */ }
  return CART_FALLBACK;
};
