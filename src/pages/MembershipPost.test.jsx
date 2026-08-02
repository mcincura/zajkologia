import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadMembershipPost,
  loadMembershipPosts,
  loadMembershipSession,
  recordMembershipPostEvent,
} from '../api/client';
import MembershipPost from './MembershipPost';

vi.mock('../api/client', () => ({
  createMembershipBillingPortal: vi.fn(),
  downloadMembershipPostAsset: vi.fn(),
  loadMembershipPost: vi.fn(),
  loadMembershipPosts: vi.fn(),
  loadMembershipSession: vi.fn(),
  membershipMediaUrl: (url) => url,
  recordMembershipPostEvent: vi.fn(),
  setMembershipPostSaved: vi.fn(),
}));

vi.mock('../components/MembershipComments', () => ({ default: () => <div>Comments</div> }));
vi.mock('../components/MembershipPostCard', () => ({ default: () => <div>Related post</div> }));

const podcastPost = {
  id: 9,
  slug: 'pokojny-podcast',
  title: 'Pokojný podcast pre králiky',
  publishedAt: '2026-08-02T10:00:00.000Z',
  categories: [],
  assets: [
    {
      id: 22,
      assetType: 'audio',
      caption: 'Pokojný podcast',
      filename: 'pokojny-podcast.mp3',
      mimeType: 'audio/mpeg',
      durationSeconds: 374,
      streamUrl: '/api/membership/posts/9/assets/22',
    },
  ],
  bodyMd: 'Text článku je až za prehrávačom.',
  access: 'full',
  locked: false,
  isSaved: false,
  allowComments: false,
  commentCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadMembershipPost).mockResolvedValue({ post: podcastPost });
  vi.mocked(loadMembershipPosts).mockResolvedValue({ posts: [] });
  vi.mocked(loadMembershipSession).mockResolvedValue({ isAuthenticated: true, member: {} });
  vi.mocked(recordMembershipPostEvent).mockResolvedValue({ ok: true });
});

describe('MembershipPost podcasts', () => {
  it('places one primary player before the article body and shows the episode duration in Slovak', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/klub/p/pokojny-podcast']}>
        <Routes>
          <Route path="/klub/p/:slug" element={<MembershipPost />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: podcastPost.title })).toBeInTheDocument();
    expect(screen.getByText('Dĺžka epizódy: 6 min 14 s')).toBeInTheDocument();
    expect(screen.getByText('Text článku je až za prehrávačom.')).toBeInTheDocument();

    const article = container.querySelector('.membership-post-article');
    const audio = article.querySelector('audio');
    const body = article.querySelector('.membership-post-markdown');
    expect(audio.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(article.querySelectorAll('audio')).toHaveLength(1);
  });

  it('learns and displays the episode duration when the API has not processed it yet', async () => {
    vi.mocked(loadMembershipPost).mockResolvedValue({
      post: {
        ...podcastPost,
        assets: [{ ...podcastPost.assets[0], durationSeconds: null }],
      },
    });
    const { container } = render(
      <MemoryRouter initialEntries={['/klub/p/pokojny-podcast']}>
        <Routes>
          <Route path="/klub/p/:slug" element={<MembershipPost />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: podcastPost.title });
    const audio = container.querySelector('.membership-post-article audio');
    Object.defineProperty(audio, 'duration', { configurable: true, value: 125 });
    audio.dispatchEvent(new Event('loadedmetadata', { bubbles: true }));

    expect(await screen.findByText('Dĺžka epizódy: 2 min 5 s')).toBeInTheDocument();
  });
});
