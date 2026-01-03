import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownContent = ({ markdown }) => {
    return (
        <div style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children, ...props }) => (
                        <h1 style={{ fontSize: '2.25rem', margin: '0 0 1rem' }} {...props}>
                            {children}
                        </h1>
                    ),
                    h2: ({ children, ...props }) => (
                        <h2 style={{ fontSize: '1.9rem', margin: '1.75rem 0 1rem' }} {...props}>
                            {children}
                        </h2>
                    ),
                    h3: ({ children, ...props }) => (
                        <h3 style={{ fontSize: '1.5rem', margin: '1.5rem 0 0.75rem' }} {...props}>
                            {children}
                        </h3>
                    ),
                    p: ({ children, ...props }) => (
                        <p style={{ margin: '0 0 1rem', color: '#333' }} {...props}>
                            {children}
                        </p>
                    ),
                    a: ({ children, ...props }) => (
                        <a
                            style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                            target="_blank"
                            rel="noreferrer"
                            {...props}
                        >
                            {children}
                        </a>
                    ),
                    ul: ({ children, ...props }) => (
                        <ul style={{ paddingLeft: '1.25rem', margin: '0 0 1rem', listStyle: 'disc' }} {...props}>
                            {children}
                        </ul>
                    ),
                    ol: ({ children, ...props }) => (
                        <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1rem', listStyle: 'decimal' }} {...props}>
                            {children}
                        </ol>
                    ),
                    li: ({ children, ...props }) => (
                        <li style={{ margin: '0.25rem 0' }} {...props}>
                            {children}
                        </li>
                    ),
                    blockquote: ({ children, ...props }) => (
                        <blockquote
                            style={{
                                borderLeft: '4px solid var(--color-light)',
                                paddingLeft: '1rem',
                                margin: '0 0 1rem',
                                color: '#555',
                            }}
                            {...props}
                        >
                            {children}
                        </blockquote>
                    ),
                    code: ({ children, ...props }) => (
                        <code
                            style={{
                                background: 'var(--color-light)',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '4px',
                                fontSize: '0.95em',
                            }}
                            {...props}
                        >
                            {children}
                        </code>
                    ),
                    pre: ({ children, ...props }) => (
                        <pre
                            style={{
                                background: 'var(--color-light)',
                                padding: '1rem',
                                borderRadius: 'var(--radius)',
                                overflowX: 'auto',
                                margin: '0 0 1rem',
                            }}
                            {...props}
                        >
                            {children}
                        </pre>
                    ),
                    img: ({ ...props }) => (
                        <img
                            style={{
                                maxWidth: '100%',
                                borderRadius: 'var(--radius)',
                                margin: '0.5rem 0 1rem',
                            }}
                            {...props}
                        />
                    ),
                    hr: ({ ...props }) => (
                        <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '1.5rem 0' }} {...props} />
                    ),
                    table: ({ children, ...props }) => (
                        <div style={{ overflowX: 'auto', margin: '0 0 1rem' }}>
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    background: 'white',
                                    borderRadius: 'var(--radius)',
                                }}
                                {...props}
                            >
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children, ...props }) => (
                        <th style={{ textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #eee' }} {...props}>
                            {children}
                        </th>
                    ),
                    td: ({ children, ...props }) => (
                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #eee' }} {...props}>
                            {children}
                        </td>
                    ),
                }}
            >
                {markdown || ''}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownContent;
