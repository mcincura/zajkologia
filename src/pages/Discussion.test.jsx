import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Discussion from './Discussion';

vi.mock('../api/client', () => ({
  createDiscussionReply: vi.fn(), createDiscussionThread: vi.fn(),
  loadDiscussionReplies: vi.fn(), loadDiscussionThread: vi.fn(), loadDiscussionThreads: vi.fn(), loadMembershipSession: vi.fn(),
}));
import * as api from '../api/client';

const renderPage = (path = '/klub/diskusia') => render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/klub/diskusia" element={<Discussion />} /><Route path="/klub/diskusia/:threadId" element={<Discussion />} /></Routes></MemoryRouter>);
beforeEach(() => { vi.clearAllMocks(); vi.mocked(api.loadMembershipSession).mockResolvedValue({ hasAccess: true }); vi.mocked(api.loadDiscussionThreads).mockResolvedValue({ threads: [], nextOffset: null }); });
describe('Discussion', () => {
  it('does not fetch private discussion data for an unpaid visitor', async () => { vi.mocked(api.loadMembershipSession).mockResolvedValue({ hasAccess: false }); renderPage(); expect(await screen.findByText(/Diskusia je pre členov/i)).toBeInTheDocument(); expect(api.loadDiscussionThreads).not.toHaveBeenCalled(); });
  it('offers an obvious return to the main club', async () => { renderPage(); expect(await screen.findByRole('link', { name: /Späť do Klubu/i })).toHaveAttribute('href', '/klub'); });
  it('creates a thread through the member API', async () => { const user = userEvent.setup(); vi.mocked(api.createDiscussionThread).mockResolvedValue({ id: 1, title: 'Pomoc', author: { displayName: 'Člen klubu' }, replyCount: 0, createdAt: '2026-08-04T10:00:00Z' }); renderPage(); await user.type(await screen.findByLabelText('Názov témy'), 'Pomoc'); await user.type(screen.getByLabelText('Text príspevku'), 'Mám otázku'); await user.click(screen.getByRole('button', { name: /Vytvoriť tému/i })); expect(api.createDiscussionThread).toHaveBeenCalledWith({ title: 'Pomoc', body: 'Mám otázku' }); });
});
