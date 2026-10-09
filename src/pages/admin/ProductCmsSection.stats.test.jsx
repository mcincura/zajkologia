import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, loadFreeProductDownloadStats, loadProductAssets } from '../../api/client';
import ProductCmsSection from './ProductCmsSection';

vi.mock('../../api/client', () => ({
  apiFetch: vi.fn(),
  loadFreeProductDownloadStats: vi.fn(),
  loadProductAssets: vi.fn(),
  deleteProductImageAsset: vi.fn(),
  deleteProductPdfAsset: vi.fn(),
  uploadProductImage: vi.fn(),
  uploadProductPdf: vi.fn(),
}));

vi.mock('./ProductRichContentEditor', () => ({ default: () => null }));
vi.mock('./ProductPromotionsSection', () => ({ default: () => null }));
vi.mock('./ProductMediaLibrary', () => ({ default: () => null }));

const freeProduct = {
  id: 7,
  slug: 'free-guide',
  name: 'Free guide',
  productType: 'digital',
  isFree: true,
  status: 'published',
  productPage: {},
  pageTheme: {},
  emailAttachments: [],
  variants: [],
  languages: ['sk', 'cs'],
};

const renderEditor = () => render(<ProductCmsSection />);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiFetch).mockResolvedValue({ products: [freeProduct] });
  vi.mocked(loadProductAssets).mockResolvedValue([]);
});

describe('ProductCmsSection free download statistics', () => {
  it('loads and displays total and per-file transfer counts', async () => {
    vi.mocked(loadFreeProductDownloadStats).mockResolvedValue({
      totalDownloads: 8,
      trackingStartedAt: '2026-05-01T00:00:00.000Z',
      files: [{
        index: 0,
        label: 'Slovak PDF',
        filename: 'guide-sk.pdf',
        languageCode: 'sk',
        downloadCount: 5,
        lastDownloadedAt: '2026-10-08T11:30:00.000Z',
      }, {
        index: null,
        label: 'Earlier Czech PDF',
        filename: 'old-guide-cz.pdf',
        languageCode: 'cs',
        downloadCount: 3,
        lastDownloadedAt: '2026-09-12T11:30:00.000Z',
      }],
    });

    renderEditor();

    expect(await screen.findByText('Total downloads:', { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/Counts are downloads\/transfers, not unique people/)).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Slovak PDF')).toBeInTheDocument();
    expect(screen.getByText(/5 downloads · Last downloaded:/)).toBeInTheDocument();
    expect(screen.getByText(/Previous file:/)).toBeInTheDocument();
    expect(loadFreeProductDownloadStats).toHaveBeenCalledWith(7);
  });

  it('reports unavailable statistics without blocking the product editor', async () => {
    vi.mocked(loadFreeProductDownloadStats).mockRejectedValue(new Error('stats unavailable'));

    renderEditor();

    expect(await screen.findByText(/Download statistics are unavailable right now/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Free guide')).toBeInTheDocument();
  });

  it('refreshes only statistics, preserving unsaved editor values after a failure', async () => {
    vi.mocked(loadFreeProductDownloadStats)
      .mockRejectedValueOnce(new Error('stats unavailable'))
      .mockResolvedValueOnce({ totalDownloads: 4, trackingStartedAt: '2026-05-01T00:00:00.000Z', files: [] });

    renderEditor();
    expect(await screen.findByText(/Download statistics are unavailable right now/)).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue('Free guide');
    await userEvent.type(nameInput, ' — edited');
    await userEvent.click(screen.getByRole('button', { name: 'Refresh statistics' }));

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Free guide — edited')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('does not show product A stats while the selected product B is loading', async () => {
    let resolveProductB;
    const productB = { ...freeProduct, id: 8, slug: 'free-guide-cz', name: 'Free guide CZ' };
    vi.mocked(apiFetch).mockResolvedValue({ products: [freeProduct, productB] });
    vi.mocked(loadFreeProductDownloadStats)
      .mockResolvedValueOnce({ totalDownloads: 3, trackingStartedAt: '2026-05-01T00:00:00.000Z', files: [] })
      .mockImplementationOnce(() => new Promise((resolve) => { resolveProductB = resolve; }));

    renderEditor();
    const statsRegion = await screen.findByRole('region', { name: 'Free PDF download statistics' });
    expect(await screen.findByText('3')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Free guide CZ/ }));

    expect(await screen.findByText('Loading download statistics…')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    resolveProductB({ totalDownloads: 9, trackingStartedAt: '2026-05-01T00:00:00.000Z', files: [] });
    await waitFor(() => expect(screen.getByText('9')).toBeInTheDocument());
    expect(statsRegion).toBeInTheDocument();
  });

  it('keeps historical statistics visible after a product is switched back to paid', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ products: [{ ...freeProduct, isFree: false }] });
    vi.mocked(loadFreeProductDownloadStats).mockResolvedValue({
      totalDownloads: 2,
      trackingStartedAt: '2026-05-01T00:00:00.000Z',
      files: [{
        index: null,
        label: 'Removed Czech PDF',
        filename: 'old-cz.pdf',
        languageCode: 'cs',
        downloadCount: 2,
        lastDownloadedAt: '2026-09-12T11:30:00.000Z',
      }],
    });

    renderEditor();

    await waitFor(() => expect(loadFreeProductDownloadStats).toHaveBeenCalledWith(7));
    expect(await screen.findByText('Free PDF download statistics')).toBeInTheDocument();
    expect(await screen.findByText(/Previous file: Removed Czech PDF/)).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders duplicate historical filenames without duplicate row keys', async () => {
    vi.mocked(loadFreeProductDownloadStats).mockResolvedValue({
      totalDownloads: 5,
      trackingStartedAt: '2026-05-01T00:00:00.000Z',
      files: [{
        fileKey: 'history-sk-1', index: null, label: 'Previous PDF', filename: 'old-guide.pdf',
        languageCode: 'sk', downloadCount: 2, lastDownloadedAt: null,
      }, {
        fileKey: 'history-sk-2', index: null, label: 'Previous PDF', filename: 'old-guide.pdf',
        languageCode: 'sk', downloadCount: 3, lastDownloadedAt: null,
      }],
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderEditor();

    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getAllByText(/Previous file: Previous PDF/)).toHaveLength(2);
    expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/same key/i);
    consoleError.mockRestore();
  });
});
