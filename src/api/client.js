// No runtime app-config.js dependency.
// - Production default: hardcoded backend URL.
// - Dev default: relative "/api" (so Vite proxy can handle cookies + CORS).
// - Override anytime via VITE_API_BASE_URL.
const envBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const baseUrl = envBaseUrl || (import.meta.env.DEV ? '' : 'https://zajky.zentrobot.io');

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
