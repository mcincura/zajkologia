import { PRODUCT_TYPE, hasPhysicalDelivery, hasDigitalDelivery } from '../utils/productTypes';

export const CART_STORAGE_KEY = 'zajkologia_cart_v2';
export const LEGACY_CART_STORAGE_KEY = 'zajkologia_cart_v1';
const LEGACY_WELCOME_CODE_KEY = 'zajkologia.welcomeDiscountCode';
const LEGACY_WELCOME_TOKEN_KEY = 'zajkologia.welcomeDiscountToken';

const getCartLineKey = ({ productSlug, variantCode = null }) =>
  `${productSlug}::${variantCode || ''}`;

const getProductType = (payload = {}) =>
  payload.productType || payload.product?.productType || (payload.variantCode ? PRODUCT_TYPE.PHYSICAL : PRODUCT_TYPE.DIGITAL);

const getMaxQuantity = (payload = {}) =>
  Math.max(1, Number(payload.maxQuantity || payload.product?.maxQuantity || 99));

const sanitizeStoredItem = (item) => {
  const productSlug = String(item?.productSlug || '').trim();
  if (!productSlug) return null;

  const variantCode = String(item?.variantCode || '').trim() || null;
  const quantity = Math.max(1, Number.parseInt(String(item?.quantity || '1'), 10) || 1);
  const addedAt = String(item?.addedAt || '').trim() || new Date().toISOString();

  return {
    productSlug,
    variantCode,
    quantity,
    addedAt,
  };
};

const sanitizeCoupon = (coupon) => {
  const code = String(coupon?.code || coupon?.couponCode || '').trim().toUpperCase().slice(0, 64);
  const claimToken = String(coupon?.claimToken || coupon?.discountToken || '').trim().slice(0, 256);
  if (!code && !claimToken) return null;
  return {
    code,
    ...(claimToken ? { claimToken } : {}),
    source: coupon?.source === 'welcome' || claimToken ? 'welcome' : 'manual',
    appliedAt: String(coupon?.appliedAt || '').trim() || new Date().toISOString(),
  };
};

const getLegacyWelcomeCoupon = (storage) => {
  const code = storage.getItem(LEGACY_WELCOME_CODE_KEY) || '';
  const claimToken = storage.getItem(LEGACY_WELCOME_TOKEN_KEY) || '';
  return sanitizeCoupon({ code, claimToken, source: 'welcome' });
};

export const loadCartStateFromStorage = (storage = typeof window !== 'undefined' ? window.localStorage : null) => {
  if (!storage) return { items: [], coupon: null };

  try {
    const currentState = storage.getItem(CART_STORAGE_KEY);
    const parsed = JSON.parse(currentState || storage.getItem(LEGACY_CART_STORAGE_KEY) || 'null');
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    return {
      items: rawItems.map(sanitizeStoredItem).filter(Boolean),
      // Import the old welcome keys only before v2 has been written. Once v2
      // exists, an explicit null means the customer removed or consumed it.
      coupon: sanitizeCoupon(parsed?.coupon) || (currentState ? null : getLegacyWelcomeCoupon(storage)),
    };
  } catch {
    return { items: [], coupon: null };
  }
};

export const saveCartStateToStorage = (
  state,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) => {
  if (!storage) return;
  try {
    storage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        items: (state.items || []).map(({ productSlug, variantCode, quantity, addedAt }) => ({
          productSlug,
          ...(variantCode ? { variantCode } : {}),
          quantity,
          addedAt,
        })),
        coupon: sanitizeCoupon(state.coupon),
      })
    );
    storage.removeItem(LEGACY_CART_STORAGE_KEY);
    storage.removeItem(LEGACY_WELCOME_CODE_KEY);
    storage.removeItem(LEGACY_WELCOME_TOKEN_KEY);
  } catch {
    // Storage can be disabled or full; the in-memory checkout state remains usable.
  }
};

const normalizeAddItemPayload = (payload = {}) => {
  const productSlug = String(payload.productSlug || payload.product?.slug || '').trim();
  if (!productSlug) return null;

  const productType = getProductType(payload);
  const product = { ...(payload.product || {}), productType };
  const needsVariant = hasPhysicalDelivery(product);
  const isDigitalOnly = hasDigitalDelivery(product) && !needsVariant;
  const variantCode = needsVariant
    ? String(payload.variantCode || '').trim() || null
    : null;
  const requestedQuantity = Number.parseInt(String(payload.quantity || '1'), 10) || 1;
  const maxQuantity = getMaxQuantity(payload);
  const quantity = isDigitalOnly
    ? 1
    : Math.max(1, Math.min(maxQuantity, requestedQuantity));

  if (needsVariant && !variantCode) return null;

  return {
    productSlug,
    variantCode,
    quantity,
    productType,
    maxQuantity,
  };
};

export const cartReducer = (state, action) => {
  switch (action.type) {
    case 'addItem': {
      const item = normalizeAddItemPayload(action.item);
      if (!item) return state;

      const key = getCartLineKey(item);
      const existing = state.items.find((candidate) => getCartLineKey(candidate) === key);
      const nextItems = existing
        ? state.items.map((candidate) => {
            if (getCartLineKey(candidate) !== key) return candidate;
            return {
              ...candidate,
              quantity: hasDigitalDelivery(item) && !hasPhysicalDelivery(item)
                ? 1
                : Math.min(item.maxQuantity, Number(candidate.quantity || 1) + item.quantity),
            };
          })
        : [
            ...state.items,
            {
              productSlug: item.productSlug,
              ...(item.variantCode ? { variantCode: item.variantCode } : {}),
              quantity: item.quantity,
              addedAt: new Date().toISOString(),
            },
          ];

      return { ...state, items: nextItems };
    }

    case 'removeItem': {
      const key = getCartLineKey(action.item || {});
      return {
        ...state,
        items: state.items.filter((item) => getCartLineKey(item) !== key),
      };
    }

    case 'updateQuantity': {
      const key = getCartLineKey(action.item || {});
      const quantity = Number.parseInt(String(action.quantity || '0'), 10) || 0;
      const maxQuantity = getMaxQuantity(action.item);
      const productType = getProductType(action.item);

      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => getCartLineKey(item) !== key),
        };
      }

      return {
        ...state,
        items: state.items.map((item) =>
          getCartLineKey(item) === key
            ? {
                ...item,
                quantity: hasDigitalDelivery({ productType }) && !hasPhysicalDelivery({ productType })
                  ? 1
                  : Math.min(maxQuantity, Math.max(1, quantity)),
              }
            : item
        ),
      };
    }

    case 'replaceCart':
      return {
        ...state,
        items: (Array.isArray(action.items) ? action.items : []).map(sanitizeStoredItem).filter(Boolean),
      };

    case 'applyCoupon':
      return {
        ...state,
        coupon: sanitizeCoupon(action.coupon),
      };

    case 'removeCoupon':
      return {
        ...state,
        coupon: null,
      };

    case 'clearCart':
      return { ...state, items: [] };

    case 'clearCheckout':
      return { ...state, items: [], coupon: null };

    default:
      return state;
  }
};

export const getCartItemCount = (items = []) =>
  items.reduce((total, item) => total + Number(item.quantity || 0), 0);

export const getPhysicalCartItemCount = (items = []) =>
  items
    .filter((item) => item.variantCode)
    .reduce((total, item) => total + Number(item.quantity || 0), 0);
