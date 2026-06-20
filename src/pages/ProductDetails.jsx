import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import EmailCaptureOffer from '../components/EmailCaptureOffer';
import ProductCard from '../components/ProductCard';
import ProductLanguageBadges from '../components/ProductLanguageBadges';
import { useProduct, useProducts } from '../hooks/useProducts';
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

const fallbackTemplate = (product) => ({
  lead: product.shortDescription || product.description || '',
  trustBadges: [product.deliveryNote || 'PDF doručené na email'],
  contentTitle: `Čo všetko v produkte nájdeš?`,
  detailSections: [],
  closingTitle: `Zisti viac o produkte ${product.name}`,
  closingText: product.description || '',
  closingNote: product.deliveryNote || '',
});

const SectionIcon = ({ name }) => {
  const Icon = iconMap[name] || CheckCircle2;
  return <Icon size={16} strokeWidth={2.1} />;
};

const getDefaultAvailableVariant = (variants = []) =>
  variants.find((variant) => variant.isActive !== false && Number(variant.available || 0) > 0) ||
  variants[0] ||
  null;

const ProductDetails = () => {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const backTo = location.state?.from || '/?category=Produkty';
  const { product } = useProduct(slug);
  const { products } = useProducts();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [heroMediaHeight, setHeroMediaHeight] = useState(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [selectedVariantCode, setSelectedVariantCode] = useState('');
  const [visitorCountryCode, setVisitorCountryCode] = useState('');
  const summaryRef = useRef(null);
  const isPreviewProduct = Boolean(product?.isMock);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  useEffect(() => {
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
  }, []);

  const handleCheckout = async () => {
    if (isPreviewProduct || !product) return;
    const isPhysicalCheckout = product.productType === 'physical';
    const colorOptions = product.colorVariants || [];
    const selectedVariant =
      colorOptions.find((variant) => variant.code === selectedVariantCode) ||
      getDefaultAvailableVariant(colorOptions);

    if (isPhysicalCheckout && !selectedVariant) {
      setCheckoutError('Vyberte si prosím farebnú kombináciu.');
      return;
    }

    if (
      isPhysicalCheckout &&
      (selectedVariant.isActive === false || Number(selectedVariant.available || 0) <= 0)
    ) {
      setCheckoutError('Táto farebná kombinácia je momentálne vypredaná.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const session = await createCheckoutSession(product.slug, {
        ...(isPhysicalCheckout
          ? {
              variantCode: selectedVariant.code,
              disableStoredDiscount: true,
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
      } else {
        setCheckoutError('Pokladňu sa nepodarilo otvoriť. Skúste to prosím znova.');
      }
      setCheckoutLoading(false);
    }
  };

  const pageData = useMemo(() => {
    if (!product) return null;
    return {
      ...fallbackTemplate(product),
      ...(product.productPage || {}),
    };
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter((item) => item.slug !== product.slug).slice(0, 2);
  }, [product, products]);

  const galleryImages = useMemo(() => {
    if (!product) return [];

    const normalizedCountryCode = visitorCountryCode.toUpperCase();
    const countryImages = normalizedCountryCode
      ? product.productPage?.galleryImagesByCountry?.[normalizedCountryCode]
      : null;

    const sourceImages = countryImages?.length
      ? countryImages
      : product.productPage?.galleryImages?.length
      ? product.productPage.galleryImages
      : [product.heroImage || product.image];

    return sourceImages.filter(Boolean);
  }, [product, visitorCountryCode]);

  const normalizedActiveGalleryIndex = galleryImages.length
    ? Math.min(activeGalleryIndex, galleryImages.length - 1)
    : 0;
  const productLanguagesKey = product?.languages?.join(',') || '';
  const trustBadgeCount = pageData?.trustBadges?.length || 0;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const summaryElement = summaryRef.current;
    if (!summaryElement) return undefined;

    const syncHeroHeight = () => {
      if (product?.productType === 'physical') {
        setHeroMediaHeight((current) => (current === null ? current : null));
        return;
      }

      if (window.innerWidth <= 1040) {
        setHeroMediaHeight((current) => (current === null ? current : null));
        return;
      }

      const nextHeight = Math.round(summaryElement.getBoundingClientRect().height);
      setHeroMediaHeight((current) => (current === nextHeight ? current : nextHeight));
    };

    syncHeroHeight();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncHeroHeight) : null;

    observer?.observe(summaryElement);
    window.addEventListener('resize', syncHeroHeight);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncHeroHeight);
    };
  }, [slug, product?.productType, productLanguagesKey, trustBadgeCount]);

  if (!product) {
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
  const priceLabel = product.price || 'Cena v pokladni';
  const activeGalleryImage = galleryImages[normalizedActiveGalleryIndex] || product.heroImage || product.image;
  const usesSquareGallery = product.productType === 'physical';
  const colorVariants = product.colorVariants || [];
  const selectedVariant =
    colorVariants.find((variant) => variant.code === selectedVariantCode) ||
    getDefaultAvailableVariant(colorVariants);
  const selectedVariantUnavailable =
    product.productType === 'physical' &&
    colorVariants.length > 0 &&
    (!selectedVariant ||
      selectedVariant.isActive === false ||
      Number(selectedVariant.available || 0) <= 0);
  const preorderDeal = product.preorderDeal || null;
  const handmadeItems = handmadeStory?.items || [];
  const productStatusItems = product.hideStatusBadges
    ? []
    : [
        product.preorderNote ? { icon: Clock3, label: product.preorderNote } : null,
        product.stockNote ? { icon: PackageCheck, label: product.stockNote } : null,
        product.shippingNote ? { icon: Truck, label: product.shippingNote } : null,
      ].filter(Boolean);
  const ctaLabel = isPreviewProduct
    ? (product.purchaseLabel || 'Čoskoro')
    : checkoutLoading
      ? 'Otváram…'
      : selectedVariantUnavailable
        ? 'Vypredané'
        : product.productType === 'physical'
          ? 'Predobjednať'
          : 'Kúpiť';

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
      className="product-page"
      style={{
        '--product-page-accent': productAccent,
        '--product-page-accent-strong': productAccentStrong,
        '--product-page-tint': productTint,
        '--product-page-surface': productSurface,
      }}
    >
      <section className="product-page__top">
        <div className="container product-page__container">
          <Link to={backTo} className="product-page__back-link">
            <ArrowLeft size={18} />
            Späť na produkty
          </Link>

          {searchParams.get('checkout') === 'cancelled' && (
            <div className="product-page__notice">
              Platba nebola dokončená. Produkt si môžete kúpiť kedykoľvek neskôr.
            </div>
          )}

          <article className="product-page__hero">
            <div
              className={`product-page__image-panel${usesSquareGallery ? ' product-page__image-panel--square' : ''}`}
              style={heroMediaHeight ? { height: `${heroMediaHeight}px` } : undefined}
            >
              <div className="product-page__image-stage">
                <img
                  src={activeGalleryImage}
                  alt={`${product.name} – náhľad ${normalizedActiveGalleryIndex + 1}`}
                  className={`product-page__image${usesSquareGallery ? ' product-page__image--square' : ''}`}
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

            <div className="product-page__summary" ref={summaryRef}>
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
                          <strong>{product.originalPrice}</strong>
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
                      {product.originalPrice && (
                        <span className="product-page__price-original">{product.originalPrice}</span>
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

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={checkoutLoading || isPreviewProduct || selectedVariantUnavailable}
                  className={`product-page__cta${isPreviewProduct ? ' product-page__cta--preview' : ''}`}
                >
                  <ShoppingCart size={18} />
                  {ctaLabel}
                </button>
              </div>

              <p className="product-page__delivery">
                {product.deliveryNote || 'Po zaplatení dostanete príručku vo forme PDF na email.'}
              </p>

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

              {!isPreviewProduct && product.productType !== 'physical' && (
                <EmailCaptureOffer placement="product" />
              )}

              {checkoutError && (
                <div className="product-page__error">{checkoutError}</div>
              )}

            </div>
          </article>
        </div>
      </section>

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
                {product.originalPrice && (
                  <span className="product-page__closing-price-original">
                    {product.originalPrice}
                  </span>
                )}
                <span>{priceLabel}</span>
              </span>
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading || isPreviewProduct}
                className={`product-page__cta${isPreviewProduct ? ' product-page__cta--preview' : ''}`}
              >
                <ShoppingCart size={18} />
                {ctaLabel}
              </button>
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

export default ProductDetails;
