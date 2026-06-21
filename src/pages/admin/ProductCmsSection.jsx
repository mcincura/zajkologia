import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';
import ProductRichContentEditor from './ProductRichContentEditor';
import { normalizeRichProductContent } from './productRichContentUtils';

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

const normalizeSwatches = (swatches) => {
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

const isHexColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || '').trim());

const colorInputValue = (value) => (isHexColor(value) ? value : '#ffffff');

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
  pageTheme: {
    accent: '',
    accentStrong: '',
    tint: '',
    surface: '',
    glow: '',
  },
  productPage: {
    lead: '',
    galleryImages: [],
    galleryImagesByCountry: {},
    trustBadges: [],
    purchaseHighlights: [],
    contentTitle: '',
    detailSections: [],
    closingTitle: '',
    closingText: '',
    closingNote: '',
  },
  saleLabel: '',
  saleDescription: '',
  preorderDeal: {
    anchorLabel: '',
    currentLabel: '',
    savingsLabel: '',
    limitLabel: '',
    limitDetail: '',
  },
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

const helperTextStyle = {
  fontSize: '0.78rem',
  color: '#7a6e66',
};

const sectionCardStyle = {
  border: '1px solid #eee',
  borderRadius: '10px',
  padding: '1rem',
  background: '#fafafa',
};

const ProductCmsSection = () => {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rebuildBusy, setRebuildBusy] = useState(false);
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

  const updateVariantSwatch = (variantIndex, swatchIndex, value) => {
    const variant = selectedProduct?.variants?.[variantIndex];
    if (!variant) return;
    const swatches = normalizeSwatches(variant.swatches);
    swatches[swatchIndex] = value;
    updateVariant(variantIndex, { swatches: normalizeSwatches(swatches) });
  };

  const addVariantSwatch = (variantIndex) => {
    const variant = selectedProduct?.variants?.[variantIndex];
    if (!variant) return;
    updateVariant(variantIndex, {
      swatches: [...normalizeSwatches(variant.swatches), '#ffffff'],
    });
  };

  const removeVariantSwatch = (variantIndex, swatchIndex) => {
    const variant = selectedProduct?.variants?.[variantIndex];
    if (!variant) return;
    updateVariant(variantIndex, {
      swatches: normalizeSwatches(variant.swatches).filter((_, index) => index !== swatchIndex),
    });
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

    const richContent = normalizeRichProductContent(selectedProduct);
    const payload = {
      ...selectedProduct,
      slug: selectedProduct.slug || slugify(selectedProduct.name),
      featureList: richContent.featureList,
      pageTheme: richContent.pageTheme,
      productPage: richContent.productPage,
      shippingCountries: selectedProduct.productType === 'physical'
        ? selectedProduct.shippingCountries || []
        : [],
      preorderDeal: normalizePreorderDeal(selectedProduct.preorderDeal),
      fulfillmentType:
        selectedProduct.productType === 'physical'
          ? selectedProduct.fulfillmentType || 'physical_preorder'
          : selectedProduct.fulfillmentType || 'pdf_email',
      variants: selectedProduct.productType === 'physical'
        ? (selectedProduct.variants || []).map((variant) => ({
            ...variant,
            swatches: normalizeSwatches(variant.swatches),
          }))
        : [],
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
      setStatus(
        savedProduct.status === 'published'
          ? 'Product saved. Public rebuild will be requested automatically when rebuild automation is enabled.'
          : 'Product saved.'
      );
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const rebuildPublicSite = async () => {
    if (!selectedProduct) return;

    setRebuildBusy(true);
    setStatus('');
    try {
      const data = await apiFetch('/api/frontend-rebuild', {
        method: 'POST',
        body: JSON.stringify({
          reason: 'manual_product_rebuild',
          slug: selectedProduct.slug || '',
        }),
      });

      if (data?.rebuild?.dispatched) {
        setStatus('Public site rebuild requested.');
      } else if (data?.rebuild?.skipped) {
        setStatus('Public site rebuild skipped because rebuild automation is disabled.');
      } else {
        setStatus('Public site rebuild request queued.');
      }
    } catch (err) {
      setStatus(`Public site rebuild failed: ${err.message}`);
    } finally {
      setRebuildBusy(false);
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
      setStatus('Product archived. Public rebuild will be requested automatically when rebuild automation is enabled.');
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
              onClick={rebuildPublicSite}
              disabled={rebuildBusy || !selectedProduct}
              style={{ background: 'white', color: '#55463d', border: '1px solid #ddd', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 800 }}
            >
              {rebuildBusy ? 'Requesting…' : 'Rebuild public site'}
            </button>
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
	                {!selectedProduct.stripePriceId && !selectedProduct.stripePriceEnv && (
	                  <span style={helperTextStyle}>Checkout will not work for this product until a Stripe Price is configured.</span>
	                )}
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

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Sort order</span>
	                <input
	                  type="number"
	                  value={selectedProduct.sortOrder ?? 0}
	                  onChange={(e) => updateSelected({ sortOrder: Number(e.target.value) || 0 })}
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

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Sale label</span>
	                <input
	                  value={selectedProduct.saleLabel || ''}
	                  onChange={(e) => updateSelected({ saleLabel: e.target.value })}
	                  placeholder="-38 %"
	                  style={inputStyle}
	                />
	              </label>

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Sale description</span>
	                <input
	                  value={selectedProduct.saleDescription || ''}
	                  onChange={(e) => updateSelected({ saleDescription: e.target.value })}
	                  placeholder="Predobjednávková cena"
	                  style={inputStyle}
	                />
	              </label>

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Preorder note badge</span>
	                <input
	                  value={selectedProduct.preorderNote || ''}
	                  onChange={(e) => updateSelected({ preorderNote: e.target.value })}
	                  placeholder="Limitovaná predobjednávka"
	                  style={inputStyle}
	                />
	              </label>

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Stock note</span>
	                <input
	                  value={selectedProduct.stockNote || ''}
	                  onChange={(e) => updateSelected({ stockNote: e.target.value })}
	                  placeholder="Limitovaná dostupnosť"
	                  style={inputStyle}
	                />
	              </label>

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Shipping note</span>
	                <input
	                  value={selectedProduct.shippingNote || ''}
	                  onChange={(e) => updateSelected({ shippingNote: e.target.value })}
	                  placeholder="Doprava CZ/SK + 1 €"
	                  style={inputStyle}
	                />
	              </label>

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Purchase button label</span>
	                <input
	                  value={selectedProduct.purchaseLabel || ''}
	                  onChange={(e) => updateSelected({ purchaseLabel: e.target.value })}
	                  placeholder="Kúpiť teraz"
	                  style={inputStyle}
	                />
	              </label>

	              <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: '0.55rem' }}>
	                <input
	                  type="checkbox"
	                  checked={Boolean(selectedProduct.hideStatusBadges)}
	                  onChange={(e) => updateSelected({ hideStatusBadges: e.target.checked })}
	                  style={{ width: '18px', height: '18px' }}
	                />
	                <span style={labelTextStyle}>Hide status badges on product detail</span>
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

	            <div style={sectionCardStyle}>
	              <h3 style={{ margin: '0 0 0.75rem' }}>Preorder / sale deal block</h3>
	              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
	                <label style={labelStyle}>
	                  <span style={labelTextStyle}>Anchor price label</span>
	                  <input
	                    value={selectedProduct.preorderDeal?.anchorLabel || ''}
	                    onChange={(e) => updateSelected({
	                      preorderDeal: {
	                        ...(selectedProduct.preorderDeal || {}),
	                        anchorLabel: e.target.value,
	                      },
	                    })}
	                    placeholder="Bežná cena po predobjednávke"
	                    style={inputStyle}
	                  />
	                </label>
	                <label style={labelStyle}>
	                  <span style={labelTextStyle}>Current price label</span>
	                  <input
	                    value={selectedProduct.preorderDeal?.currentLabel || ''}
	                    onChange={(e) => updateSelected({
	                      preorderDeal: {
	                        ...(selectedProduct.preorderDeal || {}),
	                        currentLabel: e.target.value,
	                      },
	                    })}
	                    placeholder="Predobjednávka teraz"
	                    style={inputStyle}
	                  />
	                </label>
	                <label style={labelStyle}>
	                  <span style={labelTextStyle}>Savings label</span>
	                  <input
	                    value={selectedProduct.preorderDeal?.savingsLabel || ''}
	                    onChange={(e) => updateSelected({
	                      preorderDeal: {
	                        ...(selectedProduct.preorderDeal || {}),
	                        savingsLabel: e.target.value,
	                      },
	                    })}
	                    placeholder="Ušetríš 5 €"
	                    style={inputStyle}
	                  />
	                </label>
	                <label style={labelStyle}>
	                  <span style={labelTextStyle}>Limit label</span>
	                  <input
	                    value={selectedProduct.preorderDeal?.limitLabel || ''}
	                    onChange={(e) => updateSelected({
	                      preorderDeal: {
	                        ...(selectedProduct.preorderDeal || {}),
	                        limitLabel: e.target.value,
	                      },
	                    })}
	                    placeholder="Limit"
	                    style={inputStyle}
	                  />
	                </label>
	                <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
	                  <span style={labelTextStyle}>Limit detail</span>
	                  <input
	                    value={selectedProduct.preorderDeal?.limitDetail || ''}
	                    onChange={(e) => updateSelected({
	                      preorderDeal: {
	                        ...(selectedProduct.preorderDeal || {}),
	                        limitDetail: e.target.value,
	                      },
	                    })}
	                    placeholder="Iba do vypredania skladových kusov"
	                    style={inputStyle}
	                  />
	                </label>
	              </div>
	            </div>

            <ProductRichContentEditor
              product={selectedProduct}
              onChange={updateSelected}
            />

	            {selectedProduct.productType === 'physical' && (
	              <div style={sectionCardStyle}>
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
	                    <div key={`${variant.code}-${index}`} style={{ display: 'grid', gap: '0.75rem', background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem' }}>
	                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 100px 100px auto', gap: '0.5rem', alignItems: 'end' }}>
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

	                      <div>
	                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.45rem' }}>
	                          <span style={labelTextStyle}>Swatches</span>
	                          <button
	                            type="button"
	                            onClick={() => addVariantSwatch(index)}
	                            style={{ background: 'white', border: '1px solid #ddd', color: '#55463d', padding: '0.3rem 0.5rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}
	                          >
	                            Add swatch
	                          </button>
	                        </div>
	                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
	                          {normalizeSwatches(variant.swatches).map((swatch, swatchIndex) => (
	                            <div key={`${variant.code}-${swatch}-${swatchIndex}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', border: '1px solid #eee', borderRadius: '8px', padding: '0.35rem', background: '#fafafa' }}>
	                              <input
	                                type="color"
	                                value={colorInputValue(swatch)}
	                                onChange={(e) => updateVariantSwatch(index, swatchIndex, e.target.value)}
	                                aria-label={`${variant.name || 'Variant'} swatch ${swatchIndex + 1}`}
	                                style={{ width: '34px', height: '34px', padding: 0, border: '1px solid #ddd', borderRadius: '6px' }}
	                              />
	                              <input
	                                value={swatch}
	                                onChange={(e) => updateVariantSwatch(index, swatchIndex, e.target.value)}
	                                style={{ ...inputStyle, width: '96px', padding: '0.45rem 0.5rem' }}
	                              />
	                              <button
	                                type="button"
	                                onClick={() => removeVariantSwatch(index, swatchIndex)}
	                                style={{ background: '#fff0f0', color: '#a40000', padding: '0.42rem 0.5rem', borderRadius: '6px', fontWeight: 800 }}
	                              >
	                                Remove
	                              </button>
	                            </div>
	                          ))}
	                          {!normalizeSwatches(variant.swatches).length && (
	                            <span style={helperTextStyle}>No swatches yet.</span>
	                          )}
	                        </div>
	                      </div>
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
