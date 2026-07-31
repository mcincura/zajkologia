import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

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
});
