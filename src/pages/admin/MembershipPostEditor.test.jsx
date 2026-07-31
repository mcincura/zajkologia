import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFetch } from '../../api/client';
import MembershipPostEditor from './MembershipPostEditor';

vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
  apiUrl: vi.fn((path) => path),
}));

const createPost = (overrides = {}) => ({
  id: 42,
  title: 'Nový obrázkový príspevok',
  slug: 'novy-obrazkovy-prispevok',
  excerpt: '',
  bodyMd: '',
  status: 'draft',
  isPinned: false,
  allowComments: true,
  publicThumbnailMode: 'blurred',
  publishedAt: null,
  updatedAt: '2026-07-31T10:00:00.000Z',
  categories: [],
  assets: [],
  coverAssetId: null,
  commentCount: 0,
  ...overrides,
});

const renderEditor = (overrides = {}) => {
  const props = {
    initialPost: null,
    categories: [],
    onSaved: vi.fn(),
    onDeleted: vi.fn(),
    onCancel: vi.fn(),
    onStatus: vi.fn(),
    ...overrides,
  };
  return { ...render(<MembershipPostEditor {...props} />), props };
};

const EchoingEditor = ({ onStatus }) => {
  const [post, setPost] = useState(null);
  return (
    <MembershipPostEditor
      initialPost={post}
      categories={[]}
      onSaved={setPost}
      onDeleted={vi.fn()}
      onCancel={vi.fn()}
      onStatus={onStatus}
    />
  );
};

describe('MembershipPostEditor media upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops before the API and focuses the title when a new post is blank', () => {
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: 'Vybrať súbory' }));

    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /najprv zadajte názov príspevku/i
    );
    expect(screen.getByRole('textbox', { name: 'Názov *' })).toHaveFocus();
  });

  it('creates one draft before uploading the selected image', async () => {
    const draft = createPost();
    const uploadedPost = createPost({
      assets: [
        {
          id: 9,
          assetType: 'image',
          storageProvider: 'local',
          filename: 'zajacik.png',
          mimeType: 'image/png',
          fileSize: 128,
          processingStatus: 'ready',
          sortOrder: 0,
        },
      ],
      coverAssetId: 9,
    });
    vi.mocked(apiFetch).mockResolvedValue({ post: draft });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ post: uploadedPost }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container, props } = renderEditor();

    fireEvent.change(screen.getByRole('textbox', { name: 'Názov *' }), {
      target: { value: draft.title },
    });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: {
        files: [new File(['image'], 'zajacik.png', { type: 'image/png' })],
      },
    });

    await waitFor(() => {
      expect(props.onStatus).toHaveBeenCalledWith('Súbor je nahraný.');
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch).toHaveBeenCalledWith('/api/membership/admin/posts', {
      method: 'POST',
      body: expect.any(String),
    });
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1].body)).toMatchObject({
      title: draft.title,
      slug: draft.slug,
      status: 'draft',
      autoSlug: true,
      publicThumbnailMode: 'blurred',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/membership/admin/posts/42/assets',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
        credentials: 'include',
      })
    );
  });

  it('shares one in-flight draft creation across overlapping file selections', async () => {
    let resolveDraft;
    const draftPromise = new Promise((resolve) => {
      resolveDraft = resolve;
    });
    vi.mocked(apiFetch).mockReturnValue(draftPromise);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ post: createPost() }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { container, props } = renderEditor();

    fireEvent.change(screen.getByRole('textbox', { name: 'Názov *' }), {
      target: { value: 'Súbežný upload' },
    });
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['first'], 'prvy.png', { type: 'image/png' })],
      },
    });
    fireEvent.change(fileInput, {
      target: {
        files: [new File(['second'], 'druhy.png', { type: 'image/png' })],
      },
    });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(props.onStatus).toHaveBeenCalledWith(
      'Nahrávanie už prebieha. Počkajte na jeho dokončenie.'
    );
    resolveDraft({
      post: createPost({ title: 'Súbežný upload', slug: 'subezny-upload' }),
    });

    await waitFor(() => {
      expect(props.onStatus).toHaveBeenCalledWith('Súbor je nahraný.');
    });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves text typed while the first draft and image are being created', async () => {
    let resolveDraft;
    vi.mocked(apiFetch).mockReturnValue(
      new Promise((resolve) => {
        resolveDraft = resolve;
      })
    );
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ post: createPost() }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const onStatus = vi.fn();
    const { container } = render(<EchoingEditor onStatus={onStatus} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Názov *' }), {
      target: { value: 'Rozpracovaný príspevok' },
    });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: {
        files: [new File(['image'], 'zajacik.png', { type: 'image/png' })],
      },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Obsah príspevku' }), {
      target: { value: 'Tento text vznikol počas nahrávania.' },
    });
    resolveDraft({
      post: createPost({
        title: 'Rozpracovaný príspevok',
        slug: 'rozpracovany-prispevok',
      }),
    });

    await waitFor(() => {
      expect(onStatus).toHaveBeenCalledWith('Súbor je nahraný.');
    });
    expect(screen.getByRole('textbox', { name: 'Obsah príspevku' })).toHaveValue(
      'Tento text vznikol počas nahrávania.'
    );
  });

  it('keeps a manually chosen duplicate URL explicit and explains the conflict', async () => {
    vi.mocked(apiFetch).mockRejectedValue(
      new Error('membership_post_slug_exists')
    );
    const { props } = renderEditor();

    fireEvent.change(screen.getByRole('textbox', { name: 'Názov *' }), {
      target: { value: 'Nový príspevok' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'URL adresa *' }), {
      target: { value: 'moja-vlastna-url' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť koncept' }));

    await waitFor(() => {
      expect(props.onStatus).toHaveBeenCalledWith(
        'Uloženie zlyhalo: Táto URL adresa už existuje. Zmeňte ju alebo použite iný názov.'
      );
    });
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1].body)).toMatchObject({
      slug: 'moja-vlastna-url',
      autoSlug: false,
    });
  });

  it('loads and saves the public thumbnail visibility setting', async () => {
    const post = createPost({ publicThumbnailMode: 'visible' });
    vi.mocked(apiFetch).mockResolvedValue({
      post: { ...post, publicThumbnailMode: 'blurred' },
    });
    renderEditor({ initialPost: post });

    expect(
      screen.getByRole('radio', { name: /zobraziť obrázok/i })
    ).toBeChecked();
    fireEvent.click(
      screen.getByRole('radio', { name: /rozmazať obrázok/i })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Uložiť koncept' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    expect(JSON.parse(vi.mocked(apiFetch).mock.calls[0][1].body)).toMatchObject({
      publicThumbnailMode: 'blurred',
    });
  });
});
