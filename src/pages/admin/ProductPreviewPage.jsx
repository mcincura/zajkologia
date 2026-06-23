import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductDetailView } from '../ProductDetails';
import { useProduct } from '../../hooks/useProducts';
import { loadAdminProductPreview } from '../../utils/adminProductPreviewStorage';
import '../../styles/admin-product-preview.css';

const normalizeCountryCode = (countryCode) => (countryCode === 'CZ' ? 'CZ' : 'SK');

const ProductPreviewPage = () => {
  const [searchParams] = useSearchParams();
  const previewKey = searchParams.get('key') || '';
  const slug = searchParams.get('slug') || '';
  const urlCountryCode = normalizeCountryCode(searchParams.get('country'));
  const preview = useMemo(() => loadAdminProductPreview(previewKey), [previewKey]);
  const [countryCode, setCountryCode] = useState(preview?.countryCode || urlCountryCode);
  const shouldLoadSavedProduct = !preview?.product && Boolean(slug);
  const {
    product: savedProduct,
    loading: savedProductLoading,
  } = useProduct(slug, shouldLoadSavedProduct);
  const product = preview?.product || savedProduct;
  const snapshotLabel = preview
    ? preview.isDirty
      ? 'Draft snapshot from editor'
      : 'Saved CMS snapshot'
    : 'Saved product by slug';

  if (savedProductLoading) {
    return (
      <main className="admin-product-preview admin-product-preview--empty">
        <section className="admin-product-preview__empty-card">
          <h1>Loading preview...</h1>
          <p>Fetching the saved product snapshot.</p>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="admin-product-preview admin-product-preview--empty">
        <section className="admin-product-preview__empty-card">
          <h1>Preview unavailable</h1>
          <p>Open a fresh product preview from the admin panel.</p>
          <Link to="/admin/products">Back to products</Link>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-product-preview">
      <header className="admin-product-preview__bar">
        <div>
          <strong>Admin preview</strong>
          <span>{snapshotLabel}</span>
        </div>
        <div className="admin-product-preview__controls">
          <div className="admin-product-preview__language" aria-label="Preview language">
            {['SK', 'CZ'].map((option) => (
              <button
                key={option}
                type="button"
                className={countryCode === option ? 'is-active' : ''}
                onClick={() => setCountryCode(option)}
                aria-pressed={countryCode === option}
              >
                {option}
              </button>
            ))}
          </div>
          <Link to="/admin/products" className="admin-product-preview__admin-link">
            Back to admin
          </Link>
        </div>
      </header>

      <ProductDetailView
        product={product}
        relatedProducts={[]}
        mode="admin-preview"
        countryCodeOverride={countryCode === 'CZ' ? 'CZ' : ''}
        backTo="/admin/products"
      />
    </div>
  );
};

export default ProductPreviewPage;
