import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';

const slugify = (value) => {
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

const parseEuroToMinor = (value) => {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
};

const formatMinorInput = (value) => {
  if (value == null || value === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return (amount / 100).toFixed(2);
};

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const joinList = (value) => (Array.isArray(value) ? value.join(', ') : '');

const createEmptyProduct = () => ({
  id: -Date.now(),
  slug: '',
  name: '',
  shortDescription: '',
  description: '',
  productType: 'digital',
  fulfillmentType: 'pdf_email',
  status: 'draft',
  sortOrder: 100,
  currency: 'eur',
  unitAmount: null,
  originalUnitAmount: null,
  shippingAmount: null,
  shippingCountries: [],
  maxQuantity: 1,
  preorderBatch: '',
  checkoutProductName: '',
  checkoutDescription: '',
  stripeProductId: '',
  stripePriceId: '',
  stripePriceEnv: '',
  emailSubject: '',
  emailAttachments: [],
  image: '',
  heroImage: '',
  languages: [],
  deliveryNote: '',
  featureList: [],
  saleLabel: '',
  saleDescription: '',
  shippingNote: '',
  stockNote: '',
  preorderNote: '',
  purchaseLabel: '',
  hideStatusBadges: false,
  isMock: false,
  variants: [],
});

const inputStyle = {
  padding: '0.6rem 0.75rem',
  border: '1px solid #e5e1dc',
  borderRadius: '8px',
  width: '100%',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
};

const labelTextStyle = {
  fontSize: '0.82rem',
  color: '#66584f',
  fontWeight: 800,
};

const ProductCmsSection = () => {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) || null,
    [products, selectedId]
  );

  const loadProducts = async () => {
    setLoading(true);
    setStatus('');
    try {
      const data = await apiFetch('/api/products/admin');
      const loadedProducts = data?.products || [];
      setProducts(loadedProducts);
      setSelectedId((current) =>
        loadedProducts.some((product) => product.id === current)
          ? current
          : loadedProducts[0]?.id ?? null
      );
    } catch (err) {
      setProducts([]);
      setStatus(`Product load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const updateSelected = (patch) => {
    if (!selectedProduct) return;
    setProducts((current) =>
      current.map((product) =>
        product.id === selectedProduct.id ? { ...product, ...patch } : product
      )
    );
  };

  const updateVariant = (index, patch) => {
    const variants = [...(selectedProduct?.variants || [])];
    variants[index] = { ...variants[index], ...patch };
    updateSelected({ variants });
  };

  const createProduct = () => {
    const product = createEmptyProduct();
    setProducts((current) => [product, ...current]);
    setSelectedId(product.id);
    setStatus('New product draft. Save it to create it in the CMS.');
  };

  const saveProduct = async () => {
    if (!selectedProduct) return;
    if (!selectedProduct.name?.trim()) {
      setStatus('Product name is required.');
      return;
    }

    const payload = {
      ...selectedProduct,
      slug: selectedProduct.slug || slugify(selectedProduct.name),
      shippingCountries: selectedProduct.productType === 'physical'
        ? selectedProduct.shippingCountries || []
        : [],
      fulfillmentType:
        selectedProduct.productType === 'physical'
          ? selectedProduct.fulfillmentType || 'physical_preorder'
          : selectedProduct.fulfillmentType || 'pdf_email',
      variants: selectedProduct.productType === 'physical' ? selectedProduct.variants || [] : [],
    };

    setBusy(true);
    setStatus('');
    try {
      const saved = selectedProduct.id < 0
        ? await apiFetch('/api/products/admin', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
        : await apiFetch(`/api/products/admin/${selectedProduct.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          });

      const savedProduct = saved.product;
      setProducts((current) => [
        savedProduct,
        ...current.filter((product) => product.id !== selectedProduct.id && product.id !== savedProduct.id),
      ]);
      setSelectedId(savedProduct.id);
      setStatus('Product saved.');
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const archiveProduct = async () => {
    if (!selectedProduct || selectedProduct.id < 0) return;
    if (!window.confirm(`Archive "${selectedProduct.name}"?`)) return;

    setBusy(true);
    setStatus('');
    try {
      await apiFetch(`/api/products/admin/${selectedProduct.id}`, { method: 'DELETE' });
      await loadProducts();
      setStatus('Product archived.');
    } catch (err) {
      setStatus(`Archive failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const addVariant = () => {
    const variants = selectedProduct?.variants || [];
    updateSelected({
      variants: [
        ...variants,
        {
          code: `variant_${variants.length + 1}`,
          name: '',
          image: '',
          swatches: [],
          initialQuantity: 0,
          sellableQuantity: 0,
          isActive: true,
          sortOrder: (variants.length + 1) * 10,
        },
      ],
    });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem' }}>
      <aside style={{ border: '1px solid #eee', borderRadius: '10px', padding: '0.75rem', background: '#fafafa' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            onClick={createProduct}
            disabled={busy}
            style={{ background: 'var(--color-primary)', color: 'white', padding: '0.45rem 0.65rem', borderRadius: '6px', fontWeight: 800 }}
          >
            New
          </button>
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            style={{ background: 'white', color: '#55463d', border: '1px solid #ddd', padding: '0.45rem 0.65rem', borderRadius: '6px', fontWeight: 800 }}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => setSelectedId(product.id)}
              style={{
                textAlign: 'left',
                padding: '0.65rem',
                borderRadius: '8px',
                border: '1px solid #e5e1dc',
                background: product.id === selectedId ? '#fff7ed' : 'white',
              }}
            >
              <div style={{ fontWeight: 900 }}>{product.name || '(Untitled)'}</div>
              <div style={{ fontSize: '0.8rem', color: '#6f6259' }}>
                {product.slug || 'missing-slug'} · {product.status || 'draft'}
              </div>
            </button>
          ))}

          {!products.length && (
            <div style={{ fontSize: '0.9rem', color: '#777', background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem' }}>
              No CMS products yet.
            </div>
          )}
        </div>
      </aside>

      <section style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0 }}>Products</h2>
            <div style={{ fontSize: '0.88rem', color: '#666', marginTop: '0.2rem' }}>
              Editable catalog foundation. Stripe sync and coupons come in the next phases.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={saveProduct}
              disabled={busy || !selectedProduct}
              style={{ background: 'var(--color-dark)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 800 }}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            {selectedProduct?.id > 0 && (
              <button
                type="button"
                onClick={archiveProduct}
                disabled={busy}
                style={{ background: '#fff0f0', color: '#a40000', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 800 }}
              >
                Archive
              </button>
            )}
          </div>
        </div>

        {status && (
          <div style={{ marginBottom: '1rem', padding: '0.65rem 0.75rem', background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', color: '#444' }}>
            {status}
          </div>
        )}

        {!selectedProduct ? (
          <div style={{ color: '#777' }}>Select or create a product.</div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <label style={labelStyle}>
                <span style={labelTextStyle}>Name *</span>
                <input
                  value={selectedProduct.name || ''}
                  onChange={(e) => {
                    const name = e.target.value;
                    updateSelected({ name, slug: selectedProduct.slug || slugify(name) });
                  }}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Slug *</span>
                <input
                  value={selectedProduct.slug || ''}
                  onChange={(e) => updateSelected({ slug: slugify(e.target.value) })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Status</span>
                <select
                  value={selectedProduct.status || 'draft'}
                  onChange={(e) => updateSelected({ status: e.target.value })}
                  style={inputStyle}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Type</span>
                <select
                  value={selectedProduct.productType || 'digital'}
                  onChange={(e) => {
                    const productType = e.target.value;
                    updateSelected({
                      productType,
                      fulfillmentType: productType === 'physical' ? 'physical_preorder' : 'pdf_email',
                    });
                  }}
                  style={inputStyle}
                >
                  <option value="digital">Digital</option>
                  <option value="physical">Physical</option>
                </select>
              </label>

              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                <span style={labelTextStyle}>Short description</span>
                <input
                  value={selectedProduct.shortDescription || ''}
                  onChange={(e) => updateSelected({ shortDescription: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                <span style={labelTextStyle}>Description</span>
                <textarea
                  value={selectedProduct.description || ''}
                  onChange={(e) => updateSelected({ description: e.target.value })}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Image path</span>
                <input
                  value={selectedProduct.image || ''}
                  onChange={(e) => updateSelected({ image: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Hero image path</span>
                <input
                  value={selectedProduct.heroImage || ''}
                  onChange={(e) => updateSelected({ heroImage: e.target.value })}
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Current price EUR</span>
                <input
                  value={formatMinorInput(selectedProduct.unitAmount)}
                  onChange={(e) => updateSelected({ unitAmount: parseEuroToMinor(e.target.value) })}
                  placeholder="7.99"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Compare-at price EUR</span>
                <input
                  value={formatMinorInput(selectedProduct.originalUnitAmount)}
                  onChange={(e) => updateSelected({ originalUnitAmount: parseEuroToMinor(e.target.value) })}
                  placeholder="12.99"
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Stripe Price ID/env</span>
                <input
                  value={selectedProduct.stripePriceId || selectedProduct.stripePriceEnv || ''}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    updateSelected(value.startsWith('price_')
                      ? { stripePriceId: value, stripePriceEnv: '' }
                      : { stripePriceEnv: value, stripePriceId: '' });
                  }}
                  placeholder="price_... or STRIPE_PRICE_ID_..."
                  style={inputStyle}
                />
              </label>

              <label style={labelStyle}>
                <span style={labelTextStyle}>Languages</span>
                <input
                  value={joinList(selectedProduct.languages)}
                  onChange={(e) => updateSelected({ languages: splitList(e.target.value) })}
                  placeholder="sk, cs"
                  style={inputStyle}
                />
              </label>

              <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
                <span style={labelTextStyle}>Delivery note</span>
                <input
                  value={selectedProduct.deliveryNote || ''}
                  onChange={(e) => updateSelected({ deliveryNote: e.target.value })}
                  style={inputStyle}
                />
              </label>

              {selectedProduct.productType === 'physical' && (
                <>
                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Shipping EUR</span>
                    <input
                      value={formatMinorInput(selectedProduct.shippingAmount)}
                      onChange={(e) => updateSelected({ shippingAmount: parseEuroToMinor(e.target.value) })}
                      placeholder="1.00"
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Shipping countries</span>
                    <input
                      value={joinList(selectedProduct.shippingCountries)}
                      onChange={(e) => updateSelected({ shippingCountries: splitList(e.target.value).map((code) => code.toUpperCase()) })}
                      placeholder="SK, CZ"
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Preorder batch</span>
                    <input
                      value={selectedProduct.preorderBatch || ''}
                      onChange={(e) => updateSelected({ preorderBatch: e.target.value })}
                      style={inputStyle}
                    />
                  </label>

                  <label style={labelStyle}>
                    <span style={labelTextStyle}>Max quantity</span>
                    <input
                      type="number"
                      min="1"
                      value={selectedProduct.maxQuantity || 1}
                      onChange={(e) => updateSelected({ maxQuantity: Number(e.target.value) || 1 })}
                      style={inputStyle}
                    />
                  </label>
                </>
              )}
            </div>

            {selectedProduct.productType === 'physical' && (
              <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1rem', background: '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h3 style={{ margin: 0 }}>Variants</h3>
                  <button
                    type="button"
                    onClick={addVariant}
                    style={{ background: 'white', border: '1px solid #ddd', color: '#55463d', padding: '0.4rem 0.65rem', borderRadius: '6px', fontWeight: 800 }}
                  >
                    Add variant
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {(selectedProduct.variants || []).map((variant, index) => (
                    <div key={`${variant.code}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 100px auto', gap: '0.5rem', alignItems: 'end', background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem' }}>
                      <label style={labelStyle}>
                        <span style={labelTextStyle}>Name</span>
                        <input
                          value={variant.name || ''}
                          onChange={(e) => {
                            const name = e.target.value;
                            updateVariant(index, { name, code: variant.code || slugify(name).replace(/-/g, '_') });
                          }}
                          style={inputStyle}
                        />
                      </label>
                      <label style={labelStyle}>
                        <span style={labelTextStyle}>Code</span>
                        <input
                          value={variant.code || ''}
                          onChange={(e) => updateVariant(index, { code: slugify(e.target.value).replace(/-/g, '_') })}
                          style={inputStyle}
                        />
                      </label>
                      <label style={labelStyle}>
                        <span style={labelTextStyle}>Image</span>
                        <input
                          value={variant.image || ''}
                          onChange={(e) => updateVariant(index, { image: e.target.value })}
                          style={inputStyle}
                        />
                      </label>
                      <label style={labelStyle}>
                        <span style={labelTextStyle}>Stock</span>
                        <input
                          type="number"
                          min="0"
                          value={variant.sellableQuantity ?? variant.initialQuantity ?? 0}
                          onChange={(e) => {
                            const quantity = Math.max(0, Number(e.target.value) || 0);
                            updateVariant(index, { sellableQuantity: quantity, initialQuantity: variant.initialQuantity ?? quantity });
                          }}
                          style={inputStyle}
                        />
                      </label>
                      <label style={labelStyle}>
                        <span style={labelTextStyle}>Active</span>
                        <select
                          value={variant.isActive === false ? 'false' : 'true'}
                          onChange={(e) => updateVariant(index, { isActive: e.target.value === 'true' })}
                          style={inputStyle}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => updateSelected({ variants: selectedProduct.variants.filter((_, itemIndex) => itemIndex !== index) })}
                        style={{ background: '#fff0f0', color: '#a40000', padding: '0.55rem', borderRadius: '6px', fontWeight: 800 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductCmsSection;
