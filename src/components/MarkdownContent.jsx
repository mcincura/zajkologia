import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    extractMarkdownHeadings,
    rehypeHeadingIds,
    selectTableOfContentsHeadings,
} from '../utils/markdownHeadings';
import '../styles/markdown-content.css';

const rehypePlugins = [rehypeHeadingIds];

const headingClassName = (className) => ['markdown-heading-anchor', className].filter(Boolean).join(' ');

const markdownComponents = {
    h1: ({ children, className, ...props }) => (
        <h1 className={headingClassName(className)} style={{ fontSize: '2.25rem', margin: '2rem 0 0.75rem' }} {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, className, ...props }) => (
        <h2 className={headingClassName(className)} style={{ fontSize: '1.9rem', margin: '2rem 0 0.75rem' }} {...props}>
            {children}
        </h2>
    ),
    h3: ({ children, className, ...props }) => (
        <h3 className={headingClassName(className)} style={{ fontSize: '1.5rem', margin: '2rem 0 0.75rem' }} {...props}>
            {children}
        </h3>
    ),
    h4: ({ children, className, ...props }) => (
        <h4 className={headingClassName(className)} style={{ margin: '2rem 0 0.75rem' }} {...props}>
            {children}
        </h4>
    ),
    h5: ({ children, className, ...props }) => (
        <h5 className={headingClassName(className)} style={{ margin: '2rem 0 0.75rem' }} {...props}>
            {children}
        </h5>
    ),
    h6: ({ children, className, ...props }) => (
        <h6 className={headingClassName(className)} style={{ margin: '2rem 0 0.75rem' }} {...props}>
            {children}
        </h6>
    ),
    p: ({ children, ...props }) => (
        <p
            style={{
                margin: '0 0 0.75rem',
                color: '#333',
                textAlign: 'justify',
                textJustify: 'inter-word',
            }}
            {...props}
        >
            {children}
        </p>
    ),
    a: ({ children, href, ...props }) => {
        const isSamePageAnchor = typeof href === 'string' && href.startsWith('#');
        return (
            <a
                href={href}
                style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                target={isSamePageAnchor ? undefined : '_blank'}
                rel={isSamePageAnchor ? undefined : 'noreferrer'}
                {...props}
            >
                {children}
            </a>
        );
    },
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
                display: 'block',
                maxWidth: '100%',
                height: 'auto',
                borderRadius: 'var(--radius)',
                margin: '0.75rem auto 1.25rem',
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
};

const ArticleTableOfContents = ({ headings }) => {
    const titleId = React.useId();

    return (
        <nav className="article-toc" aria-labelledby={titleId}>
            <h2 className="article-toc__title" id={titleId}>Obsah článku</h2>
            <ul className="article-toc__list">
                {headings.map((heading) => (
                    <li key={heading.id}>
                        <a className="article-toc__link" href={`#${heading.id}`}>
                            {heading.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

const MarkdownContent = ({ markdown }) => {
    const headings = React.useMemo(
        () => selectTableOfContentsHeadings(extractMarkdownHeadings(markdown)),
        [markdown]
    );

    return (
        <div className="markdown-content">
            {headings.length > 0 ? <ArticleTableOfContents headings={headings} /> : null}
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={rehypePlugins}
                components={markdownComponents}
            >
                {markdown || ''}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownContent;
