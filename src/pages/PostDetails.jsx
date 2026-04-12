import React, { useEffect, useState } from 'react';
import { useLocation, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import MarkdownContent from '../components/MarkdownContent';
import FaqSection from '../components/FaqSection';
import { apiFetch, mapPostFromApi } from '../api/client';
import { getCategoryConfig } from '../constants/categories';

const PostDetails = () => {
    const location = useLocation();
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [post, setPost] = useState(null);

    const backTo = location.state?.from || '/';

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [slug]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError('');
            setPost(null);
            try {
                const res = await apiFetch(`/api/posts/by-slug/${encodeURIComponent(slug)}`);
                if (cancelled) return;
                setPost(res?.post ? mapPostFromApi(res.post) : null);
            } catch (err) {
                if (cancelled) return;
                if (err?.status === 404) {
                    setPost(null);
                } else {
                    setError(err?.message || 'Failed to load post');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        if (slug) load();
        else {
            setLoading(false);
            setPost(null);
        }

        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h2>Načítavam…</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h2>Nepodarilo sa načítať článok</h2>
                <div style={{ color: '#666', marginTop: '0.5rem' }}>{error}</div>
                <div style={{ marginTop: '1rem' }}>
                    <Link to={backTo} style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Späť na hlavný blog</Link>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h2>Článok nebol nájdený 🥕</h2>
                <Link to={backTo} style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Späť na hlavný blog</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <Link to={backTo} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1.5rem',
                marginLeft: '0.25rem',
                marginBottom: '2rem',
                color: '#666'
            }}>
                <ArrowLeft size={20} /> Späť na blog
            </Link>

            <article style={{ maxWidth: '800px', margin: '0 auto' }}>
                <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    {(() => {
                        const config = getCategoryConfig(post.category);
                        const Icon = config.icon;
                        return (
                            <span style={{
                                backgroundColor: config.bg,
                                color: config.color,
                                padding: '0.4rem 1rem',
                                borderRadius: '50px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                marginBottom: '1.5rem',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}>
                                {Icon && <Icon size={16} />}
                                {post.category}
                            </span>
                        );
                    })()}
                    <h1 style={{ marginBottom: '1.5rem' }}>{post.title}</h1>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2rem',
                        color: '#666',
                        fontSize: '0.9rem'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={16} /> {post.author}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Calendar size={16} /> {post.date}
                        </span>
                    </div>
                </header>

                <MarkdownContent markdown={post.content} />

                {post.hasFaq && post.faqItems && post.faqItems.length > 0 && (
                    <FaqSection faqItems={post.faqItems} />
                )}
            </article>
        </div>
    );
};

export default PostDetails;
