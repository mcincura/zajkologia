import { PRODUCT_PAGE_TEMPLATE } from '../../utils/productTemplates';
import { hasDigitalDelivery, hasPhysicalDelivery } from '../../utils/productTypes';
import { normalizeRichProductContent } from './productRichContentUtils';

export const slugify = (value) => {
  return (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

export const normalizeSwatches = (swatches) => {
  if (!Array.isArray(swatches)) return [];
  return swatches.map((swatch) => String(swatch || '').trim()).filter(Boolean);
};

const normalizePreorderDeal = (deal) => {
  if (!deal || typeof deal !== 'object') return null;

  const normalized = {
    anchorLabel: String(deal.anchorLabel || '').trim(),
    currentLabel: String(deal.currentLabel || '').trim(),
    savingsLabel: String(deal.savingsLabel || '').trim(),
    limitLabel: String(deal.limitLabel || '').trim(),
    limitDetail: String(deal.limitDetail || '').trim(),
  };

  return Object.values(normalized).some(Boolean) ? normalized : null;
};

export const getFulfillmentTypeForProductType = (productType, currentFulfillmentType = '') => {
  if (!hasPhysicalDelivery({ productType })) return 'pdf_email';
  return currentFulfillmentType === 'physical' ? 'physical' : 'physical_preorder';
};

export const getTemplateForFulfillmentType = (productType, fulfillmentType) => {
  if (!hasPhysicalDelivery({ productType })) return PRODUCT_PAGE_TEMPLATE.DIGITAL;
  return fulfillmentType === 'physical'
    ? PRODUCT_PAGE_TEMPLATE.PHYSICAL
    : PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER;
};

export const buildProductPayload = (product) => {
  const richContent = normalizeRichProductContent(product);
  const isDigitalCapable = hasDigitalDelivery(product);
  const isPhysicalCapable = hasPhysicalDelivery(product);
  const fulfillmentType = getFulfillmentTypeForProductType(
    product.productType,
    product.fulfillmentType
  );

  return {
    ...product,
    slug: product.slug || slugify(product.name),
    featureList: richContent.featureList,
    pageTheme: richContent.pageTheme,
    productPage: richContent.productPage,
    shippingCountries: isPhysicalCapable
      ? product.shippingCountries || []
      : [],
    preorderDeal: normalizePreorderDeal(product.preorderDeal),
    fulfillmentType,
    emailAttachments: isDigitalCapable ? product.emailAttachments || [] : [],
    variants: isPhysicalCapable
      ? (product.variants || []).map((variant) => ({
          ...variant,
          swatches: normalizeSwatches(variant.swatches),
        }))
      : [],
  };
};
