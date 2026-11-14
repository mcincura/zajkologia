import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../api/client';
import { listMarkdownImages } from '../utils/markdownImages';
import MarkdownContent from '../components/MarkdownContent';
import Admin from './Admin';

vi.mock('../api/client', () => ({
  apiFetch: vi.fn(), apiUrl: (path) => path,
  mapPostFromApi: (post) => ({ ...post, content: post.contentMd, image: post.imageUrl || '', excerpt: post.excerpt || '' }),
}));

let storedPost;
const renderEditor = () => render(<MemoryRouter><Admin section="posts" /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  storedPost = { id: 1, title: 'Testovací článok', slug: 'testovaci-clanok', author: 'Test', date: '2026-11-14',
    contentMd: '## Kapitola\n\n![Králik](/kralik.jpg "Pôvodný popis")\n\nText článku.' };
  vi.mocked(apiFetch).mockImplementation(async (path, options) => {
    if (path === '/api/auth/me') return { isAuthenticated: true, username: 'test' };
    if (path === '/api/categories') return { categories: [] };
    if (path === '/api/posts') return { posts: [{ ...storedPost }] };
    if (path.startsWith('/api/analytics/summary')) return { totals: {}, perDay: [] };
    if (path.startsWith('/api/orders/admin?')) return { orders: [] };
    if (path === '/api/posts/1' && options?.method === 'PUT') {
      storedPost = { ...storedPost, ...JSON.parse(options.body) };
      return { post: { ...storedPost } };
    }
    return {};
  });
});

describe('saving article image settings', () => {
  it.each(['left', 'right'])('persists a small %s image by choosing its settings and clicking Save', async (alignment) => {
    const user = userEvent.setup();
    const view = renderEditor();
    await user.selectOptions(await screen.findByLabelText('Vložiť alebo upraviť obrázok'), '0');
    await user.selectOptions(screen.getByLabelText('Zarovnanie'), alignment);
    await user.selectOptions(screen.getByLabelText('Veľkosť obrázka'), 'small');
    await user.click(screen.getByRole('button', { name: 'Save', exact: true }));
    await screen.findByText('Saved.');
    expect(listMarkdownImages(storedPost.contentMd)).toEqual([
      expect.objectContaining({ alignment, size: 'small', title: 'Pôvodný popis' }),
    ]);

    view.unmount();
    const reopened = renderEditor();
    await user.selectOptions(await screen.findByLabelText('Vložiť alebo upraviť obrázok'), '0');
    expect(screen.getByLabelText('Zarovnanie')).toHaveValue(alignment);
    expect(screen.getByLabelText('Veľkosť obrázka')).toHaveValue('small');
    reopened.unmount();

    render(<MarkdownContent markdown={storedPost.contentMd} />);
    expect(screen.getByRole('img', { name: 'Králik' }).closest('figure'))
      .toHaveClass(`markdown-image--${alignment}`, 'markdown-image--small');
  });
});
