import { useEffect, useMemo, useState } from 'react';
import { loadProduct, loadProducts } from '../api/client';
import { products as fallbackProducts } from '../data/products';

const mergeProduct = (apiProduct) => {
  const fallback = fallbackProducts.find((product) => product.slug === apiProduct.slug) || {};
  return {
    ...fallback,
    ...apiProduct,
    price: apiProduct.price || fallback.price || 'Cena v pokladni',
  };
};

const mergeProductCollection = (apiProducts) => {
  const mergedProducts = apiProducts.map(mergeProduct);
  const knownSlugs = new Set(mergedProducts.map((product) => product.slug));

  return [
    ...mergedProducts,
    ...fallbackProducts.filter((product) => !knownSlugs.has(product.slug)),
  ];
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
        setProduct(apiProduct ? mergeProduct(apiProduct) : fallback);
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
