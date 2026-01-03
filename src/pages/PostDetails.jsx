import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import MarkdownContent from '../components/MarkdownContent';
import { apiFetch, mapPostFromApi } from '../api/client';

const PostDetails = () => {
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [post, setPost] = useState(null);

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
                    <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Späť na hlavný blog</Link>
                </div>
            </div>
        );
    }

    if (!post) {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h2>Článok nebol nájdený 🥕</h2>
                <Link to="/" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>Späť na hlavný blog</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <Link to="/" style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '2rem',
                color: '#666'
            }}>
                <ArrowLeft size={20} /> Späť na blog
            </Link>

            <article style={{ maxWidth: '800px', margin: '0 auto' }}>
                <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <span style={{
                        backgroundColor: 'var(--color-light)',
                        color: 'var(--color-accent)',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '50px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        display: 'inline-block',
                        marginBottom: '1rem'
                    }}>
                        {post.category}
                    </span>
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

                <img
                    src={post.image}
                    alt={post.title}
                    style={{
                        width: '100%',
                        maxHeight: '400px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius)',
                        marginBottom: '3rem'
                    }}
                />

                <MarkdownContent markdown={post.content} />
            </article>
        </div>
    );
};

export default PostDetails;
