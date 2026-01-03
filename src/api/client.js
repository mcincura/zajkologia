const runtimeBaseUrl =
    (typeof window !== 'undefined' && window.__APP_CONFIG__ && window.__APP_CONFIG__.API_BASE_URL) || '';

const baseUrl = (runtimeBaseUrl || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export const apiUrl = (path) => {
    if (!path.startsWith('/')) path = `/${path}`;
    if (!baseUrl) return path;
    return `${baseUrl}${path}`;
};

export const apiFetch = async (path, options = {}) => {
    if (!baseUrl && !import.meta.env.DEV) {
        const err = new Error('missing_api_base_url');
        err.hint =
            'Set window.__APP_CONFIG__.API_BASE_URL in /public/app-config.js or VITE_API_BASE_URL in .env (example: https://your-backend.com)';
        throw err;
    }

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
});
