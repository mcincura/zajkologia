import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCategoryConfig } from '../constants/categories';

const PostCard = ({ post }) => {
    const location = useLocation();
    const from = location.pathname + location.search;
    const config = getCategoryConfig(post.category);
    const Icon = config.icon;

    return (
        <article style={{
            backgroundColor: 'var(--color-white)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
            transition: 'transform 0.2s ease',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Link
                to={`/post/${post.slug}`}
                state={{ from }}
                aria-label={`Otvoriť článok ${post.title}`}
                style={{
                    color: 'inherit',
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    textDecoration: 'none',
                }}
            >
                <div style={{ overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                        width: '100%',
                        aspectRatio: '4 / 3',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <img
                            src={post.image}
                            alt={post.title}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                position: 'absolute',
                                inset: 0,
                                transition: 'transform 0.3s ease'
                            }}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                        />
                    </div>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        color: config.color,
                        fontSize: '1rem',
                        fontWeight: '700',
                        marginBottom: '1rem'
                    }}>
                        {Icon && <Icon size={20} strokeWidth={2.5} />}
                        <span style={{ paddingTop: '2px' }}>{post.category}</span>
                    </div>
                    <h3 style={{ color: 'var(--color-text)', marginBottom: '0.75rem' }}>
                        {post.title}
                    </h3>

                    <p style={{
                        color: '#555',
                        marginBottom: '1rem',
                        lineHeight: '1.6',
                        flex: 1
                    }}>
                        {post.excerpt}
                    </p>
                </div>
            </Link>
        </article>
    );
};

export default PostCard;
