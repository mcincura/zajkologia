import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ProductMediaLibrary from './ProductMediaLibrary';

const imageAsset = {
  id: 7,
  assetType: 'image',
  publicUrl: 'https://api.test/api/product-assets/images/rabbit/photo.jpg',
  originalFilename: 'photo.jpg',
  fileSize: 2048,
  role: 'asset',
};

const pdfAsset = {
  id: 9,
  assetType: 'digital_pdf',
  languageCode: 'sk',
  originalFilename: 'guide.pdf',
  customerFilename: 'Guide SK.pdf',
  fileSize: 4096,
  isActive: true,
};

const renderMediaLibrary = (overrides = {}) => {
  const props = {
    product: {
      id: 1,
      productType: 'physical',
      productPage: {
        galleryImages: [],
        galleryImagesByCountry: {},
      },
      variants: [],
    },
    assets: [imageAsset],
    assetsLoading: false,
    assetBusy: false,
    deliveryLanguages: ['sk'],
    languageLabels: { sk: 'Slovak PDF' },
    pdfUploadLanguage: 'sk',
    onPdfUploadLanguageChange: vi.fn(),
    onUploadImages: vi.fn(),
    onUploadPdf: vi.fn(),
    onReloadAssets: vi.fn(),
    onAssignImage: vi.fn(),
    onDeleteImageAsset: vi.fn(),
    onDeletePdfAsset: vi.fn(),
    onMoveGalleryImage: vi.fn(),
    onRemoveGalleryImage: vi.fn(),
    ...overrides,
  };

  render(<ProductMediaLibrary {...props} />);
  return props;
};

describe('ProductMediaLibrary', () => {
  it('lets admins delete an uploaded image asset', async () => {
    const props = renderMediaLibrary();

    await userEvent.click(screen.getByRole('button', { name: /delete uploaded file/i }));

    expect(props.onDeleteImageAsset).toHaveBeenCalledWith(imageAsset);
  });

  it('lets admins delete an uploaded PDF asset', async () => {
    const props = renderMediaLibrary({
      product: {
        id: 1,
        productType: 'digital',
        fulfillmentType: 'pdf_email',
        emailAttachments: [],
        productPage: {
          galleryImages: [],
          galleryImagesByCountry: {},
        },
        variants: [],
      },
      assets: [imageAsset, pdfAsset],
    });

    await userEvent.click(screen.getByRole('button', { name: /delete uploaded pdf/i }));

    expect(props.onDeletePdfAsset).toHaveBeenCalledWith(pdfAsset);
  });

  it('accepts multiple PDFs for one product bundle', async () => {
    const props = renderMediaLibrary({
      product: {
        id: 1,
        productType: 'digital',
        fulfillmentType: 'pdf_email',
        emailAttachments: [],
        productPage: { galleryImages: [], galleryImagesByCountry: {} },
        variants: [],
      },
      assets: [],
    });
    const files = [
      new File(['one'], 'one.pdf', { type: 'application/pdf' }),
      new File(['two'], 'two.pdf', { type: 'application/pdf' }),
      new File(['three'], 'three.pdf', { type: 'application/pdf' }),
      new File(['four'], 'four.pdf', { type: 'application/pdf' }),
    ];

    await userEvent.upload(screen.getByLabelText(/Add PDFs to this product/i), files);

    expect(props.onUploadPdf).toHaveBeenCalledWith(files);
    expect(screen.getByText(/Every uploaded file stays in the bundle/i)).toBeInTheDocument();
  });
});
