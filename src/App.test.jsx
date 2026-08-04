import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from './App';

vi.mock('./pages/Membership', () => ({
  default: ({ loginOnly = false }) => (
    <h1>{loginOnly ? 'Len prihlásenie do klubu' : 'Skutočný prehľad klubu'}</h1>
  ),
}));

vi.mock('./pages/MembershipPost', () => ({
  default: () => <h1>Skutočný detail príspevku</h1>,
}));

vi.mock('./pages/Discussion', () => ({
  default: () => <h1>Skutočná klubová diskusia</h1>,
}));

const renderRoute = (path) => {
  window.history.replaceState({}, '', path);
  return render(<App />);
};

describe('public club routes', () => {
  it('renders the live club index without a preview gate', async () => {
    renderRoute('/klub');

    expect(await screen.findByRole('heading', { name: /skutočný prehľad klubu/i })).toBeInTheDocument();
  });

  it('renders the live post route without a preview gate', async () => {
    renderRoute('/klub/testovaci-prispevok');

    expect(await screen.findByRole('heading', { name: /skutočný detail príspevku/i })).toBeInTheDocument();
  });

  it('keeps the explicit member login route reachable', async () => {
    renderRoute('/klub/prihlasenie');

    expect(await screen.findByRole('heading', { name: /len prihlásenie do klubu/i })).toBeInTheDocument();
  });

  it('renders the live discussion route without a preview gate', async () => {
    renderRoute('/klub/diskusia');

    expect(await screen.findByRole('heading', { name: /skutočná klubová diskusia/i })).toBeInTheDocument();
  });
});
