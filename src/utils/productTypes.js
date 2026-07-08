export const PRODUCT_TYPE = {
  DIGITAL: 'digital',
  PHYSICAL: 'physical',
  MIXED: 'mixed',
};

export const isMixedProduct = (product = {}) =>
  product?.productType === PRODUCT_TYPE.MIXED;

export const hasDigitalDelivery = (product = {}) => {
  if (!product) return false;
  return !product.productType ||
    product.productType === PRODUCT_TYPE.DIGITAL ||
    isMixedProduct(product);
};

export const hasPhysicalDelivery = (product = {}) => {
  if (!product) return false;
  return product.productType === PRODUCT_TYPE.PHYSICAL ||
    isMixedProduct(product);
};

export const requiresVariantSelection = hasPhysicalDelivery;

export const getProductTypeLabel = (product = {}) => {
  if (!product) return 'Produkt';
  if (isMixedProduct(product)) return 'Digitálny PDF + fyzický produkt';
  if (hasPhysicalDelivery(product)) return 'Fyzický produkt';
  return 'Digitálny PDF produkt';
};
