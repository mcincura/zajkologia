import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Carrot,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CheckCircle2,
  ClipboardList,
  Clock3,
  HeartPulse,
  House,
  Layers3,
  PackageCheck,
  Palette,
  Plus,
  ScanSearch,
  Scale,
  ShoppingCart,
  Stethoscope,
  Tag,
  Truck,
} from 'lucide-react';
import { createCheckoutSession, loadVisitorCountry } from '../api/client';
import { useCart } from '../cart/useCart';
import EmailCaptureOffer from '../components/EmailCaptureOffer';
import ProductCard from '../components/ProductCard';
import ProductLanguageBadges from '../components/ProductLanguageBadges';
import { useProduct, useProducts } from '../hooks/useProducts';
import {
  PRODUCT_PAGE_TEMPLATE,
  inferProductPageTemplate,
  isPhysicalTemplate,
  isPreorderTemplate,
} from '../utils/productTemplates';
import { clearStoredWelcomeDiscountOffer } from '../utils/welcomeDiscount';
import '../styles/product-details.css';

const iconMap = {
  CalendarDays,
  Carrot,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ClipboardList,
  HeartPulse,
  House,
  Layers3,
  PackageCheck,
  Palette,
  Plus,
  ScanSearch,
  Scale,
  Stethoscope,
  Tag,
  Truck,
};

const templateCopy = {
  [PRODUCT_PAGE_TEMPLATE.DIGITAL]: {
    trustBadges: (product) => [product.deliveryNote || 'PDF doručené na email'],
    contentTitle: 'Čo v digitálnom produkte nájdeš?',
    closingTitle: (product) => `Získať ${product.name}`,
    closingNote: (product) => product.deliveryNote || 'Jednorazový nákup, okamžitý prístup po zaplatení.',
  },
  [PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER]: {
    trustBadges: () => [],
    contentTitle: 'Prečo si produkt obľúbiš',
    closingTitle: () => 'Chceš si pripraviť miesto v predobjednávke?',
    closingNote: (product) =>
      [product.deliveryNote, product.shippingNote, product.stockNote].filter(Boolean).join(' • '),
  },
  [PRODUCT_PAGE_TEMPLATE.PHYSICAL]: {
    trustBadges: () => [],
    contentTitle: 'Prečo si produkt obľúbiš',
    closingTitle: (product) => `Objednať ${product.name}`,
    closingNote: (product) =>
      [product.deliveryNote, product.shippingNote, product.stockNote].filter(Boolean).join(' • '),
  },
};

const featureListToDetailSections = (product) =>
  (Array.isArray(product.featureList) ? product.featureList : []).map((feature, index) => ({
    icon: ['CheckCircle2', 'PackageCheck', 'Truck', 'HeartPulse', 'Layers3'][index % 5],
    title: feature,
    text: '',
  }));

const defaultPreorderInfo = (product) => {
  const items = [
    product.preorderNote
      ? {
          title: 'Predobjednávka',
          text: product.preorderNote,
        }
      : null,
    product.stockNote
      ? {
          title: 'Dostupnosť',
          text: product.stockNote,
        }
      : null,
    product.shippingNote || product.deliveryNote
      ? {
          title: 'Doručenie',
          text: product.shippingNote || product.deliveryNote,
        }
      : null,
  ].filter(Boolean);

  return items.length
    ? {
        title: 'Dôležité informácie k predobjednávke',
        items,
      }
    : null;
};

const fallbackTemplate = (product, template) => {
  const copy = templateCopy[template] || templateCopy[PRODUCT_PAGE_TEMPLATE.DIGITAL];
  const detailSections = featureListToDetailSections(product);
  const closingNote = copy.closingNote(product);

  return {
    template,
    lead: product.shortDescription || product.description || '',
    trustBadges: copy.trustBadges(product).filter(Boolean),
    purchaseHighlights: isPhysicalTemplate(template)
      ? [product.shippingNote, product.stockNote].filter(Boolean)
      : [],
    preorderMicrocopy: isPreorderTemplate(template)
      ? product.preorderNote || 'Predobjednávka bude spracovaná podľa aktuálnej dostupnosti produktu.'
      : '',
    variantsIntro: isPhysicalTemplate(template) && product.colorVariants?.length
      ? 'Vyber si dostupný variant produktu.'
      : '',
    contentTitle: copy.contentTitle,
    detailSections,
    preorderInfo: isPreorderTemplate(template) ? defaultPreorderInfo(product) : null,
    closingTitle: copy.closingTitle(product),
    closingText: product.description || product.shortDescription || '',
    closingNote,
  };
};

const SectionIcon = ({ name }) => {
  const Icon = iconMap[name] || CheckCircle2;
  return <Icon size={16} strokeWidth={2.1} />;
};

const getDefaultAvailableVariant = (variants = []) =>
  variants.find((variant) => variant.isActive !== false && Number(variant.available || 0) > 0) ||
  variants[0] ||
  null;

export const ProductDetailView = ({
  product: productOverride = null,
  relatedProducts: relatedProductsOverride = null,
  mode = 'public',
  countryCodeOverride = '',
  backTo: backToOverride = '',
  checkoutCancelled = false,
}) => {
  const isAdminPreview = mode === 'admin-preview';
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const shouldLoadRouteProduct = !productOverride;
  const backTo = backToOverride || location.state?.from || '/?category=Produkty';
  const { product: loadedProduct, loading: productLoading } = useProduct(slug, shouldLoadRouteProduct);
  const { products } = useProducts(shouldLoadRouteProduct && !relatedProductsOverride);
  const { addItem } = useCart();
  const product = productOverride || loadedProduct;
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [cartAdded, setCartAdded] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [selectedVariantCode, setSelectedVariantCode] = useState('');
  const [visitorCountryCode, setVisitorCountryCode] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const isPreviewProduct = isAdminPreview || Boolean(product?.isMock);

  useEffect(() => {
    if (typeof window === 'undefined' || isAdminPreview) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [isAdminPreview, slug]);

  useEffect(() => {
    if (isAdminPreview || countryCodeOverride) return undefined;

    let cancelled = false;

    const loadCountry = async () => {
      try {
        const countryCode = await loadVisitorCountry();
        if (!cancelled) setVisitorCountryCode(countryCode || '');
      } catch {
        if (!cancelled) setVisitorCountryCode('');
      }
    };

    loadCountry();

    return () => {
      cancelled = true;
    };
  }, [countryCodeOverride, isAdminPreview]);

  const getSelectedCheckoutVariant = () => {
    const colorOptions = product.colorVariants || [];
    return (
      colorOptions.find((variant) => variant.code === selectedVariantCode) ||
      getDefaultAvailableVariant(colorOptions)
    );
  };

  const validateSelectedVariant = () => {
    const isPhysicalCheckout = product.productType === 'physical';
    const selectedVariant = getSelectedCheckoutVariant();

    if (isPhysicalCheckout && !selectedVariant) {
      setCheckoutError('Vyberte si prosím farebnú kombináciu.');
      return null;
    }

    if (
      isPhysicalCheckout &&
      (selectedVariant.isActive === false || Number(selectedVariant.available || 0) <= 0)
    ) {
      setCheckoutError('Táto farebná kombinácia je momentálne vypredaná.');
      return null;
    }

    return selectedVariant;
  };

  const handleAddToCart = () => {
    if (isPreviewProduct || isAdminPreview || !product) return;
    const isPhysicalCheckout = product.productType === 'physical';
    const selectedVariant = validateSelectedVariant();
    if (isPhysicalCheckout && !selectedVariant) return;

    addItem({
      product,
      productSlug: product.slug,
      productType: isPhysicalCheckout ? 'physical' : 'digital',
      ...(isPhysicalCheckout ? { variantCode: selectedVariant.code } : {}),
      quantity: 1,
      maxQuantity: product.maxQuantity || 1,
    });
    setCheckoutError('');
    setCartAdded(true);
  };

  const handleCheckout = async () => {
    if (isPreviewProduct || isAdminPreview || !product) return;
    const isPhysicalCheckout = product.productType === 'physical';
    const selectedVariant = validateSelectedVariant();
    if (isPhysicalCheckout && !selectedVariant) return;

    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const normalizedCouponCode = couponCode.trim();
      const session = await createCheckoutSession(product.slug, {
        ...(normalizedCouponCode ? { couponCode: normalizedCouponCode } : {}),
        disableStoredDiscount: isPhysicalCheckout || Boolean(normalizedCouponCode),
        ...(isPhysicalCheckout
          ? {
              variantCode: selectedVariant.code,
            }
          : {}),
      });
      window.location.assign(session.checkoutUrl);
    } catch (err) {
      if (err?.data?.error === 'variant_sold_out') {
        setCheckoutError('Táto farebná kombinácia sa práve vypredala. Vyberte prosím inú.');
      } else if (err?.data?.error === 'variant_required') {
        setCheckoutError('Vyberte si prosím farebnú kombináciu.');
      } else if (err?.data?.error === 'inventory_not_ready') {
        setCheckoutError('Predobjednávku ešte pripravujeme. Skúste to prosím neskôr.');
      } else if (err?.data?.error === 'welcome_discount_reserved') {
        setCheckoutError('Uvítacia zľava je už pripravená v otvorenej pokladni. Dokončite otvorenú platbu alebo to skúste neskôr.');
      } else if (err?.data?.error?.startsWith?.('welcome_discount_')) {
        clearStoredWelcomeDiscountOffer();
        setCheckoutError('Uvítacia zľava už bola použitá alebo nie je platná. Obnovte stránku a skúste nákup bez nej.');
      } else if (err?.data?.error?.startsWith?.('coupon_')) {
        setCheckoutError('Zľavový kód nie je platný pre tento nákup alebo sa nedá kombinovať s aktuálnou akciou.');
      } else {
        setCheckoutError('Pokladňu sa nepodarilo otvoriť. Skúste to prosím znova.');
      }
      setCheckoutLoading(false);
    }
  };

  const pageData = useMemo(() => {
    if (!product) return null;
    const productTemplate = inferProductPageTemplate(product);
    return {
      ...fallbackTemplate(product, productTemplate),
      ...(product.productPage || {}),
      template: productTemplate,
    };
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (relatedProductsOverride) return relatedProductsOverride;
    if (!product) return [];
    return products.filter((item) => item.slug !== product.slug).slice(0, 2);
  }, [product, products, relatedProductsOverride]);

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const normalizedCountryCode = (countryCodeOverride || visitorCountryCode).toUpperCase();
    const countryImages = normalizedCountryCode
      ? product.productPage?.galleryImagesByCountry?.[normalizedCountryCode]
      : null;

    const sourceImages = countryImages?.length
      ? countryImages
      : product.productPage?.galleryImages?.length
      ? product.productPage.galleryImages
      : [product.heroImage || product.image];

    return sourceImages.filter(Boolean);
  }, [countryCodeOverride, product, visitorCountryCode]);

  const normalizedActiveGalleryIndex = galleryImages.length
    ? Math.min(activeGalleryIndex, galleryImages.length - 1)
    : 0;

  if (!productOverride && productLoading && !product) {
    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Načítavam produkt…</h2>
      </div>
    );
  }

  if (!product) {
    if (isAdminPreview) {
      return (
        <div className="product-page product-page--admin-preview-empty">
          <div className="product-page__admin-empty">
            Vyplň názov a základné údaje produktu. Náhľad sa zobrazí automaticky.
          </div>
        </div>
      );
    }

    return (
      <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
        <h2>Produkt nebol nájdený 🥕</h2>
        <Link
          to={backTo}
          style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
        >
          Späť na produkty
        </Link>
      </div>
    );
  }

  const {
    lead,
    trustBadges = [],
    languageNote,
    handmadeStory,
    purchaseHighlights = [],
    preorderMicrocopy,
    variantsIntro,
    usageSteps,
    preorderInfo,
    faqItems = [],
    contentTitle,
    detailSections = [],
    closingTitle,
    closingText,
    closingNote,
  } = pageData;

  const productAccent = product.pageTheme?.accent || product.accentColor || '#dbc29b';
  const productAccentStrong = product.pageTheme?.accentStrong || '#8f5822';
  const productTint = product.pageTheme?.tint || '#f7ead8';
  const productSurface = product.pageTheme?.surface || '#fffaf3';
  const basePriceLabel = product.price || 'Cena v pokladni';
  const activeGalleryImage = galleryImages[normalizedActiveGalleryIndex] || product.heroImage || product.image;
  const productTemplate = pageData.template || inferProductPageTemplate(product);
  const isPhysicalProductPage = isPhysicalTemplate(productTemplate);
  const isPreorderProductPage = isPreorderTemplate(productTemplate);
  const colorVariants = product.colorVariants || [];
  const selectedVariant =
    colorVariants.find((variant) => variant.code === selectedVariantCode) ||
    getDefaultAvailableVariant(colorVariants);
  const priceLabel = selectedVariant?.price || basePriceLabel;
  const originalPriceLabel = selectedVariant?.originalPrice || product.originalPrice;
  const selectedVariantUnavailable =
    isPhysicalProductPage &&
    colorVariants.length > 0 &&
    (!selectedVariant ||
      selectedVariant.isActive === false ||
      Number(selectedVariant.available || 0) <= 0);
  const preorderDeal = isPreorderProductPage ? product.preorderDeal || null : null;
  const showPreorderInfo = isPreorderProductPage && preorderInfo?.items?.length > 0;
  const showPreorderMicrocopy = isPreorderProductPage && preorderMicrocopy;
  const handmadeItems = handmadeStory?.items || [];
  const productStatusItems = product.hideStatusBadges
    ? []
    : [
        isPreorderProductPage && product.preorderNote
          ? { icon: Clock3, label: product.preorderNote }
          : null,
        product.stockNote ? { icon: PackageCheck, label: product.stockNote } : null,
        product.shippingNote ? { icon: Truck, label: product.shippingNote } : null,
      ].filter(Boolean);
  const defaultCtaLabel = isPreorderProductPage
    ? `Predobjednať za ${priceLabel}`
    : isPhysicalProductPage
      ? `Kúpiť za ${priceLabel}`
      : 'Kúpiť';
  const ctaLabel = isPreviewProduct
    ? (product.purchaseLabel || 'Čoskoro')
    : checkoutLoading
      ? 'Otváram…'
      : selectedVariantUnavailable
        ? 'Vypredané'
        : product.purchaseLabel || defaultCtaLabel;

  const showGalleryControls = galleryImages.length > 1;
  const goToPreviousGalleryImage = () => {
    setActiveGalleryIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
  };

  const goToNextGalleryImage = () => {
    setActiveGalleryIndex((current) => (current + 1) % galleryImages.length);
  };

  const selectVariantImage = (image) => {
    const imageIndex = galleryImages.findIndex((galleryImage) => galleryImage === image);
    if (imageIndex >= 0) setActiveGalleryIndex(imageIndex);
  };

  return (
    <div
      className={`product-page product-page--${productTemplate}`}
      style={{
        '--product-page-accent': productAccent,
        '--product-page-accent-strong': productAccentStrong,
        '--product-page-tint': productTint,
        '--product-page-surface': productSurface,
      }}
    >
      <section className="product-page__top">
        <div className="container product-page__container">
          {!isAdminPreview && (
            <Link to={backTo} className="product-page__back-link">
              <ArrowLeft size={18} />
              Späť na produkty
            </Link>
          )}

          {isAdminPreview && (
            <div className="product-page__notice product-page__notice--preview">
              Admin náhľad. Checkout, zľavové kódy a newsletter sú v tomto režime vypnuté.
            </div>
          )}

          {(checkoutCancelled || (!isAdminPreview && searchParams.get('checkout') === 'cancelled')) && (
            <div className="product-page__notice">
              Platba nebola dokončená. Produkt si môžete kúpiť kedykoľvek neskôr.
            </div>
          )}

          <article className="product-page__hero">
            <div className="product-page__image-panel product-page__image-panel--square">
              <div className="product-page__image-stage">
                <img
                  src={activeGalleryImage}
                  alt={`${product.name} – náhľad ${normalizedActiveGalleryIndex + 1}`}
                  className="product-page__image product-page__image--square"
                />

                {showGalleryControls && (
                  <>
                    <button
                      type="button"
                      className="product-page__gallery-arrow product-page__gallery-arrow--prev"
                      onClick={goToPreviousGalleryImage}
                      aria-label="Predchádzajúci náhľad produktu"
                    >
                      <ChevronLeft size={18} />
                    </button>

                    <button
                      type="button"
                      className="product-page__gallery-arrow product-page__gallery-arrow--next"
                      onClick={goToNextGalleryImage}
                      aria-label="Ďalší náhľad produktu"
                    >
                      <ChevronRight size={18} />
                    </button>

                    <div className="product-page__gallery-count">
                      {normalizedActiveGalleryIndex + 1} / {galleryImages.length}
                    </div>

                    <div className="product-page__gallery-dots" aria-label="Výber náhľadu produktu">
                      {galleryImages.map((image, index) => (
                        <button
                          key={image}
                          type="button"
                          className={`product-page__gallery-dot${index === normalizedActiveGalleryIndex ? ' is-active' : ''}`}
                          onClick={() => setActiveGalleryIndex(index)}
                          aria-label={`Zobraziť náhľad ${index + 1}`}
                          aria-pressed={index === normalizedActiveGalleryIndex}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="product-page__summary">
              <h1 className="product-page__title">{product.name}</h1>
              <p className="product-page__lead">{lead}</p>

              {trustBadges.length > 0 && (
                <div className="product-page__meta-list">
                  {trustBadges.map((badge) => (
                    <span key={badge} className="product-page__meta-chip">
                      <CheckCircle2 size={14} strokeWidth={2.4} />
                      {badge}
                    </span>
                  ))}
                </div>
              )}

              {product.languages?.length > 0 && (
                <div className="product-page__language-row">
                  <span className="product-page__language-label">Dostupné jazyky:</span>
                  <ProductLanguageBadges languages={product.languages} />
                </div>
              )}

              {languageNote && <p className="product-page__language-note">{languageNote}</p>}

              <div className={`product-page__buy-row${preorderDeal ? ' product-page__buy-row--deal' : ''}`}>
                <div className={`product-page__price-block${preorderDeal ? ' product-page__price-block--deal' : ''}`}>
                  {preorderDeal ? (
                    <div className="product-page__deal-card">
                      <div className="product-page__deal-header">
                        <span>Predobjednávka</span>
                        {product.saleLabel && (
                          <span className="product-page__deal-discount">{product.saleLabel}</span>
                        )}
                      </div>

                      <div className="product-page__deal-prices">
                        <div className="product-page__deal-anchor">
                          <span>{preorderDeal.anchorLabel}</span>
                          <strong>{originalPriceLabel}</strong>
                        </div>

                        <div className="product-page__deal-current">
                          <span>{preorderDeal.currentLabel}</span>
                          <strong>{priceLabel}</strong>
                        </div>
                      </div>

                      {preorderDeal.savingsLabel && (
                        <div className="product-page__deal-saving">
                          {preorderDeal.savingsLabel}
                        </div>
                      )}

                      {(preorderDeal.limitLabel || preorderDeal.limitDetail) && (
                        <div className="product-page__deal-limit">
                          <div className="product-page__deal-limit-copy">
                            {preorderDeal.limitLabel && <span>{preorderDeal.limitLabel}</span>}
                            {preorderDeal.limitDetail && <strong>{preorderDeal.limitDetail}</strong>}
                          </div>
                          <div className="product-page__deal-meter" aria-hidden="true">
                            <span />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <span className="product-page__label">Cena</span>
                      {originalPriceLabel && (
                        <span className="product-page__price-original">{originalPriceLabel}</span>
                      )}
                      <span className="product-page__price">{priceLabel}</span>
                      {product.saleDescription && (
                        <span className="product-page__price-detail">
                          {product.saleLabel ? `${product.saleLabel} · ` : ''}{product.saleDescription}
                        </span>
                      )}
                    </>
                  )}
                </div>

                <div className="product-page__checkout-controls">
                  {!isPreviewProduct && !isAdminPreview && (
                    <label className="product-page__coupon-field">
                      <Tag size={16} />
                      <span className="sr-only">Zľavový kód</span>
                      <input
                        value={couponCode}
                        onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                        placeholder="Zľavový kód"
                        autoComplete="off"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isPreviewProduct || selectedVariantUnavailable}
                    className={`product-page__cart-button${cartAdded ? ' is-added' : ''}`}
                  >
                    <ShoppingCart size={18} />
                    {cartAdded ? 'Pridané v košíku' : 'Pridať do košíka'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={checkoutLoading || isPreviewProduct || selectedVariantUnavailable}
                    className={`product-page__cta${isPreviewProduct ? ' product-page__cta--preview' : ''}`}
                  >
                    <ArrowRight size={18} />
                    {ctaLabel}
                  </button>
                </div>
              </div>

              {showPreorderMicrocopy && (
                <p className="product-page__preorder-note">{preorderMicrocopy}</p>
              )}

              <p className="product-page__delivery">
                {product.deliveryNote ||
                  (isPhysicalProductPage
                    ? 'Fyzický produkt doručíme podľa dostupných možností dopravy.'
                    : 'Po zaplatení dostanete príručku vo forme PDF na email.')}
              </p>

              {purchaseHighlights.length > 0 && (
                <ul className="product-page__purchase-highlights">
                  {purchaseHighlights.map((highlight) => (
                    <li key={highlight}>
                      <CheckCircle2 size={15} strokeWidth={2.4} />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              )}

              {productStatusItems.length > 0 && (
                <div className="product-page__status-list">
                  {productStatusItems.map(({ icon: StatusIcon, label }) => (
                    <span key={label} className="product-page__status-chip">
                      {React.createElement(StatusIcon, { size: 14, strokeWidth: 2.4 })}
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {colorVariants.length > 0 && (
                <div className="product-page__variants">
                  <div className="product-page__variants-header">
                    <span>Farebné kombinácie</span>
                  </div>
                  {variantsIntro && (
                    <p className="product-page__variants-intro">{variantsIntro}</p>
                  )}
                  <div className="product-page__variant-grid">
                    {colorVariants.map((variant) => {
                      const isSelected = selectedVariant?.code === variant.code;
                      const isUnavailable =
                        variant.isActive === false || Number(variant.available || 0) <= 0;

                      return (
                        <button
                          key={variant.code || variant.name}
                          type="button"
                          className={`product-page__variant${isSelected ? ' is-active' : ''}${isUnavailable ? ' is-unavailable' : ''}`}
                          onClick={() => {
                            setSelectedVariantCode(variant.code);
                            setCartAdded(false);
                            selectVariantImage(variant.image);
                          }}
                          aria-pressed={isSelected}
                        >
                          <img
                            src={variant.image}
                            alt={variant.name}
                            className="product-page__variant-image"
                            loading="lazy"
                            decoding="async"
                          />
                          <span className="product-page__variant-copy">
                            <span className="product-page__variant-name">{variant.name}</span>
                            <span className="product-page__variant-stock">
                              {isUnavailable ? 'Vypredané' : `${variant.available} ks dostupných`}
                            </span>
                            {variant.price && variant.price !== product.price && (
                              <span className="product-page__variant-price">
                                {variant.originalPrice && (
                                  <span>{variant.originalPrice}</span>
                                )}
                                <strong>{variant.price}</strong>
                              </span>
                            )}
                            {variant.swatches?.length > 0 && (
                              <span className="product-page__variant-swatches" aria-hidden="true">
                                {variant.swatches.map((swatch) => (
                                  <span
                                    key={swatch}
                                    className="product-page__variant-swatch"
                                    style={{ backgroundColor: swatch }}
                                  />
                                ))}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {!isPreviewProduct && !isAdminPreview && !isPhysicalProductPage && (
                <EmailCaptureOffer placement="product" />
              )}

              {checkoutError && (
                <div className="product-page__error">{checkoutError}</div>
              )}

            </div>
          </article>
        </div>
      </section>

      <section className="product-page__section">
        <div className="container product-page__container">
          <div className="product-page__copy-block product-page__copy-block--primary">
            <h2 className="product-page__content-title">{contentTitle}</h2>

            {detailSections.length > 0 && (
              <div className="product-page__story-list">
                {detailSections.map((section) => (
                  <article key={section.title} className="product-page__story">
                    <div className="product-page__story-header">
                      <div className="product-page__benefit-icon">
                        <SectionIcon name={section.icon} />
                      </div>
                      <div className="product-page__story-heading">
                        <h3>{section.title}</h3>
                      </div>
                    </div>

                    {section.text && <p>{section.text}</p>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {usageSteps?.items?.length > 0 && (
        <section className="product-page__section">
          <div className="container product-page__container">
            <div className="product-page__copy-block product-page__copy-block--steps">
              <div className="product-page__section-heading">
                <span className="product-page__section-kicker">Použitie</span>
                <h2>{usageSteps.title}</h2>
              </div>

              <div className="product-page__step-list">
                {usageSteps.items.map((step, index) => (
                  <article key={step} className="product-page__step">
                    <span className="product-page__step-index">{index + 1}</span>
                    <p>{step}</p>
                  </article>
                ))}
              </div>

              {usageSteps.note && (
                <p className="product-page__step-note">{usageSteps.note}</p>
              )}
            </div>
          </div>
        </section>
      )}

      {handmadeStory && (
        <section className="product-page__section product-page__section--handmade">
          <div className="container product-page__container">
            <div className="product-page__handmade">
              <div className="product-page__handmade-copy">
                <span className="product-page__section-kicker">Ručná výroba</span>
                <h2>{handmadeStory.title}</h2>
                {handmadeStory.text && <p>{handmadeStory.text}</p>}
              </div>

              {handmadeItems.length > 0 && (
                <div className="product-page__handmade-grid">
                  {handmadeItems.map((item) => (
                    <article key={item.title} className="product-page__handmade-item">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="product-page__handmade-image"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="product-page__handmade-item-copy">
                        <h3>{item.title}</h3>
                        {item.text && <p>{item.text}</p>}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {showPreorderInfo && (
        <section className="product-page__section">
          <div className="container product-page__container">
            <div className="product-page__copy-block product-page__copy-block--info">
              <div className="product-page__section-heading">
                <span className="product-page__section-kicker">Predobjednávka</span>
                <h2>{preorderInfo.title}</h2>
              </div>

              <div className="product-page__info-grid">
                {preorderInfo.items.map((item) => (
                  <article key={item.title} className="product-page__info-item">
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {faqItems.length > 0 && (
        <section className="product-page__section">
          <div className="container product-page__container">
            <div className="product-page__copy-block product-page__copy-block--faq">
              <div className="product-page__section-heading">
                <span className="product-page__section-kicker">FAQ</span>
                <h2>Často kladené otázky</h2>
              </div>

              <div className="product-page__faq-list">
                {faqItems.map((item) => (
                  <details key={item.question} className="product-page__faq-item">
                    <summary>{item.question}</summary>
                    <p>{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="product-page__section">
        <div className="container product-page__container">
          <div className="product-page__closing">
            <div className="product-page__closing-copy">
              <h2>{closingTitle}</h2>
              <p>{closingText}</p>
              {closingNote && <span className="product-page__closing-note">{closingNote}</span>}
            </div>

            <div className="product-page__closing-action">
              <span className="product-page__closing-price">
                {originalPriceLabel && (
                  <span className="product-page__closing-price-original">
                    {originalPriceLabel}
                  </span>
                )}
                <span>{priceLabel}</span>
              </span>
              <div className="product-page__closing-buttons">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isPreviewProduct || selectedVariantUnavailable}
                  className={`product-page__cart-button${cartAdded ? ' is-added' : ''}`}
                >
                  <ShoppingCart size={18} />
                  {cartAdded ? 'Pridané v košíku' : 'Pridať do košíka'}
                </button>
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutLoading || isPreviewProduct || selectedVariantUnavailable}
                  className={`product-page__cta${isPreviewProduct ? ' product-page__cta--preview' : ''}`}
                >
                  <ArrowRight size={18} />
                  {ctaLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="product-page__section product-page__section--related">
          <div className="container product-page__container">
            <div className="product-page__related-header">
              <div>
                <h2>Ďalšie produkty</h2>
              </div>
              <Link to="/?category=Produkty" className="product-page__inline-link">
                Zobraziť všetky produkty
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="products-grid products-grid--catalog">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  accentColor={relatedProduct.pageTheme?.accent || '#F8E8D4'}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const ProductDetails = () => <ProductDetailView />;

export default ProductDetails;
