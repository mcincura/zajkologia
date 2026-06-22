const formatCurrencyMinor = (value, currency = 'eur') => {
  if (value == null || value === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';

  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: String(currency || 'eur').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

const mapColorVariants = (apiProduct) => {
  if (!apiProduct?.variants?.length) return [];

  return apiProduct.variants.map((variant) => ({
    code: variant.code,
    name: variant.name,
    available: variant.availableQuantity ?? variant.sellableQuantity ?? 0,
    image: variant.image,
    swatches: variant.swatches || [],
    sellableQuantity: variant.sellableQuantity,
    reservedQuantity: variant.reservedQuantity,
    soldQuantity: variant.soldQuantity,
    isActive: variant.isActive,
    price: variant.price,
    amount: variant.amount,
    originalPrice: variant.originalPrice,
    originalAmount: variant.originalAmount,
    sale: variant.sale,
  }));
};

export const mapApiProductToProduct = (apiProduct) => {
  if (!apiProduct?.slug) return null;

  const colorVariants = mapColorVariants(apiProduct);
  const totalAvailable = colorVariants.reduce(
    (sum, variant) => sum + Number(variant.available || 0),
    0
  );
  const computedStockNote =
    apiProduct.productType === 'physical' && Number.isFinite(totalAvailable)
      ? `${totalAvailable} ks celkovo`
      : '';

  return {
    id: apiProduct.id ?? apiProduct.slug,
    slug: apiProduct.slug,
    name: apiProduct.name || 'Produkt',
    shortDescription: apiProduct.shortDescription || '',
    description: apiProduct.description || '',
    productType: apiProduct.productType || 'digital',
    fulfillmentType: apiProduct.fulfillmentType || 'pdf_email',
    status: apiProduct.status,
    isPublished: apiProduct.isPublished,
    price: apiProduct.price || 'Cena v pokladni',
    originalPrice: apiProduct.originalPrice,
    saleLabel: apiProduct.saleLabel,
    saleDescription: apiProduct.saleDescription,
    preorderDeal: apiProduct.preorderDeal,
    amount: apiProduct.amount,
    originalAmount: apiProduct.originalAmount,
    currency: apiProduct.currency,
    shippingAmount: apiProduct.shippingAmount,
    shippingPrice: apiProduct.shippingPrice,
    shippingNote: apiProduct.shippingNote,
    preorderNote: apiProduct.preorderNote,
    purchaseLabel: apiProduct.purchaseLabel,
    deliveryNote: apiProduct.deliveryNote,
    sortOrder: apiProduct.sortOrder ?? 0,
    image: apiProduct.image || '/zajo.png',
    heroImage: apiProduct.heroImage || apiProduct.image || '/zajo.png',
    languages: Array.isArray(apiProduct.languages) ? apiProduct.languages : [],
    featureList: Array.isArray(apiProduct.featureList) ? apiProduct.featureList : [],
    pageTheme: apiProduct.pageTheme,
    productPage: apiProduct.productPage,
    hideStatusBadges: apiProduct.hideStatusBadges,
    stripePriceActive: apiProduct.stripePriceActive,
    isMock: Boolean(apiProduct.isMock),
    url: apiProduct.url,
    colorVariants,
    stockNote: apiProduct.stockNote || computedStockNote,
  };
};

export const mapProductCollection = (apiProducts) =>
  apiProducts.map(mapApiProductToProduct).filter(Boolean).sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  );

export const mapAdminProductToPreviewProduct = (adminProduct) => {
  if (!adminProduct) return null;

  const currency = adminProduct.currency || 'eur';
  const colorVariants = (adminProduct.variants || []).map((variant) => ({
    code: variant.code,
    name: variant.name || variant.code || 'Variant',
    available: variant.availableQuantity ?? variant.sellableQuantity ?? variant.initialQuantity ?? 0,
    image: variant.image || adminProduct.image || adminProduct.heroImage || '/zajo.png',
    swatches: variant.swatches || [],
    sellableQuantity: variant.sellableQuantity,
    reservedQuantity: variant.reservedQuantity,
    soldQuantity: variant.soldQuantity,
    isActive: variant.isActive,
    price: variant.price || formatCurrencyMinor(variant.amount ?? adminProduct.unitAmount, currency),
    amount: variant.amount ?? adminProduct.unitAmount,
    originalPrice: variant.originalPrice || formatCurrencyMinor(variant.originalAmount ?? adminProduct.originalUnitAmount, currency),
    originalAmount: variant.originalAmount ?? adminProduct.originalUnitAmount,
    sale: variant.sale,
  }));

  const totalAvailable = colorVariants.reduce(
    (sum, variant) => sum + Number(variant.available || 0),
    0
  );

  return {
    id: adminProduct.id ?? adminProduct.slug ?? 'admin-preview',
    slug: adminProduct.slug || 'admin-preview',
    name: adminProduct.name || 'Untitled product',
    shortDescription: adminProduct.shortDescription || '',
    description: adminProduct.description || '',
    productType: adminProduct.productType || 'digital',
    fulfillmentType: adminProduct.fulfillmentType || 'pdf_email',
    status: adminProduct.status || 'draft',
    isPublished: adminProduct.status === 'published',
    price: formatCurrencyMinor(adminProduct.unitAmount, currency) || 'Cena v pokladni',
    originalPrice: formatCurrencyMinor(adminProduct.originalUnitAmount, currency),
    saleLabel: adminProduct.saleLabel || '',
    saleDescription: adminProduct.saleDescription || '',
    preorderDeal: adminProduct.preorderDeal,
    amount: adminProduct.unitAmount,
    originalAmount: adminProduct.originalUnitAmount,
    currency,
    shippingAmount: adminProduct.shippingAmount,
    shippingPrice: formatCurrencyMinor(adminProduct.shippingAmount, currency),
    shippingNote: adminProduct.shippingNote || '',
    preorderNote: adminProduct.preorderNote || '',
    purchaseLabel: adminProduct.purchaseLabel || '',
    deliveryNote: adminProduct.deliveryNote || '',
    sortOrder: adminProduct.sortOrder ?? 0,
    image: adminProduct.image || adminProduct.heroImage || '/zajo.png',
    heroImage: adminProduct.heroImage || adminProduct.image || '/zajo.png',
    languages: Array.isArray(adminProduct.languages) ? adminProduct.languages : [],
    featureList: Array.isArray(adminProduct.featureList) ? adminProduct.featureList : [],
    pageTheme: adminProduct.pageTheme,
    productPage: adminProduct.productPage,
    hideStatusBadges: adminProduct.hideStatusBadges,
    stripePriceActive: adminProduct.stripePriceActive,
    isMock: true,
    colorVariants,
    stockNote:
      adminProduct.stockNote ||
      (adminProduct.productType === 'physical' && Number.isFinite(totalAvailable)
        ? `${totalAvailable} ks celkovo`
        : ''),
  };
};
