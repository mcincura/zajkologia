import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import MembershipPostCard from './MembershipPostCard';

const post = {
  id: 17,
  slug: 'letna-starostlivost',
  title: 'Letná starostlivosť',
  excerpt: 'Krátka ukážka.',
  publishedAt: '2026-07-31T10:00:00.000Z',
  locked: true,
  publicThumbnailMode: 'blurred',
  cover: {
    url: '/api/membership/posts/letna-starostlivost/cover',
    altText: 'Králik pri miske',
  },
  categories: [],
  assetTypes: ['image'],
  commentCount: 0,
};

const renderCard = (overrides = {}) =>
  render(
    <MemoryRouter>
      <MembershipPostCard post={{ ...post, ...overrides }} />
    </MemoryRouter>,
  );

describe('MembershipPostCard thumbnail previews', () => {
  it('blurs a locked cover when the creator selected a blurred preview', () => {
    const { container } = renderCard();

    expect(
      container.querySelector('.membership-post-card__cover')
    ).toHaveClass('membership-post-card__cover--blurred');
    expect(screen.getByText('Náhľad pre členov')).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });

  it('keeps visible previews and active-member covers sharp', () => {
    const { container, rerender } = renderCard({ publicThumbnailMode: 'visible' });

    expect(
      container.querySelector('.membership-post-card__cover')
    ).not.toHaveClass('membership-post-card__cover--blurred');
    expect(screen.getByRole('img')).toHaveAttribute('alt', 'Králik pri miske');

    rerender(
      <MemoryRouter>
        <MembershipPostCard
          post={{ ...post, locked: false, publicThumbnailMode: 'blurred' }}
        />
      </MemoryRouter>,
    );
    expect(
      container.querySelector('.membership-post-card__cover')
    ).not.toHaveClass('membership-post-card__cover--blurred');
  });

  it('keeps mobile card covers constrained by the card width instead of their minimum height', () => {
    const stylesheet = readFileSync(
      'src/styles/membership.css',
      'utf8'
    );

    expect(stylesheet).toMatch(
      /\.membership-post-card__main\s*\{[\s\S]*?min-width:\s*0;/
    );
    expect(stylesheet).toMatch(
      /\.membership-post-card__cover\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;[\s\S]*?max-width:\s*100%;/
    );
    expect(stylesheet).toMatch(
      /@media \(max-width: 720px\)\s*\{[\s\S]*?\.membership-post-card__cover,[\s\S]*?min-height:\s*0;[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/
    );
  });

  it('keeps opened article images uncropped while leaving feed thumbnails fixed at 16:9', () => {
    const stylesheet = readFileSync(
      'src/styles/membership.css',
      'utf8'
    );

    // A detail image can therefore use its natural 9:16 or landscape ratio.
    expect(stylesheet).toMatch(
      /\.membership-post-article__cover img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*auto;[\s\S]*?object-fit:\s*contain;/
    );
    expect(stylesheet).toMatch(
      /\.membership-post-article__cover:not\(\.membership-post-article__cover--blurred\)\s*\{\s*aspect-ratio:\s*auto;/
    );

    // This is deliberately separate from a feed-card thumbnail, which remains cropped.
    expect(stylesheet).toMatch(
      /\.membership-post-card__cover\s*\{[\s\S]*?aspect-ratio:\s*16\s*\/\s*9;/
    );
  });
});
