export const CART_STORAGE_KEY = 'zajkologia_cart_v1';

const getCartLineKey = ({ productSlug, variantCode = null }) =>
  `${productSlug}::${variantCode || ''}`;

const getProductType = (payload = {}) =>
  payload.productType || payload.product?.productType || (payload.variantCode ? 'physical' : 'digital');

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

export const loadCartStateFromStorage = (storage = typeof window !== 'undefined' ? window.localStorage : null) => {
  if (!storage) return { items: [] };

  try {
    const parsed = JSON.parse(storage.getItem(CART_STORAGE_KEY) || 'null');
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
    return {
      items: rawItems.map(sanitizeStoredItem).filter(Boolean),
    };
  } catch {
    return { items: [] };
  }
};

export const saveCartStateToStorage = (
  state,
  storage = typeof window !== 'undefined' ? window.localStorage : null
) => {
  if (!storage) return;
  storage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      items: (state.items || []).map(({ productSlug, variantCode, quantity, addedAt }) => ({
        productSlug,
        ...(variantCode ? { variantCode } : {}),
        quantity,
        addedAt,
      })),
    })
  );
};

const normalizeAddItemPayload = (payload = {}) => {
  const productSlug = String(payload.productSlug || payload.product?.slug || '').trim();
  if (!productSlug) return null;

  const productType = getProductType(payload);
  const variantCode = productType === 'physical'
    ? String(payload.variantCode || '').trim() || null
    : null;
  const requestedQuantity = Number.parseInt(String(payload.quantity || '1'), 10) || 1;
  const maxQuantity = getMaxQuantity(payload);
  const quantity = productType === 'digital'
    ? 1
    : Math.max(1, Math.min(maxQuantity, requestedQuantity));

  if (productType === 'physical' && !variantCode) return null;

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
              quantity: item.productType === 'digital'
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
                quantity: productType === 'digital' ? 1 : Math.min(maxQuantity, Math.max(1, quantity)),
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

    case 'clearCart':
      return { ...state, items: [] };

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
