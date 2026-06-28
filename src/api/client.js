import {
    clearStoredWelcomeDiscountOffer,
    getStoredWelcomeDiscountToken,
} from '../utils/welcomeDiscount';
import { getCheckoutAttribution } from '../utils/attribution';

// No runtime app-config.js dependency.
// - Dev default: relative "/api" so Vite proxy avoids browser CORS.
// - Production default: hardcoded backend URL.
// - Production override: VITE_API_BASE_URL.
// - Dev override is intentionally opt-in to avoid stale shell env breaking local work.
const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const useDevApiOverride = import.meta.env.VITE_USE_API_BASE_URL_IN_DEV === 'true';
const baseUrl = import.meta.env.DEV
    ? (useDevApiOverride ? envBaseUrl : '')
    : (envBaseUrl || 'https://zajky.zentrobot.io');

export const apiUrl = (path) => {
    if (!path.startsWith('/')) path = `/${path}`;
    if (!baseUrl) return path;
    return `${baseUrl}${path}`;
};

export const apiFetch = async (path, options = {}) => {
    const res = await fetch(apiUrl(path), {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        credentials: 'include',
    });

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        const err = new Error(data?.error || `http_${res.status}`);
        err.status = res.status;
        err.data = data;
        err.url = apiUrl(path);
        err.bodyText = text;
        throw err;
    }

    return data;
};

export const createCheckoutSession = async (productSlug, options = {}) => {
    const explicitDiscountToken = options.discountToken;
    const storedDiscountToken =
        explicitDiscountToken || options.disableStoredDiscount
            ? ''
            : getStoredWelcomeDiscountToken();
    const discountToken = explicitDiscountToken || storedDiscountToken;
    const attribution = options.attribution || getCheckoutAttribution();
    const requestCheckoutSession = (token) => apiFetch('/api/stripe/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
            productSlug,
            ...(options.variantCode ? { variantCode: options.variantCode } : {}),
            ...(options.quantity ? { quantity: options.quantity } : {}),
            ...(options.couponCode ? { couponCode: options.couponCode } : {}),
            ...(token ? { discountToken: token } : {}),
            attribution,
        }),
    });

    let data;
    try {
        data = await requestCheckoutSession(discountToken);
    } catch (err) {
        if (
            storedDiscountToken &&
            err?.data?.error?.startsWith?.('welcome_discount_')
        ) {
            clearStoredWelcomeDiscountOffer();
            data = await requestCheckoutSession('');
        } else {
            throw err;
        }
    }

    if (!data?.checkoutUrl) {
        throw new Error('missing_checkout_url');
    }

    return data;
};

export const createCartCheckoutSession = async (items, options = {}) => {
    const attribution = options.attribution || getCheckoutAttribution();
    const data = await apiFetch('/api/stripe/cart-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
            items,
            ...(options.couponCode ? { couponCode: options.couponCode } : {}),
            attribution,
        }),
    });

    if (!data?.checkoutUrl) {
        throw new Error('missing_checkout_url');
    }

    return data;
};

export const signupForWelcomeDiscount = async ({ email, consentAccepted, source }) => {
    return apiFetch('/api/newsletter/discount-signup', {
        method: 'POST',
        body: JSON.stringify({ email, consentAccepted, source }),
    });
};

export const loadProducts = async () => {
    const data = await apiFetch('/api/products');
    return data?.products || [];
};

export const loadProduct = async (slug) => {
    const data = await apiFetch(`/api/products/${encodeURIComponent(slug)}`);
    return data?.product || null;
};

export const loadVisitorCountry = async () => {
    const data = await apiFetch('/api/geo');
    return data?.countryCode || '';
};

const uploadProductAsset = async ({ productId, endpoint, file, fields = {} }) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(fields).forEach(([key, value]) => {
        if (value != null && value !== '') formData.append(key, value);
    });

    const res = await fetch(apiUrl(`/api/products/admin/${productId}/assets/${endpoint}`), {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        const err = new Error(data?.error || `http_${res.status}`);
        err.status = res.status;
        err.data = data;
        err.url = apiUrl(`/api/products/admin/${productId}/assets/${endpoint}`);
        err.bodyText = text;
        throw err;
    }

    return data;
};

export const loadProductAssets = async (productId) => {
    const data = await apiFetch(`/api/products/admin/${productId}/assets`);
    return data?.assets || [];
};

export const deleteProductAsset = async (productId, assetId) => {
    return apiFetch(`/api/products/admin/${productId}/assets/${assetId}`, {
        method: 'DELETE',
    });
};

export const deleteProductImageAsset = deleteProductAsset;
export const deleteProductPdfAsset = deleteProductAsset;

export const uploadProductImage = async (productId, file, role = 'asset') => {
    const data = await uploadProductAsset({
        productId,
        endpoint: 'image',
        file,
        fields: { role },
    });

    return data?.asset || null;
};

export const uploadProductPdf = async (productId, file, { languageCode, customerFilename } = {}) => {
    const data = await uploadProductAsset({
        productId,
        endpoint: 'pdf',
        file,
        fields: {
            languageCode,
            customerFilename,
        },
    });

    return data;
};

const parseFaqContent = (faqContent) => {
    if (!faqContent) return [];
    try {
        const parsed = JSON.parse(faqContent);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const mapPostFromApi = (p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt || '',
    content: p.contentMd || '',
    categoryId: p.categoryId ?? null,
    category: p.category || '',
    image: p.imageUrl || '',
    author: p.author || '',
    date: p.date || '',
    hasFaq: Boolean(p.hasFaq),
    faqItems: parseFaqContent(p.faqContent),
});
