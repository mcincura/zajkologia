import { useEffect, useMemo, useState } from 'react';
import { loadProduct, loadProducts } from '../api/client';
import { products as fallbackProducts } from '../data/products';

const mapColorVariants = (apiProduct) => {
  if (!apiProduct.variants?.length) return [];

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
};

const mapApiProduct = (apiProduct) => {
  if (!apiProduct?.slug) return null;

  const colorVariants = mapColorVariants(apiProduct);
  const totalAvailable = colorVariants?.reduce(
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

const mapProductCollection = (apiProducts) => {
  return apiProducts.map(mapApiProduct).filter(Boolean).sort(
    (a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)
  );
};

export const useProducts = () => {
  const [products, setProducts] = useState([]);
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
        setProducts(mapProductCollection(apiProducts));
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
  const [product, setProduct] = useState(null);
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
        setProduct(apiProduct ? mapApiProduct(apiProduct) : null);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'product_load_failed');
        setProduct(err?.status === 404 ? null : fallback);
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
