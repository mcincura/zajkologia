import { useEffect, useMemo, useState } from 'react';
import { loadProduct, loadProducts } from '../api/client';
import { products as fallbackProducts } from '../data/products';

const mergeColorVariants = ({ fallback, apiProduct }) => {
  if (!apiProduct.variants?.length) {
    return fallback?.colorVariants || [];
  }

  if (!fallback?.colorVariants?.length) {
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
    }));
  }

  const variantsByCode = new Map(apiProduct.variants.map((variant) => [variant.code, variant]));

  return fallback.colorVariants.map((variant) => {
    const apiVariant = variantsByCode.get(variant.code);
    if (!apiVariant) return variant;

    return {
      ...variant,
      available: apiVariant.availableQuantity ?? variant.available,
      sellableQuantity: apiVariant.sellableQuantity,
      reservedQuantity: apiVariant.reservedQuantity,
      soldQuantity: apiVariant.soldQuantity,
      isActive: apiVariant.isActive,
    };
  });
};

const mergeProduct = (apiProduct) => {
  const fallback = fallbackProducts.find((product) => product.slug === apiProduct.slug);
  const colorVariants = mergeColorVariants({ fallback, apiProduct });
  const totalAvailable = colorVariants?.reduce(
    (sum, variant) => sum + Number(variant.available || 0),
    0
  );
  const hasLiveProductData =
    apiProduct.stripePriceActive === true ||
    Array.isArray(apiProduct.variants) ||
    typeof apiProduct.amount === 'number';

  return {
    ...(fallback || {}),
    id: apiProduct.id ?? fallback?.id,
    slug: apiProduct.slug || fallback?.slug,
    name: apiProduct.name || fallback?.name,
    shortDescription: apiProduct.shortDescription || fallback?.shortDescription || '',
    description: apiProduct.description || fallback?.description || '',
    productType: apiProduct.productType || fallback?.productType,
    fulfillmentType: apiProduct.fulfillmentType || fallback?.fulfillmentType,
    price: apiProduct.price || fallback?.price || 'Cena v pokladni',
    originalPrice: apiProduct.originalPrice || fallback?.originalPrice,
    saleLabel: apiProduct.saleLabel || fallback?.saleLabel,
    saleDescription: apiProduct.saleDescription || fallback?.saleDescription,
    preorderDeal: apiProduct.preorderDeal || fallback?.preorderDeal,
    amount: apiProduct.amount,
    originalAmount: apiProduct.originalAmount,
    currency: apiProduct.currency,
    shippingAmount: apiProduct.shippingAmount,
    shippingPrice: apiProduct.shippingPrice,
    shippingNote: apiProduct.shippingNote || fallback?.shippingNote,
    preorderNote: apiProduct.preorderNote || fallback?.preorderNote,
    purchaseLabel: apiProduct.purchaseLabel || fallback?.purchaseLabel,
    deliveryNote: apiProduct.deliveryNote || fallback?.deliveryNote,
    sortOrder: apiProduct.sortOrder ?? fallback?.sortOrder ?? 0,
    image: apiProduct.image || fallback?.image || '/zajo.png',
    heroImage: apiProduct.heroImage || fallback?.heroImage || apiProduct.image || fallback?.image || '/zajo.png',
    languages: apiProduct.languages || fallback?.languages || [],
    featureList: apiProduct.featureList || fallback?.featureList || [],
    pageTheme: apiProduct.pageTheme || fallback?.pageTheme,
    productPage: apiProduct.productPage || fallback?.productPage,
    hideStatusBadges: apiProduct.hideStatusBadges ?? fallback?.hideStatusBadges,
    stripePriceActive: apiProduct.stripePriceActive,
    isMock: fallback?.productType === 'physical' ? !hasLiveProductData : Boolean(apiProduct.isMock || fallback?.isMock),
    url: apiProduct.url,
    colorVariants,
    stockNote:
      (apiProduct.productType || fallback?.productType) === 'physical' && Number.isFinite(totalAvailable)
        ? `${totalAvailable} ks celkovo`
        : apiProduct.stockNote || fallback?.stockNote,
  };
};

const mergeProductCollection = (apiProducts) => {
  const pricesBySlug = new Map(apiProducts.map((product) => [product.slug, product]));
  const fallbackSlugs = new Set(fallbackProducts.map((product) => product.slug));
  const mergedFallbackProducts = fallbackProducts
    .map((product) => mergeProduct(pricesBySlug.get(product.slug) || product))
    .filter(Boolean);
  const cmsOnlyProducts = apiProducts
    .filter((product) => !fallbackSlugs.has(product.slug))
    .map(mergeProduct)
    .filter(Boolean);

  return [...mergedFallbackProducts, ...cmsOnlyProducts].sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  );
};

export const useProducts = () => {
  const [products, setProducts] = useState(fallbackProducts);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const apiProducts = await loadProducts();
        if (cancelled) return;
        setProducts(mergeProductCollection(apiProducts));
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'products_load_failed');
        setProducts(fallbackProducts);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading, error };
};

export const useProduct = (slug) => {
  const fallback = useMemo(
    () => fallbackProducts.find((product) => product.slug === slug) || null,
    [slug]
  );
  const [product, setProduct] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) return;
      setLoading(true);
      setError('');
      try {
        const apiProduct = await loadProduct(slug);
        if (cancelled) return;
        setProduct(apiProduct ? mergeProduct(apiProduct) || fallback : fallback);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'product_load_failed');
        setProduct(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fallback, slug]);

  return { product, loading, error };
};
