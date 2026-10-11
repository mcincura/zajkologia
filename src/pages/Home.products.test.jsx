import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Home from './Home';

vi.mock('../components/EmailCaptureOffer', () => ({ default: () => null }));
vi.mock('../cart/useCart', () => ({ useCart: () => ({ addItem: vi.fn() }) }));
vi.mock('../api/client', () => ({
  apiUrl: (path) => path,
  apiFetch: async () => ({ categories: [{ id: 1, name: 'Strava' }], posts: [] }),
  mapPostFromApi: (post) => post,
}));
vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({
    loading: false,
    products: [
      { id: 1, slug: 'guide', name: 'Platená príručka', productType: 'digital' },
      { id: 2, slug: 'free', name: 'Bezplatný sprievodca', productType: 'digital', isFree: true },
      { id: 3, slug: 'ball', name: 'Čuchacia hračka', productType: 'physical' },
      { id: 4, slug: 'bundle', name: 'Príručka a loptička', productType: 'mixed' },
    ],
  }),
}));

function NavigationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <>
    <output aria-label="Adresa">{location.search}</output>
    <button onClick={() => navigate(-1)}>Späť</button>
  </>;
}

const renderCatalog = (query = '?category=Produkty') => render(
  <MemoryRouter initialEntries={[`/${query}`]}>
    <Home />
    <NavigationProbe />
  </MemoryRouter>
);

const categoryLink = (name) => within(screen.getByRole('navigation', { name: 'Podkategórie produktov' }))
  .getByRole('link', { name, exact: true });
const productNames = () => screen.queryAllByRole('article').map((card) =>
  within(card).getByRole('heading').textContent
);

describe('product subcategory browsing', () => {
  it('filters the catalog and includes mixed bundles in both relevant categories', async () => {
    const user = userEvent.setup();
    renderCatalog();
    expect(productNames()).toHaveLength(4);

    await user.click(categoryLink('Čuchacie loptičky'));
    expect(productNames()).toEqual(['Čuchacia hračka', 'Príručka a loptička']);
    expect(categoryLink('Čuchacie loptičky')).toHaveAttribute('aria-current', 'page');

    await user.click(categoryLink('Materiály zadarmo'));
    expect(productNames()).toEqual(['Bezplatný sprievodca']);

    await user.click(categoryLink('Prémiové príručky'));
    expect(productNames()).toEqual(['Platená príručka', 'Príručka a loptička']);

    await user.click(categoryLink('Všetky produkty'));
    expect(productNames()).toHaveLength(4);
    expect(screen.getByLabelText('Adresa')).not.toHaveTextContent('subcategory');
  });

  it('restores a direct subcategory link and browser history while retaining other URL parameters', async () => {
    const user = userEvent.setup();
    renderCatalog('?category=Produkty&subcategory=materialy-zadarmo&utm_source=client');
    expect(productNames()).toEqual(['Bezplatný sprievodca']);
    await user.click(categoryLink('Prémiové príručky'));
    expect(screen.getByLabelText('Adresa')).toHaveTextContent('utm_source=client');
    await user.click(screen.getByRole('button', { name: 'Späť', exact: true }));
    expect(productNames()).toEqual(['Bezplatný sprievodca']);
    expect(categoryLink('Materiály zadarmo')).toHaveAttribute('aria-current', 'page');
  });

  it('combines search with the selected subcategory and explains empty results', async () => {
    const user = userEvent.setup();
    renderCatalog('?category=Produkty&subcategory=premiove-prirucky');
    const search = screen.getByRole('textbox');
    await user.type(search, 'loptička');
    expect(productNames()).toEqual(['Príručka a loptička']);
    await user.clear(search);
    await user.type(search, 'Bezplatný');
    expect(productNames()).toEqual([]);
    expect(screen.getByText('Žiadne produkty nespĺňajú vaše kritériá vyhľadávania')).toBeInTheDocument();
  });

  it('clears the subcategory when moving to articles and safely handles unknown subcategories', async () => {
    const user = userEvent.setup();
    renderCatalog('?category=Produkty&subcategory=unknown');
    expect(productNames()).toHaveLength(4);
    expect(categoryLink('Všetky produkty')).toHaveAttribute('aria-current', 'page');
    await user.click(categoryLink('Materiály zadarmo'));
    await user.click(await screen.findByRole('button', { name: 'Strava', exact: true }));
    expect(screen.getByLabelText('Adresa')).not.toHaveTextContent('subcategory');
    expect(screen.queryByRole('navigation', { name: 'Podkategórie produktov' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Produkty', exact: true }));
    expect(productNames()).toHaveLength(4);
  });
});
