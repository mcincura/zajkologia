export const PRODUCT_PAGE_TEMPLATE = {
  DIGITAL: 'digital',
  PHYSICAL_PREORDER: 'physical_preorder',
  PHYSICAL: 'physical',
};

export const PRODUCT_PAGE_TEMPLATE_OPTIONS = [
  {
    value: '',
    label: 'Auto by product type',
    description: 'Uses digital for PDF products, preorder for physical preorders, and physical for normal shipped products.',
  },
  {
    value: PRODUCT_PAGE_TEMPLATE.DIGITAL,
    label: 'Generic digital product',
    description: 'PDF/download-style product page with delivery and content-focused defaults.',
  },
  {
    value: PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER,
    label: 'Physical preorder',
    description: 'Physical product page with preorder CTA, deal block, variants, stock, and preorder info.',
  },
  {
    value: PRODUCT_PAGE_TEMPLATE.PHYSICAL,
    label: 'Physical product',
    description: 'Normal physical product page with buy CTA, variants, stock, and shipping info.',
  },
];

const VALID_TEMPLATE_VALUES = new Set(Object.values(PRODUCT_PAGE_TEMPLATE));

export const normalizeProductPageTemplate = (value) => {
  const template = String(value || '').trim();
  return VALID_TEMPLATE_VALUES.has(template) ? template : '';
};

export const inferProductPageTemplate = (product = {}) => {
  const explicitTemplate = normalizeProductPageTemplate(product.productPage?.template);
  if (explicitTemplate) return explicitTemplate;

  if (product.productType !== 'physical') return PRODUCT_PAGE_TEMPLATE.DIGITAL;
  if (product.fulfillmentType === 'physical') return PRODUCT_PAGE_TEMPLATE.PHYSICAL;
  return PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER;
};

export const isPhysicalTemplate = (template) =>
  template === PRODUCT_PAGE_TEMPLATE.PHYSICAL ||
  template === PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER;

export const isPreorderTemplate = (template) =>
  template === PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER;
