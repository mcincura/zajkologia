import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import {
  apiFetch,
  deleteProductImageAsset,
  deleteProductPdfAsset,
  loadProductAssets,
  uploadProductImage,
  uploadProductPdf,
} from '../../api/client';
import ProductRichContentEditor from './ProductRichContentEditor';
import ProductPromotionsSection from './ProductPromotionsSection';
import ProductMediaLibrary from './ProductMediaLibrary';
import {
  buildVariantAvailabilityPatch,
  buildProductPayload,
  getVariantAvailableQuantity,
  getVariantReservedQuantity,
  getVariantSoldQuantity,
  getFulfillmentTypeForProductType,
  getTemplateForFulfillmentType,
  normalizeSwatches,
  slugify,
} from './productCmsPayload';
import { mapAdminProductToPreviewProduct } from '../../utils/productMappers';
import { saveAdminProductPreview } from '../../utils/adminProductPreviewStorage';
import { PRODUCT_PAGE_TEMPLATE } from '../../utils/productTemplates';
import {
  PRODUCT_TYPE,
  hasPhysicalDelivery,
  isMixedProduct,
} from '../../utils/productTypes';
import '../../styles/admin-products.css';

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

const moveListItem = (items, index, direction) => {
  const list = Array.isArray(items) ? [...items] : [];
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= list.length) return list;
  [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
  return list;
};

const applyGalleryImages = (product, countryCode, images) => {
  const productPage = product.productPage || {};

  if (countryCode === 'CZ') {
    return {
      ...product,
      productPage: {
        ...productPage,
        galleryImagesByCountry: {
          ...(productPage.galleryImagesByCountry || {}),
          CZ: images,
        },
      },
    };
  }

  return {
    ...product,
    productPage: {
      ...productPage,
      galleryImages: images,
    },
  };
};

const getGalleryImages = (product, countryCode) => {
  const productPage = product?.productPage || {};
  if (countryCode === 'CZ') return productPage.galleryImagesByCountry?.CZ || [];
  return productPage.galleryImages || [];
};

const applyAssignedImageUrl = (product, target, publicUrl) => {
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
    };
  }

  if (target.startsWith('handmade:')) {
    const index = Number.parseInt(target.split(':')[1], 10);
    const handmadeStory = productPage.handmadeStory || {};
    const items = [...(handmadeStory.items || [])];
    if (!Number.isNaN(index) && items[index]) {
      items[index] = { ...items[index], image: publicUrl };
    }

    return {
      ...product,
      productPage: {
        ...productPage,
        handmadeStory: {
          ...handmadeStory,
          items,
        },
      },
    };
  }

  return product;
};

const removeAssignedImageUrl = (product, publicUrl) => {
  if (!product || !publicUrl) return product;

  const productPage = product.productPage;
  const nextProductPage = productPage && typeof productPage === 'object'
    ? { ...productPage }
    : productPage;

  if (nextProductPage && Array.isArray(nextProductPage.galleryImages)) {
    nextProductPage.galleryImages = nextProductPage.galleryImages.filter((image) => image !== publicUrl);
  }

  if (
    nextProductPage?.galleryImagesByCountry &&
    typeof nextProductPage.galleryImagesByCountry === 'object'
  ) {
    nextProductPage.galleryImagesByCountry = Object.fromEntries(
      Object.entries(nextProductPage.galleryImagesByCountry).map(([countryCode, images]) => [
        countryCode,
        Array.isArray(images) ? images.filter((image) => image !== publicUrl) : images,
      ])
    );
  }

  if (nextProductPage?.handmadeStory?.items && Array.isArray(nextProductPage.handmadeStory.items)) {
    nextProductPage.handmadeStory = {
      ...nextProductPage.handmadeStory,
      items: nextProductPage.handmadeStory.items.map((item) =>
        item?.image === publicUrl ? { ...item, image: '' } : item
      ),
    };
  }

  return {
    ...product,
    image: product.image === publicUrl ? '' : product.image,
    heroImage: product.heroImage === publicUrl ? '' : product.heroImage,
    variants: (product.variants || []).map((variant) =>
      variant.image === publicUrl ? { ...variant, image: '' } : variant
    ),
    ...(nextProductPage ? { productPage: nextProductPage } : {}),
  };
};

const getProductSnapshot = (product) => JSON.stringify(product || null);

const createEmptyProduct = () => ({
  id: -Date.now(),
  slug: '',
  name: '',
  shortDescription: '',
  description: '',
  productType: PRODUCT_TYPE.DIGITAL,
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

const ProductCmsSection = () => {
  const [products, setProducts] = useState([]);
  const [savedSnapshots, setSavedSnapshots] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [rebuildBusy, setRebuildBusy] = useState(false);
  const [assetBusy, setAssetBusy] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [productAssets, setProductAssets] = useState([]);
  const [status, setStatus] = useState('');
  const [pdfUploadLanguage, setPdfUploadLanguage] = useState('sk');
  const [previewCountryCode, setPreviewCountryCode] = useState('SK');

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedId) || null,
    [products, selectedId]
  );

  const deliveryLanguages = useMemo(
    () => getDeliveryLanguages(selectedProduct),
    [selectedProduct]
  );

  const isSelectedDirty = useMemo(() => {
    if (!selectedProduct) return false;
    return savedSnapshots[selectedProduct.id] !== getProductSnapshot(selectedProduct);
  }, [savedSnapshots, selectedProduct]);

  const confirmDiscardUnsaved = () =>
    !isSelectedDirty || window.confirm('You have unsaved product changes. Discard them and continue?');

  const loadProducts = async ({ skipDirtyCheck = false } = {}) => {
    if (!skipDirtyCheck && !confirmDiscardUnsaved()) return;

    setLoading(true);
    setStatus('');
    try {
      const data = await apiFetch('/api/products/admin');
      const loadedProducts = data?.products || [];
      setProducts(loadedProducts);
      setSavedSnapshots(Object.fromEntries(
        loadedProducts.map((product) => [product.id, getProductSnapshot(product)])
      ));
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
    let cancelled = false;

    const loadInitialProducts = async () => {
      setLoading(true);
      setStatus('');
      try {
        const data = await apiFetch('/api/products/admin');
        if (cancelled) return;

        const loadedProducts = data?.products || [];
        setProducts(loadedProducts);
        setSavedSnapshots(Object.fromEntries(
          loadedProducts.map((product) => [product.id, getProductSnapshot(product)])
        ));
        setSelectedId(loadedProducts[0]?.id ?? null);
      } catch (err) {
        if (!cancelled) {
          setProducts([]);
          setStatus(`Product load failed: ${err.message}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!deliveryLanguages.includes(pdfUploadLanguage)) {
      setPdfUploadLanguage(deliveryLanguages[0] || 'sk');
    }
  }, [deliveryLanguages, pdfUploadLanguage]);

  useEffect(() => {
    let cancelled = false;

    const loadAssetsForProduct = async () => {
      if (!selectedProduct?.id || selectedProduct.id < 0) {
        setProductAssets([]);
        setAssetsLoading(false);
        return;
      }

      setAssetsLoading(true);
      try {
        const assets = await loadProductAssets(selectedProduct.id);
        if (!cancelled) setProductAssets(assets);
      } catch (err) {
        if (!cancelled) {
          setProductAssets([]);
          setStatus(`Asset load failed: ${err.message}`);
        }
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    };

    loadAssetsForProduct();

    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!isSelectedDirty) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSelectedDirty]);

  const updateSelected = (patch) => {
    if (!selectedProduct) return;
    setProducts((current) =>
      current.map((product) =>
        product.id === selectedProduct.id ? { ...product, ...patch } : product
      )
    );
  };

  const updateSelectedProductType = (productType) => {
    const fulfillmentType = getFulfillmentTypeForProductType(
      productType,
      selectedProduct?.fulfillmentType
    );
    const nextTemplate = getTemplateForFulfillmentType(productType, fulfillmentType);

    updateSelected({
      productType,
      fulfillmentType,
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
    if (!confirmDiscardUnsaved()) return;
    const product = createEmptyProduct();
    setProducts((current) => [product, ...current]);
    setSelectedId(product.id);
    setStatus('New product draft. Save it to create it in the CMS.');
  };

  const selectProduct = (productId) => {
    if (!confirmDiscardUnsaved()) return;
    setSelectedId(productId);
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
    setSavedSnapshots((current) => {
      const next = { ...current };
      delete next[product.id];
      next[savedProduct.id] = getProductSnapshot(savedProduct);
      return next;
    });
    setSelectedId(savedProduct.id);
    return savedProduct;
  };

  const ensureProductForAssetUpload = async () => {
    if (!selectedProduct) return null;
    if (!selectedProduct.name?.trim()) {
      setStatus('Product name is required before uploading images.');
      return null;
    }

    return selectedProduct.id < 0
      ? persistProduct(selectedProduct)
      : selectedProduct;
  };

  const refreshProductAssets = async (productId = selectedProduct?.id) => {
    if (!productId || productId < 0) {
      setProductAssets([]);
      return;
    }

    setAssetsLoading(true);
    try {
      const assets = await loadProductAssets(productId);
      setProductAssets(assets);
    } catch (err) {
      setStatus(`Asset load failed: ${err.message}`);
    } finally {
      setAssetsLoading(false);
    }
  };

  const handleProductImageFiles = async (files) => {
    const imageFiles = (Array.isArray(files) ? files : [files]).filter(Boolean);
    if (!imageFiles.length || !selectedProduct) return;

    setAssetBusy(true);
    setStatus('');
    try {
      const productForUpload = await ensureProductForAssetUpload();
      if (!productForUpload) return;
      const uploadedAssets = [];

      for (const file of imageFiles) {
        const asset = await uploadProductImage(productForUpload.id, file, 'asset');
        if (asset) uploadedAssets.push(asset);
      }

      setProductAssets((current) => [...uploadedAssets, ...current]);
      setStatus(`${uploadedAssets.length} image${uploadedAssets.length === 1 ? '' : 's'} uploaded. Assign them, then Save the product.`);
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
      const data = await uploadProductPdf(savedProduct.id, file, {
        languageCode,
        customerFilename: getPdfFilename(savedProduct, languageCode),
      });
      if (data?.product) {
        setProducts((current) => [
          data.product,
          ...current.filter((item) => item.id !== savedProduct.id && item.id !== data.product.id),
        ]);
        setSavedSnapshots((current) => ({
          ...current,
          [data.product.id]: getProductSnapshot(data.product),
        }));
        setSelectedId(data.product.id);
      }
      if (data?.asset) {
        setProductAssets((current) => [data.asset, ...current.filter((asset) => asset.id !== data.asset.id)]);
      }
      setStatus(`${languageLabels[languageCode] || 'PDF'} uploaded and connected to paid email delivery.`);
    } catch (err) {
      setStatus(`PDF upload failed: ${err.message}`);
    } finally {
      setAssetBusy(false);
    }
  };

  const assignImageToProduct = (publicUrl, target) => {
    if (!selectedProduct || !publicUrl || !target) return;
    updateSelected(applyAssignedImageUrl(selectedProduct, target, publicUrl));
    setStatus('Image assigned in the draft. Save the product to persist this change.');
  };

  const deleteUploadedImageAsset = async (asset) => {
    if (!selectedProduct || !asset?.id) return;

    const filename = asset.originalFilename || 'this uploaded image';
    if (!window.confirm(`Delete "${filename}" from the media library? This also removes it from this product wherever it is assigned.`)) {
      return;
    }

    const wasDirty = isSelectedDirty;

    setAssetBusy(true);
    setStatus('');
    try {
      const data = await deleteProductImageAsset(selectedProduct.id, asset.id);
      setProductAssets((current) => current.filter((item) => item.id !== asset.id));

      if (data?.product) {
        setSavedSnapshots((current) => ({
          ...current,
          [data.product.id]: getProductSnapshot(data.product),
        }));
      }

      if (data?.product && !wasDirty) {
        setProducts((current) => [
          data.product,
          ...current.filter((item) => item.id !== selectedProduct.id && item.id !== data.product.id),
        ]);
        setSelectedId(data.product.id);
      } else if (asset.publicUrl) {
        updateSelected(removeAssignedImageUrl(selectedProduct, asset.publicUrl));
      }

      setStatus(
        data?.referencesRemoved
          ? 'Image deleted and removed from this product. Save any remaining draft changes before rebuilding.'
          : 'Image deleted from the media library.'
      );
    } catch (err) {
      setStatus(`Image delete failed: ${err.message}`);
    } finally {
      setAssetBusy(false);
    }
  };

  const deleteUploadedPdfAsset = async (asset) => {
    if (!selectedProduct || !asset?.id) return;

    const filename = asset.customerFilename || asset.originalFilename || 'this uploaded PDF';
    if (!window.confirm(`Delete "${filename}" from uploaded PDFs? If it is active, it will be removed from paid email delivery.`)) {
      return;
    }

    const wasDirty = isSelectedDirty;

    setAssetBusy(true);
    setStatus('');
    try {
      const data = await deleteProductPdfAsset(selectedProduct.id, asset.id);
      setProductAssets((current) => current.filter((item) => item.id !== asset.id));

      if (data?.product) {
        setSavedSnapshots((current) => ({
          ...current,
          [data.product.id]: getProductSnapshot(data.product),
        }));
      }

      if (data?.product && !wasDirty) {
        setProducts((current) => [
          data.product,
          ...current.filter((item) => item.id !== selectedProduct.id && item.id !== data.product.id),
        ]);
        setSelectedId(data.product.id);
      } else if (data?.product) {
        updateSelected({ emailAttachments: data.product.emailAttachments || [] });
      }

      setStatus(
        data?.referencesRemoved
          ? 'PDF deleted and removed from paid email delivery.'
          : 'PDF deleted from uploaded PDFs.'
      );
    } catch (err) {
      setStatus(`PDF delete failed: ${err.message}`);
    } finally {
      setAssetBusy(false);
    }
  };

  const moveGalleryImage = (countryCode, index, direction) => {
    if (!selectedProduct) return;
    const images = getGalleryImages(selectedProduct, countryCode);
    updateSelected(applyGalleryImages(selectedProduct, countryCode, moveListItem(images, index, direction)));
  };

  const removeGalleryImage = (countryCode, index) => {
    if (!selectedProduct) return;
    const images = getGalleryImages(selectedProduct, countryCode).filter((_, itemIndex) => itemIndex !== index);
    updateSelected(applyGalleryImages(selectedProduct, countryCode, images));
  };

  const validateBeforePublish = (product) => {
    if (product.status !== 'published') return true;

    if (hasPhysicalDelivery(product)) {
      const missing = [];
      if (!product.currency) missing.push('currency');
      if (typeof product.unitAmount !== 'number') missing.push('current price');
      if (typeof product.shippingAmount !== 'number') missing.push('shipping price');
      const hasActiveVariant = (product.variants || []).some((variant) =>
        variant.isActive !== false && (variant.code || variant.name)
      );
      if (!hasActiveVariant) missing.push('at least one active variant');

      if (missing.length) {
        setStatus(`Cannot publish physical/mixed product until these fields are set: ${missing.join(', ')}.`);
        return false;
      }
    }

    if (isMixedProduct(product) && !(product.emailAttachments || []).length) {
      return window.confirm(
        'This mixed bundle has no active paid email PDF configured. Publish it anyway?'
      );
    }

    return true;
  };

  const saveProduct = async () => {
    if (!selectedProduct) return;
    if (!selectedProduct.name?.trim()) {
      setStatus('Product name is required.');
      return;
    }
    if (!validateBeforePublish(selectedProduct)) return;

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
    if (!validateBeforePublish(selectedProduct)) return;

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
      await loadProducts({ skipDirtyCheck: true });
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

  const openProductPreview = () => {
    if (!selectedProduct || typeof window === 'undefined') return;

    const previewKey = saveAdminProductPreview({
      product: mapAdminProductToPreviewProduct(selectedProduct),
      countryCode: previewCountryCode,
      isDirty: isSelectedDirty,
    });

    const previewUrl = new URL('/admin/products/preview', window.location.origin);
    if (previewKey) previewUrl.searchParams.set('key', previewKey);
    if (selectedProduct.slug) previewUrl.searchParams.set('slug', selectedProduct.slug);
    previewUrl.searchParams.set('country', previewCountryCode);

    const previewWindow = window.open(previewUrl.toString(), '_blank');
    if (!previewWindow) {
      setStatus('Preview tab was blocked by the browser. Allow pop-ups for this site and try again.');
      return;
    }

    previewWindow.opener = null;
    if (!previewKey) {
      setStatus('Draft preview storage was blocked, so the preview tab opened the saved product by slug.');
    }
  };

  return (
    <div className="admin-products-shell">
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
              onClick={() => selectProduct(product.id)}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0 }}>Products</h2>
              {isSelectedDirty && <span className="admin-products-dirty">Unsaved changes</span>}
            </div>
            <div style={{ fontSize: '0.88rem', color: '#666', marginTop: '0.2rem' }}>
              Editable catalog with Stripe Product and Price sync.
            </div>
          </div>
          <div className="admin-products-actions">
            <div className="admin-products-preview-controls" aria-label="Product preview controls">
              <div className="admin-products-preview-language" aria-label="Preview language">
                {['SK', 'CZ'].map((countryCode) => (
                  <button
                    key={countryCode}
                    type="button"
                    className={previewCountryCode === countryCode ? 'is-active' : ''}
                    onClick={() => setPreviewCountryCode(countryCode)}
                    aria-pressed={previewCountryCode === countryCode}
                  >
                    {countryCode}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={openProductPreview}
                disabled={!selectedProduct}
                className="admin-products-preview-open"
              >
                <ExternalLink size={16} />
                Preview
              </button>
            </div>
            <button
              type="button"
	              onClick={rebuildPublicSite}
		              disabled={rebuildBusy || syncBusy || assetBusy || !selectedProduct || isSelectedDirty}
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
                disabled={busy || syncBusy || assetBusy || isSelectedDirty}
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
          <div className="admin-products-workspace">
            <div className="admin-products-editor">
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
                  <option value="mixed">Mixed bundle</option>
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

              <div style={{ gridColumn: '1 / -1' }}>
                <ProductMediaLibrary
                  product={selectedProduct}
                  assets={productAssets}
                  assetsLoading={assetsLoading}
                  assetBusy={assetBusy}
                  deliveryLanguages={deliveryLanguages}
                  languageLabels={languageLabels}
                  pdfUploadLanguage={pdfUploadLanguage}
                  onPdfUploadLanguageChange={setPdfUploadLanguage}
                  onUploadImages={handleProductImageFiles}
                  onUploadPdf={handleDigitalPdfFile}
                  onReloadAssets={() => refreshProductAssets()}
                  onAssignImage={assignImageToProduct}
                  onDeleteImageAsset={deleteUploadedImageAsset}
                  onDeletePdfAsset={deleteUploadedPdfAsset}
                  onMoveGalleryImage={moveGalleryImage}
                  onRemoveGalleryImage={removeGalleryImage}
                />
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
	                {!selectedProduct.stripePriceId && !selectedProduct.stripePriceEnv && !hasPhysicalDelivery(selectedProduct) && (
	                  <span style={helperTextStyle}>Checkout will not work for this product until a Stripe Price is configured.</span>
	                )}
	                {!selectedProduct.stripePriceId && !selectedProduct.stripePriceEnv && hasPhysicalDelivery(selectedProduct) && (
	                  <span style={helperTextStyle}>Sync Stripe to create catalog Product and Price IDs for this physical-capable product.</span>
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

	              {hasPhysicalDelivery(selectedProduct) && (
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

	            {hasPhysicalDelivery(selectedProduct) && (
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
	                  {(selectedProduct.variants || []).map((variant, index) => {
                      const availableQuantity = getVariantAvailableQuantity(variant);
                      const reservedQuantity = getVariantReservedQuantity(variant);
                      const soldQuantity = getVariantSoldQuantity(variant);
                      const sellableQuantity = Number(variant.sellableQuantity ?? variant.initialQuantity ?? 0);

                      return (
	                    <div key={`${variant.code}-${index}`} style={{ display: 'grid', gap: '0.75rem', background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem' }}>
	                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr minmax(150px, 0.8fr) 100px auto', gap: '0.5rem', alignItems: 'end' }}>
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
	                          <span style={labelTextStyle}>Available now</span>
	                          <input
	                            type="number"
	                            min="0"
	                            value={availableQuantity}
	                            onChange={(e) => {
	                              updateVariant(index, buildVariantAvailabilityPatch(variant, e.target.value));
	                            }}
	                            style={inputStyle}
	                          />
                            <span style={helperTextStyle}>
                              Sold {soldQuantity} · Reserved {reservedQuantity} · Total {sellableQuantity}
                            </span>
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
                      );
                    })}
	                </div>
	              </div>
	            )}
              </div>
            </div>

          </div>
        )}
      </section>
    </div>
  );
};

export default ProductCmsSection;
