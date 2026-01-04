import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, User } from 'lucide-react';

const PostCard = ({ post }) => {
    const location = useLocation();
    const from = location.pathname + location.search;

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
            <Link to={`/post/${post.slug}`} state={{ from }} style={{ overflow: 'hidden' }}>
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
            </Link>

            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: 'var(--color-primary)',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    {post.category}
                </div>

                <h3 style={{ marginBottom: '0.75rem' }}>
                    <Link to={`/post/${post.slug}`} state={{ from }} style={{ color: 'var(--color-text)' }}>
                        {post.title}
                    </Link>
                </h3>

                <p style={{
                    color: '#666',
                    marginBottom: '1.5rem',
                    lineHeight: '1.6',
                    flex: 1
                }}>
                    {post.excerpt}
                </p>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.85rem',
                    color: '#888',
                    borderTop: '1px solid #eee',
                    paddingTop: '1rem'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={14} /> {post.author}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={14} /> {post.date}
                    </span>
                </div>
            </div>
        </article>
    );
};

export default PostCard;
