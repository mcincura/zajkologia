import { useEffect, useMemo, useState } from 'react';
import { loadProduct, loadProducts } from '../api/client';
import { products as fallbackProducts } from '../data/products';
import { mapApiProductToProduct, mapProductCollection } from '../utils/productMappers';

export const useProducts = (enabled = true) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!enabled) {
        setProducts([]);
        setLoading(false);
        setError('');
        return;
      }

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
  }, [enabled]);

  return { products, loading, error };
};

export const useProduct = (slug, enabled = true) => {
  const fallback = useMemo(
    () => fallbackProducts.find((product) => product.slug === slug) || null,
    [slug]
  );
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!enabled || !slug) {
        setProduct(null);
        setLoading(false);
        setError('');
        return;
      }

      setLoading(true);
      setError('');
      try {
        const apiProduct = await loadProduct(slug);
        if (cancelled) return;
        setProduct(apiProduct ? mapApiProductToProduct(apiProduct) : null);
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
  }, [enabled, fallback, slug]);

  return { product, loading, error };
};
