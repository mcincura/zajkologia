const STORAGE_PREFIX = 'zajkologia:admin-product-preview:v1:';
const MAX_STORED_PREVIEWS = 8;
const MAX_PREVIEW_AGE_MS = 24 * 60 * 60 * 1000;

const normalizeCountryCode = (countryCode) => (countryCode === 'CZ' ? 'CZ' : 'SK');

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
};

const getPreviewKeys = (storage) => {
  const keys = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }

  return keys;
};

const pruneStoredPreviews = (storage) => {
  const now = Date.now();
  const entries = getPreviewKeys(storage).map((key) => {
    try {
      const payload = JSON.parse(storage.getItem(key) || '{}');
      return { key, createdAt: Number(payload.createdAt || 0) };
    } catch {
      return { key, createdAt: 0 };
    }
  });

  entries.forEach((entry) => {
    if (!entry.createdAt || now - entry.createdAt > MAX_PREVIEW_AGE_MS) {
      storage.removeItem(entry.key);
    }
  });

  entries
    .filter((entry) => entry.createdAt && now - entry.createdAt <= MAX_PREVIEW_AGE_MS)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(MAX_STORED_PREVIEWS)
    .forEach((entry) => storage.removeItem(entry.key));
};

export const saveAdminProductPreview = ({ product, countryCode, isDirty }) => {
  const storage = getStorage();
  if (!storage || !product) return null;

  const createdAt = Date.now();
  const previewKey = `${createdAt}-${product.id || product.slug || 'draft'}`;
  const payload = {
    schemaVersion: 1,
    createdAt,
    countryCode: normalizeCountryCode(countryCode),
    isDirty: Boolean(isDirty),
    product,
  };

  try {
    storage.setItem(`${STORAGE_PREFIX}${previewKey}`, JSON.stringify(payload));
    pruneStoredPreviews(storage);
    return previewKey;
  } catch {
    return null;
  }
};

export const loadAdminProductPreview = (previewKey) => {
  const storage = getStorage();
  if (!storage || !previewKey) return null;

  try {
    const rawPayload = storage.getItem(`${STORAGE_PREFIX}${previewKey}`);
    if (!rawPayload) return null;

    const payload = JSON.parse(rawPayload);
    if (payload?.schemaVersion !== 1 || !payload.product || typeof payload.product !== 'object') {
      return null;
    }

    if (!payload.createdAt || Date.now() - Number(payload.createdAt) > MAX_PREVIEW_AGE_MS) {
      storage.removeItem(`${STORAGE_PREFIX}${previewKey}`);
      return null;
    }

    return {
      product: payload.product,
      countryCode: normalizeCountryCode(payload.countryCode),
      isDirty: Boolean(payload.isDirty),
      createdAt: Number(payload.createdAt),
    };
  } catch {
    return null;
  }
};
