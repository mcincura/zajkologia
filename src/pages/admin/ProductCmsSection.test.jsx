import { describe, expect, it } from 'vitest';
import {
  buildProductPayload,
  buildVariantAvailabilityPatch,
  getVariantAvailableQuantity,
} from './productCmsPayload';

describe('buildProductPayload', () => {
  it('preserves digital and physical fields for mixed bundles', () => {
    const payload = buildProductPayload({
      id: 8,
      slug: 'mixed-bundle',
      name: 'Mixed Bundle',
      productType: 'mixed',
      fulfillmentType: 'physical_preorder',
      status: 'draft',
      currency: 'eur',
      unitAmount: 1299,
      shippingAmount: 150,
      shippingCountries: ['SK', 'CZ'],
      emailAttachments: [{
        filename: 'Mixed bundle guide.pdf',
        assetPaths: ['uploaded:pdfs/mixed/sk/guide.pdf'],
        languageCode: 'sk',
      }],
      variants: [{
        code: 'bundle',
        name: 'Bundle',
        image: '/bundle.jpg',
        swatches: ['#ffffff', ''],
        sellableQuantity: 1,
        isActive: true,
      }],
      featureList: ['PDF aj fyzický produkt'],
      pageTheme: {},
      productPage: {},
      preorderDeal: null,
    });

    expect(payload.productType).toBe('mixed');
    expect(payload.fulfillmentType).toBe('physical_preorder');
    expect(payload.shippingCountries).toEqual(['SK', 'CZ']);
    expect(payload.emailAttachments).toHaveLength(1);
    expect(payload.variants).toEqual([
      expect.objectContaining({
        code: 'bundle',
        swatches: ['#ffffff'],
      }),
    ]);
  });

  it('saves available stock as sold plus reserved plus available capacity', () => {
    const variant = {
      initialQuantity: 3,
      sellableQuantity: 3,
      reservedQuantity: 1,
      soldQuantity: 2,
      availableQuantity: 0,
    };

    expect(getVariantAvailableQuantity(variant)).toBe(0);
    expect(buildVariantAvailabilityPatch(variant, '4')).toEqual({
      availableQuantity: 4,
      sellableQuantity: 7,
      initialQuantity: 3,
    });
  });
});
