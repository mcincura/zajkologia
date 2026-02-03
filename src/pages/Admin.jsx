import React, { useEffect, useMemo, useState } from 'react';
import MarkdownContent from '../components/MarkdownContent';
import { apiFetch, mapPostFromApi } from '../api/client';

const slugify = (value) => {
    return (value || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

const formatToday = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const createEmptyPost = (defaultCategoryId) => ({
    id: null,
    slug: '',
    title: '',
    excerpt: '',
    categoryId: defaultCategoryId ?? null,
    category: '',
    author: 'Tím Zajkológia',
    date: formatToday(),
    image: '/zajo.png',
    content: '# Nadpis\n\nSem napíš obsah v Markdowne.\n',
    hasFaq: false,
    faqItems: [],
});

const Admin = () => {
    const [authLoading, setAuthLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');

    const [loginUsername, setLoginUsername] = useState('admin');
    const [loginPassword, setLoginPassword] = useState('');

    const [categories, setCategories] = useState([]);
    const [posts, setPosts] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const [status, setStatus] = useState('');
    const [busy, setBusy] = useState(false);

    const [analytics, setAnalytics] = useState(null);
    const [analyticsDays, setAnalyticsDays] = useState(30);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState('');

    const selectedPost = useMemo(() => posts.find(p => p.id === selectedId) || null, [posts, selectedId]);

    const loadAll = async () => {
        const [cats, ps] = await Promise.all([
            apiFetch('/api/categories'),
            apiFetch('/api/posts'),
        ]);

        setCategories(cats.categories || []);
        const mapped = (ps.posts || []).map(mapPostFromApi);
        setPosts(mapped);
        setSelectedId(mapped?.[0]?.id ?? null);
    };

    const loadAnalytics = async (daysOverride) => {
        const days = Number(daysOverride ?? analyticsDays) || 30;
        setAnalyticsLoading(true);
        setAnalyticsError('');
        try {
            const data = await apiFetch(`/api/analytics/summary?days=${days}`);
            setAnalytics(data);
        } catch (err) {
            setAnalytics(null);
            setAnalyticsError(`Analytics failed: ${err.message}`);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const resetAdminState = () => {
        setCategories([]);
        setPosts([]);
        setSelectedId(null);
    };

    const checkAuth = async ({ fallbackUsername } = {}) => {
        setAuthLoading(true);
        try {
            const me = await apiFetch('/api/auth/me');
            const authed = Boolean(me?.isAuthenticated);
            setIsAuthenticated(authed);
            setUsername(me?.username || fallbackUsername || '');
            if (authed) {
                await loadAll();
                await loadAnalytics();
            } else {
                resetAdminState();
            }
            return authed;
        } catch (err) {
            // Some backends skip /api/auth/me (it's optional in BACKEND_SPEC.md).
            // Fallback: try loading protected data; if it works, we are authenticated.
            if (err?.status === 404) {
                try {
                    await loadAll();
                    await loadAnalytics();
                    setIsAuthenticated(true);
                    setUsername(fallbackUsername || '');
                    return true;
                } catch {
                    setIsAuthenticated(false);
                    setUsername('');
                    resetAdminState();
                    return false;
                }
            } else {
                setIsAuthenticated(false);
                setUsername('');
                resetAdminState();
                return false;
            }
        } finally {
            setAuthLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        loadAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const updateSelected = (patch) => {
        if (!selectedPost) return;
        setPosts(prev => prev.map(p => (p.id === selectedPost.id ? { ...p, ...patch } : p)));
    };

    const onLogin = async (e) => {
        e.preventDefault();
        setBusy(true);
        setStatus('');
        try {
            await apiFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username: loginUsername, password: loginPassword }),
            });
            setLoginPassword('');

            const authed = await checkAuth({ fallbackUsername: loginUsername });
            if (!authed) {
                setStatus(
                    'Login returned ok, but the session is not active in the browser. ' +
                    'This usually means the session cookie was not stored/sent (CORS credentials, cookie SameSite/Secure, or different origin).'
                );
            } else {
                setStatus('');
            }
        } catch (err) {
            setStatus(`Login failed: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const onLogout = async () => {
        setBusy(true);
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } finally {
            setBusy(false);
            setIsAuthenticated(false);
            setUsername('');
            resetAdminState();
            setStatus('Logged out.');
        }
    };

    const createNewPost = () => {
        const post = createEmptyPost(categories?.[0]?.id ?? null);
        post.categoryId = categories?.[0]?.id ?? null;
        post.category = categories?.[0]?.name ?? '';
        // temporary negative id for UI selection
        post.id = -Date.now();
        setPosts(prev => [post, ...prev]);
        setSelectedId(post.id);
        setStatus('New post (not saved yet).');
    };

    const deleteSelected = async () => {
        if (!selectedPost) return;
        const ok = window.confirm(`Delete "${selectedPost.title || selectedPost.slug || selectedPost.id}"?`);
        if (!ok) return;

        // Not saved yet
        if (selectedPost.id < 0) {
            const remaining = posts.filter(p => p.id !== selectedPost.id);
            setPosts(remaining);
            setSelectedId(remaining?.[0]?.id ?? null);
            setStatus('Draft removed.');
            return;
        }

        setBusy(true);
        try {
            await apiFetch(`/api/posts/${selectedPost.id}`, { method: 'DELETE' });
            const remaining = posts.filter(p => p.id !== selectedPost.id);
            setPosts(remaining);
            setSelectedId(remaining?.[0]?.id ?? null);
            setStatus('Deleted.');
        } catch (err) {
            setStatus(`Delete failed: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    const saveSelected = async () => {
        if (!selectedPost) return;
        if (!selectedPost.title?.trim() || !selectedPost.slug?.trim() || !selectedPost.content?.trim()) {
            setStatus('Missing required fields: title, slug, content.');
            return;
        }

        const payload = {
            slug: selectedPost.slug,
            title: selectedPost.title,
            excerpt: selectedPost.excerpt || null,
            contentMd: selectedPost.content,
            imageUrl: selectedPost.image || null,
            author: selectedPost.author || null,
            categoryId: selectedPost.categoryId || null,
            publishedAt: selectedPost.date || null,
            hasFaq: selectedPost.hasFaq || false,
            faqContent: selectedPost.hasFaq && selectedPost.faqItems?.length > 0
                ? JSON.stringify(selectedPost.faqItems)
                : null,
        };

        setBusy(true);
        try {
            if (selectedPost.id < 0) {
                const created = await apiFetch('/api/posts', { method: 'POST', body: JSON.stringify(payload) });
                const mapped = mapPostFromApi(created.post);
                setPosts(prev => [mapped, ...prev.filter(p => p.id !== selectedPost.id)]);
                setSelectedId(mapped.id);
                setStatus('Created.');
            } else {
                const updated = await apiFetch(`/api/posts/${selectedPost.id}`, { method: 'PUT', body: JSON.stringify(payload) });
                const mapped = mapPostFromApi(updated.post);
                setPosts(prev => prev.map(p => (p.id === mapped.id ? mapped : p)));
                setStatus('Saved.');
            }
        } catch (err) {
            setStatus(`Save failed: ${err.message}`);
        } finally {
            setBusy(false);
        }
    };

    if (authLoading) {
        return <div className="container" style={{ padding: '2rem 0' }}>Loading…</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="container" style={{ maxWidth: 520, padding: '3rem 0' }}>
                <h1>Admin login</h1>
                <p style={{ color: '#666', marginBottom: '1rem' }}>This login is validated by the backend. No secrets are stored in the frontend.</p>

                <form onSubmit={onLogin} style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>Username</span>
                        <input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }} />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: '#666' }}>Password</span>
                        <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }} />
                    </label>

                    <button disabled={busy} style={{ background: 'var(--color-primary)', color: 'white', padding: '0.6rem 0.9rem', borderRadius: '8px', fontWeight: 800 }}>
                        {busy ? 'Logging in…' : 'Login'}
                    </button>

                    {status ? <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#444' }}>{status}</div> : null}
                </form>
            </div>
        );
    }

    return (
        <div className="container" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
            <aside style={{
                background: 'white',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                padding: '1rem',
                height: 'fit-content',
                position: 'sticky',
                top: '1rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <h2 style={{ marginBottom: 0 }}>Admin</h2>
                    <button onClick={onLogout} disabled={busy} style={{ background: 'var(--color-light)', color: 'var(--color-dark)', padding: '0.4rem 0.65rem', borderRadius: '8px', fontWeight: 800 }}>
                        Logout
                    </button>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Logged in as <b>{username}</b></div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                        onClick={createNewPost}
                        disabled={busy}
                        style={{ background: 'var(--color-primary)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 700 }}
                    >
                        New
                    </button>
                    <button
                        onClick={saveSelected}
                        disabled={busy || !selectedPost}
                        style={{ background: 'var(--color-dark)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 700 }}
                    >
                        Save
                    </button>
                </div>

                {status ? (
                    <div style={{ fontSize: '0.9rem', color: '#444', background: '#fafafa', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>
                        {status}
                    </div>
                ) : null}

                <div style={{
                    border: '1px solid #eee',
                    borderRadius: '10px',
                    padding: '0.75rem',
                    marginBottom: '1rem',
                    background: '#fafafa'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: 800 }}>Analytics</div>
                        <button
                            type="button"
                            onClick={() => loadAnalytics()}
                            disabled={analyticsLoading}
                            style={{ background: 'var(--color-dark)', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem' }}
                        >
                            {analyticsLoading ? '…' : 'Refresh'}
                        </button>
                    </div>
                    {analyticsError ? (
                        <div style={{ fontSize: '0.8rem', color: '#a40000', marginBottom: '0.5rem' }}>{analyticsError}</div>
                    ) : null}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>Views</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{analytics?.totals?.pageviews ?? '—'}</div>
                        </div>
                        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', color: '#666' }}>Uniques</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{analytics?.totals?.uniqueVisitors ?? '—'}</div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
                        Last {analyticsDays} days
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {posts.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => setSelectedId(p.id)}
                            style={{
                                textAlign: 'left',
                                padding: '0.6rem 0.75rem',
                                borderRadius: '8px',
                                background: p.id === selectedId ? 'var(--color-light)' : 'transparent',
                                color: 'var(--color-dark)',
                                border: '1px solid #eee'
                            }}
                        >
                            <div style={{ fontWeight: 800 }}>{p.title || '(Untitled)'}</div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>{p.slug || 'missing-slug'} • {p.category || '—'}</div>
                        </button>
                    ))}
                </div>
            </aside>

            <section style={{
                background: 'white',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow)',
                padding: '1rem'
            }}>
                <div style={{
                    border: '1px solid #eee',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: '#fafafa'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h3 style={{ margin: 0 }}>Analytics</h3>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>Last {analyticsDays} days</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <select
                                value={analyticsDays}
                                onChange={(e) => {
                                    const days = Number(e.target.value);
                                    setAnalyticsDays(days);
                                    loadAnalytics(days);
                                }}
                                style={{ padding: '0.35rem 0.5rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.85rem' }}
                            >
                                <option value={7}>7 days</option>
                                <option value={30}>30 days</option>
                                <option value={90}>90 days</option>
                                <option value={180}>180 days</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => loadAnalytics()}
                                disabled={analyticsLoading}
                                style={{ background: 'var(--color-dark)', color: 'white', padding: '0.35rem 0.6rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}
                            >
                                {analyticsLoading ? 'Refreshing…' : 'Refresh'}
                            </button>
                        </div>
                    </div>

                    {analyticsError ? (
                        <div style={{ fontSize: '0.9rem', color: '#a40000' }}>{analyticsError}</div>
                    ) : null}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>Pageviews</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{analytics?.totals?.pageviews ?? '—'}</div>
                        </div>
                        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>Unique visitors</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{analytics?.totals?.uniqueVisitors ?? '—'}</div>
                        </div>
                        <div style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem' }}>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>Days tracked</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{analytics?.rangeDays ?? analyticsDays}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.35rem' }}>Pageviews by day</div>
                            <div style={{ border: '1px solid #eee', borderRadius: '8px', background: 'white', padding: '0.5rem', maxHeight: '220px', overflow: 'auto' }}>
                                {(analytics?.perDay || []).length === 0 ? (
                                    <div style={{ fontSize: '0.85rem', color: '#888' }}>No data.</div>
                                ) : (
                                    (analytics?.perDay || []).map((row) => (
                                        <div key={row.date} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '0.5rem', padding: '0.35rem 0', borderBottom: '1px dashed #f0f0f0' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#555' }}>{row.date}</div>
                                            <div style={{ fontSize: '0.85rem' }}>{row.pageviews} views</div>
                                            <div style={{ fontSize: '0.85rem', color: '#666' }}>{row.uniqueVisitors} uniques</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.35rem' }}>Top posts</div>
                            <div style={{ border: '1px solid #eee', borderRadius: '8px', background: 'white', padding: '0.5rem' }}>
                                {(analytics?.topPosts || []).length === 0 ? (
                                    <div style={{ fontSize: '0.85rem', color: '#888' }}>No data.</div>
                                ) : (
                                    (analytics?.topPosts || []).map((row) => (
                                        <div key={row.postId} style={{ padding: '0.35rem 0', borderBottom: '1px dashed #f0f0f0' }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{row.title || row.slug}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{row.pageviews} views • {row.uniqueVisitors} uniques</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {!selectedPost ? (
                    <div style={{ padding: '1rem' }}>No post selected.</div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                            <h2 style={{ marginBottom: 0 }}>Edit post</h2>
                            <button
                                onClick={deleteSelected}
                                disabled={busy}
                                style={{ background: '#fff0f0', color: '#a40000', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 700 }}
                            >
                                Delete
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Title *</span>
                                <input
                                    value={selectedPost.title}
                                    onChange={(e) => {
                                        const title = e.target.value;
                                        const autoSlug = selectedPost.slug?.trim() ? selectedPost.slug : slugify(title);
                                        updateSelected({ title, slug: autoSlug });
                                    }}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Slug *</span>
                                <input
                                    value={selectedPost.slug}
                                    onChange={(e) => updateSelected({ slug: slugify(e.target.value) })}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', gridColumn: '1 / -1' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Excerpt</span>
                                <input
                                    value={selectedPost.excerpt}
                                    onChange={(e) => updateSelected({ excerpt: e.target.value })}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Category</span>
                                <select
                                    value={selectedPost.categoryId ?? ''}
                                    onChange={(e) => {
                                        const id = e.target.value ? Number(e.target.value) : null;
                                        const cat = categories.find(c => c.id === id);
                                        updateSelected({ categoryId: id, category: cat?.name || '' });
                                    }}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }}
                                >
                                    <option value="">—</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Date</span>
                                <input
                                    type="date"
                                    value={selectedPost.date || ''}
                                    onChange={(e) => updateSelected({ date: e.target.value })}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Author</span>
                                <input
                                    value={selectedPost.author}
                                    onChange={(e) => updateSelected({ author: e.target.value })}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }}
                                />
                            </label>

                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.85rem', color: '#666' }}>Image URL or /public path</span>
                                <input
                                    value={selectedPost.image}
                                    onChange={(e) => updateSelected({ image: e.target.value })}
                                    style={{ padding: '0.6rem 0.75rem', border: '1px solid #eee', borderRadius: '8px' }}
                                />
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1 / -1' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedPost.hasFaq || false}
                                    onChange={(e) => updateSelected({ hasFaq: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: '0.9rem', color: '#333', fontWeight: 600 }}>Enable FAQ section</span>
                            </label>
                        </div>

                        {selectedPost.hasFaq && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.9rem', color: '#333', fontWeight: 700 }}>FAQ Items</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newItems = [...(selectedPost.faqItems || []), { question: '', answer: '' }];
                                            updateSelected({ faqItems: newItems });
                                        }}
                                        style={{ background: 'var(--color-primary)', color: 'white', padding: '0.4rem 0.65rem', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}
                                    >
                                        + Add FAQ
                                    </button>
                                </div>
                                {(selectedPost.faqItems || []).length === 0 && (
                                    <div style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>No FAQ items yet. Click "+ Add FAQ" to add one.</div>
                                )}
                                {(selectedPost.faqItems || []).map((faq, index) => (
                                    <div key={index} style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'white', borderRadius: '6px', border: '1px solid #ddd' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>FAQ #{index + 1}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newItems = selectedPost.faqItems.filter((_, i) => i !== index);
                                                    updateSelected({ faqItems: newItems });
                                                }}
                                                style={{ background: '#fff0f0', color: '#a40000', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.75rem' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>Question</span>
                                            <input
                                                value={faq.question}
                                                onChange={(e) => {
                                                    const newItems = [...selectedPost.faqItems];
                                                    newItems[index] = { ...newItems[index], question: e.target.value };
                                                    updateSelected({ faqItems: newItems });
                                                }}
                                                placeholder="Enter the question..."
                                                style={{ padding: '0.5rem 0.65rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' }}
                                            />
                                        </label>
                                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>Answer</span>
                                            <textarea
                                                value={faq.answer}
                                                onChange={(e) => {
                                                    const newItems = [...selectedPost.faqItems];
                                                    newItems[index] = { ...newItems[index], answer: e.target.value };
                                                    updateSelected({ faqItems: newItems });
                                                }}
                                                placeholder="Enter the answer..."
                                                rows={3}
                                                style={{ padding: '0.5rem 0.65rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', resize: 'vertical' }}
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.35rem' }}>Markdown *</div>
                                <textarea
                                    value={selectedPost.content}
                                    onChange={(e) => updateSelected({ content: e.target.value })}
                                    rows={16}
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        border: '1px solid #eee',
                                        borderRadius: '8px',
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                                        fontSize: '0.95rem',
                                    }}
                                />
                            </div>

                            <div>
                                <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.35rem' }}>Preview</div>
                                <div style={{
                                    border: '1px solid #eee',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    minHeight: '420px',
                                    background: 'var(--color-background)'
                                }}>
                                    <MarkdownContent markdown={selectedPost.content} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
};

export default Admin;
