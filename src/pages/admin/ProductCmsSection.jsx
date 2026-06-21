import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiUrl } from '../../api/client';
import ProductRichContentEditor from './ProductRichContentEditor';
import ProductPromotionsSection from './ProductPromotionsSection';
import { normalizeRichProductContent } from './productRichContentUtils';
import { PRODUCT_PAGE_TEMPLATE } from '../../utils/productTemplates';

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

const normalizeLanguageCode = (value) => {
  const code = String(value || '').trim().toLowerCase();
  return code === 'cz' ? 'cs' : code;
};

const languageLabels = {
  sk: 'Slovak PDF',
  cs: 'Czech PDF',
};

const appendUnique = (items, item) => {
  const list = Array.isArray(items) ? items : [];
  return list.includes(item) ? list : [...list, item];
};

const getDeliveryLanguages = (product) => {
  const languages = new Set(['sk', 'cs']);
  (product?.languages || []).forEach((language) => {
    const normalized = normalizeLanguageCode(language);
    if (normalized) languages.add(normalized);
  });
  return Array.from(languages);
};

const getPdfFilename = (product, languageCode) => {
  const baseName = product?.name?.trim() || 'Zajkologia produkt';
  if (languageCode === 'cs') return `${baseName} - česká verzia.pdf`;
  if (languageCode === 'sk') return `${baseName} - slovenská verzia.pdf`;
  return `${baseName}.pdf`;
};

const getImageUploadTargets = (product) => {
  const targets = [
    { value: 'image', label: 'Main product image' },
    { value: 'hero', label: 'Hero image' },
    { value: 'gallery', label: 'Add to gallery' },
    { value: 'gallery:CZ', label: 'Add to CZ gallery' },
  ];

  if (product?.productType === 'physical') {
    (product.variants || []).forEach((variant, index) => {
      targets.push({
        value: `variant:${index}`,
        label: `Variant: ${variant.name || variant.code || index + 1}`,
      });
    });
  }

  return targets;
};

const applyUploadedImageUrl = (product, target, publicUrl) => {
  const productPage = product.productPage || {};

  if (target === 'image') {
    return {
      ...product,
      image: publicUrl,
      heroImage: product.heroImage || publicUrl,
    };
  }

  if (target === 'hero') {
    return {
      ...product,
      heroImage: publicUrl,
    };
  }

  if (target === 'gallery') {
    return {
      ...product,
      productPage: {
        ...productPage,
        galleryImages: appendUnique(productPage.galleryImages, publicUrl),
      },
    };
  }

  if (target === 'gallery:CZ') {
    return {
      ...product,
      productPage: {
        ...productPage,
        galleryImagesByCountry: {
          ...(productPage.galleryImagesByCountry || {}),
          CZ: appendUnique(productPage.galleryImagesByCountry?.CZ, publicUrl),
        },
      },
    };
  }

  if (target.startsWith('variant:')) {
    const index = Number.parseInt(target.split(':')[1], 10);
    const variants = [...(product.variants || [])];
    if (!Number.isNaN(index) && variants[index]) {
      variants[index] = { ...variants[index], image: publicUrl };
    }

    return {
      ...product,
      variants,
      productPage: {
        ...productPage,
        galleryImages: appendUnique(productPage.galleryImages, publicUrl),
      },
    };
  }

  return product;
};

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
    template: PRODUCT_PAGE_TEMPLATE.DIGITAL,
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

const uploadDropStyle = {
  border: '1px dashed #d8cec6',
  borderRadius: '8px',
  background: 'white',
  padding: '0.85rem',
  display: 'grid',
  gap: '0.35rem',
  cursor: 'pointer',
};

const ProductCmsSection = () => {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [assetBusy, setAssetBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [imageUploadTarget, setImageUploadTarget] = useState('image');
  const [pdfUploadLanguage, setPdfUploadLanguage] = useState('sk');

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) || null,
    [products, selectedId]
  );

  const imageUploadTargets = useMemo(
    () => getImageUploadTargets(selectedProduct),
    [selectedProduct]
  );

  const deliveryLanguages = useMemo(
    () => getDeliveryLanguages(selectedProduct),
    [selectedProduct]
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

  useEffect(() => {
    if (!imageUploadTargets.some((target) => target.value === imageUploadTarget)) {
      setImageUploadTarget(imageUploadTargets[0]?.value || 'image');
    }
  }, [imageUploadTarget, imageUploadTargets]);

  useEffect(() => {
    if (!deliveryLanguages.includes(pdfUploadLanguage)) {
      setPdfUploadLanguage(deliveryLanguages[0] || 'sk');
    }
  }, [deliveryLanguages, pdfUploadLanguage]);

  const updateSelected = (patch) => {
    if (!selectedProduct) return;
    setProducts((current) =>
      current.map((product) =>
        product.id === selectedProduct.id ? { ...product, ...patch } : product
      )
    );
  };

  const updateSelectedProductType = (productType) => {
    const nextTemplate =
      productType === 'physical'
        ? PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER
        : PRODUCT_PAGE_TEMPLATE.DIGITAL;

    updateSelected({
      productType,
      fulfillmentType: productType === 'physical' ? 'physical_preorder' : 'pdf_email',
      productPage: {
        ...(selectedProduct?.productPage || {}),
        template: nextTemplate,
      },
    });
  };

  const updateSelectedFulfillmentType = (fulfillmentType) => {
    updateSelected({
      fulfillmentType,
      productPage: {
        ...(selectedProduct?.productPage || {}),
        template: fulfillmentType === 'physical'
          ? PRODUCT_PAGE_TEMPLATE.PHYSICAL
          : PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER,
      },
    });
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

  const buildProductPayload = (product) => {
    const richContent = normalizeRichProductContent(product);
    const payload = {
      ...product,
      slug: product.slug || slugify(product.name),
      featureList: richContent.featureList,
      pageTheme: richContent.pageTheme,
      productPage: richContent.productPage,
      shippingCountries: product.productType === 'physical'
        ? product.shippingCountries || []
        : [],
      preorderDeal: normalizePreorderDeal(product.preorderDeal),
      fulfillmentType:
        product.productType === 'physical'
          ? product.fulfillmentType || 'physical_preorder'
          : product.fulfillmentType || 'pdf_email',
      variants: product.productType === 'physical'
        ? (product.variants || []).map((variant) => ({
            ...variant,
            swatches: normalizeSwatches(variant.swatches),
          }))
        : [],
    };

    return payload;
  };

  const persistProduct = async (product) => {
    const payload = buildProductPayload(product);
    const saved = product.id < 0
      ? await apiFetch('/api/products/admin', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      : await apiFetch(`/api/products/admin/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });

    const savedProduct = saved.product;
    setProducts((current) => [
      savedProduct,
      ...current.filter((item) => item.id !== product.id && item.id !== savedProduct.id),
    ]);
    setSelectedId(savedProduct.id);
    return savedProduct;
  };

  const uploadProductAsset = async ({ productId, endpoint, file, fields = {} }) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(fields).forEach(([key, value]) => {
      if (value != null && value !== '') formData.append(key, value);
    });

    const res = await fetch(apiUrl(`/api/products/admin/${productId}/assets/${endpoint}`), {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const err = new Error(data?.error || `http_${res.status}`);
      err.status = res.status;
      throw err;
    }

    return data;
  };

  const handleProductImageFile = async (file) => {
    if (!file || !selectedProduct) return;
    if (!selectedProduct.name?.trim()) {
      setStatus('Product name is required before uploading images.');
      return;
    }

    setAssetBusy(true);
    setStatus('');
    try {
      const productForUpload = selectedProduct.id < 0
        ? await persistProduct(selectedProduct)
        : selectedProduct;
      const data = await uploadProductAsset({
        productId: productForUpload.id,
        endpoint: 'image',
        file,
        fields: {
          role: imageUploadTarget.split(':')[0],
        },
      });
      const publicUrl = data?.asset?.publicUrl;
      if (!publicUrl) throw new Error('missing_uploaded_image_url');

      const updatedProduct = applyUploadedImageUrl(productForUpload, imageUploadTarget, publicUrl);
      await persistProduct(updatedProduct);
      setStatus('Image uploaded and product saved.');
    } catch (err) {
      setStatus(`Image upload failed: ${err.message}`);
    } finally {
      setAssetBusy(false);
    }
  };

  const handleDigitalPdfFile = async (file) => {
    if (!file || !selectedProduct) return;
    if (!selectedProduct.name?.trim()) {
      setStatus('Product name is required before uploading PDFs.');
      return;
    }

    setAssetBusy(true);
    setStatus('');
    try {
      const languageCode = normalizeLanguageCode(pdfUploadLanguage) || 'sk';
      const savedProduct = await persistProduct(selectedProduct);
      const data = await uploadProductAsset({
        productId: savedProduct.id,
        endpoint: 'pdf',
        file,
        fields: {
          languageCode,
          customerFilename: getPdfFilename(savedProduct, languageCode),
        },
      });
      if (data?.product) {
        setProducts((current) => [
          data.product,
          ...current.filter((item) => item.id !== savedProduct.id && item.id !== data.product.id),
        ]);
        setSelectedId(data.product.id);
      }
      setStatus(`${languageLabels[languageCode] || 'PDF'} uploaded and connected to paid email delivery.`);
    } catch (err) {
      setStatus(`PDF upload failed: ${err.message}`);
    } finally {
      setAssetBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!selectedProduct) return;
    if (!selectedProduct.name?.trim()) {
      setStatus('Product name is required.');
      return;
    }

    setBusy(true);
    setStatus('');
    try {
      const savedProduct = await persistProduct(selectedProduct);
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

  const syncStripeProduct = async () => {
    if (!selectedProduct) return;
    if (!selectedProduct.name?.trim()) {
      setStatus('Product name is required before Stripe sync.');
      return;
    }

    setSyncBusy(true);
    setStatus('');
    try {
      const savedProduct = await persistProduct(selectedProduct);
      const data = await apiFetch(`/api/products/admin/${savedProduct.id}/stripe-sync`, {
        method: 'POST',
      });
      const syncedProduct = data.product;
      setProducts((current) => [
        syncedProduct,
        ...current.filter((product) => product.id !== savedProduct.id && product.id !== syncedProduct.id),
      ]);
      setSelectedId(syncedProduct.id);
      const sync = data.sync || {};
      const details = [
        sync.adoptedEnvPrice ? 'adopted legacy env Price ID' : null,
        sync.createdPrice ? 'created new Stripe Price' : null,
        sync.previousStripePriceDeactivated ? 'deactivated replaced Stripe Price' : null,
      ].filter(Boolean).join('; ');
      setStatus(`Product saved and Stripe catalog synced${details ? ` (${details})` : ''}.`);
    } catch (err) {
      setStatus(`Stripe sync failed: ${err.message}`);
    } finally {
      setSyncBusy(false);
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
	            disabled={busy || assetBusy}
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
              Editable catalog with Stripe Product and Price sync.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
	              onClick={rebuildPublicSite}
	              disabled={rebuildBusy || syncBusy || assetBusy || !selectedProduct}
              style={{ background: 'white', color: '#55463d', border: '1px solid #ddd', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 800 }}
            >
              {rebuildBusy ? 'Requesting…' : 'Rebuild public site'}
            </button>
            <button
              type="button"
	              onClick={syncStripeProduct}
	              disabled={syncBusy || busy || assetBusy || !selectedProduct}
              style={{ background: 'white', color: '#55463d', border: '1px solid #ddd', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 800 }}
            >
              {syncBusy ? 'Syncing…' : 'Sync Stripe'}
            </button>
            <button
              type="button"
	              onClick={saveProduct}
	              disabled={busy || syncBusy || assetBusy || !selectedProduct}
              style={{ background: 'var(--color-dark)', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', fontWeight: 800 }}
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            {selectedProduct?.id > 0 && (
              <button
                type="button"
	                onClick={archiveProduct}
	                disabled={busy || syncBusy || assetBusy}
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
                  onChange={(e) => updateSelectedProductType(e.target.value)}
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

	              <div style={{ ...sectionCardStyle, gridColumn: '1 / -1' }}>
	                <h3 style={{ margin: '0 0 0.75rem' }}>Product uploads</h3>
	                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.75rem', alignItems: 'end' }}>
	                  <label style={labelStyle}>
	                    <span style={labelTextStyle}>Image destination</span>
	                    <select
	                      value={imageUploadTarget}
	                      onChange={(e) => setImageUploadTarget(e.target.value)}
	                      disabled={assetBusy}
	                      style={inputStyle}
	                    >
	                      {imageUploadTargets.map((target) => (
	                        <option key={target.value} value={target.value}>{target.label}</option>
	                      ))}
	                    </select>
	                  </label>
	                  <label
	                    style={{
	                      ...uploadDropStyle,
	                      opacity: assetBusy ? 0.65 : 1,
	                      cursor: assetBusy ? 'not-allowed' : 'pointer',
	                    }}
	                    onDragOver={(event) => event.preventDefault()}
	                    onDrop={(event) => {
	                      event.preventDefault();
	                      if (!assetBusy) handleProductImageFile(event.dataTransfer?.files?.[0]);
	                    }}
	                  >
	                    <span style={{ fontWeight: 900, color: '#55463d' }}>
	                      {assetBusy ? 'Uploading…' : 'Upload image'}
	                    </span>
	                    <span style={helperTextStyle}>JPG, PNG or WebP. The selected product field will be saved automatically.</span>
	                    <input
	                      type="file"
	                      accept="image/jpeg,image/png,image/webp"
	                      disabled={assetBusy || busy || syncBusy}
	                      onChange={(event) => {
	                        const file = event.target.files?.[0];
	                        event.target.value = '';
	                        handleProductImageFile(file);
	                      }}
	                      style={{ fontSize: '0.82rem' }}
	                    />
	                  </label>
	                </div>

	                {selectedProduct.productType === 'digital' && selectedProduct.fulfillmentType === 'pdf_email' && (
	                  <div style={{ borderTop: '1px solid #eee', marginTop: '0.85rem', paddingTop: '0.85rem' }}>
	                    <h4 style={{ margin: '0 0 0.65rem', fontSize: '0.95rem' }}>Digital PDF delivery</h4>
	                    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '0.75rem', alignItems: 'end' }}>
	                      <label style={labelStyle}>
	                        <span style={labelTextStyle}>PDF version</span>
	                        <select
	                          value={pdfUploadLanguage}
	                          onChange={(e) => setPdfUploadLanguage(e.target.value)}
	                          disabled={assetBusy}
	                          style={inputStyle}
	                        >
	                          {deliveryLanguages.map((languageCode) => (
	                            <option key={languageCode} value={languageCode}>
	                              {languageLabels[languageCode] || languageCode.toUpperCase()}
	                            </option>
	                          ))}
	                        </select>
	                      </label>
	                      <label
	                        style={{
	                          ...uploadDropStyle,
	                          opacity: assetBusy ? 0.65 : 1,
	                          cursor: assetBusy ? 'not-allowed' : 'pointer',
	                        }}
	                        onDragOver={(event) => event.preventDefault()}
	                        onDrop={(event) => {
	                          event.preventDefault();
	                          if (!assetBusy) handleDigitalPdfFile(event.dataTransfer?.files?.[0]);
	                        }}
	                      >
	                        <span style={{ fontWeight: 900, color: '#55463d' }}>
	                          {assetBusy ? 'Uploading…' : 'Upload delivery PDF'}
	                        </span>
	                        <span style={helperTextStyle}>This replaces the active paid email attachment for the selected language.</span>
	                        <input
	                          type="file"
	                          accept="application/pdf,.pdf"
	                          disabled={assetBusy || busy || syncBusy}
	                          onChange={(event) => {
	                            const file = event.target.files?.[0];
	                            event.target.value = '';
	                            handleDigitalPdfFile(file);
	                          }}
	                          style={{ fontSize: '0.82rem' }}
	                        />
	                      </label>
	                    </div>

	                    <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.35rem' }}>
	                      <span style={labelTextStyle}>Current email attachments</span>
	                      {(selectedProduct.emailAttachments || []).length ? (
	                        <ul style={{ margin: 0, paddingLeft: '1.1rem', color: '#55463d', fontSize: '0.86rem' }}>
	                          {(selectedProduct.emailAttachments || []).map((attachment, index) => (
	                            <li key={`${attachment.filename || 'attachment'}-${index}`}>
	                              {attachment.languageCode ? `${languageLabels[attachment.languageCode] || attachment.languageCode.toUpperCase()}: ` : ''}
	                              {attachment.filename || 'PDF attachment'}
	                            </li>
	                          ))}
	                        </ul>
	                      ) : (
	                        <span style={helperTextStyle}>No product PDF attachment is configured yet.</span>
	                      )}
	                    </div>
	                  </div>
	                )}
	              </div>

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
	                {!selectedProduct.stripePriceId && !selectedProduct.stripePriceEnv && selectedProduct.productType !== 'physical' && (
	                  <span style={helperTextStyle}>Checkout will not work for this product until a Stripe Price is configured.</span>
	                )}
	                {!selectedProduct.stripePriceId && !selectedProduct.stripePriceEnv && selectedProduct.productType === 'physical' && (
	                  <span style={helperTextStyle}>Sync Stripe to create catalog Product and Price IDs for this physical product.</span>
	                )}
	                {selectedProduct.stripePriceEnv && !selectedProduct.stripePriceId && (
	                  <span style={helperTextStyle}>Sync Stripe will adopt this legacy env Price ID and store the real Price ID in the CMS.</span>
	                )}
	              </label>

	              <label style={labelStyle}>
	                <span style={labelTextStyle}>Stripe Product ID</span>
	                <input
	                  value={selectedProduct.stripeProductId || ''}
	                  onChange={(e) => updateSelected({ stripeProductId: e.target.value.trim() })}
	                  placeholder="prod_..."
	                  style={inputStyle}
	                />
	                <span style={helperTextStyle}>Leave empty to create a new Stripe Product during sync.</span>
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
                    <span style={labelTextStyle}>Fulfillment</span>
                    <select
                      value={selectedProduct.fulfillmentType || 'physical_preorder'}
                      onChange={(e) => updateSelectedFulfillmentType(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="physical_preorder">Physical preorder</option>
                      <option value="physical">Physical product</option>
                    </select>
                    <span style={helperTextStyle}>
                      Preorder uses preorder page/checkout copy. Physical uses normal shipped-product copy.
                    </span>
                  </label>

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

            <ProductPromotionsSection
              selectedProduct={selectedProduct}
              products={products.filter((product) => product.id > 0)}
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
