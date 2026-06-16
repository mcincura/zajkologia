import { getStoredWelcomeDiscountToken } from '../utils/welcomeDiscount';

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
    const discountToken = options.discountToken || getStoredWelcomeDiscountToken();
    const data = await apiFetch('/api/stripe/checkout-session', {
        method: 'POST',
        body: JSON.stringify({
            productSlug,
            ...(discountToken ? { discountToken } : {}),
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
