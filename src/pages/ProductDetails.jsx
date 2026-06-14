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
  HeartPulse,
  House,
  Layers3,
  Plus,
  ScanSearch,
  Scale,
  ShoppingCart,
  Stethoscope,
} from 'lucide-react';
import { createCheckoutSession, loadVisitorCountry } from '../api/client';
import ProductCard from '../components/ProductCard';
import ProductLanguageBadges from '../components/ProductLanguageBadges';
import { useProduct, useProducts } from '../hooks/useProducts';
import '../styles/product-details.css';

const iconMap = {
  CalendarDays,
  Carrot,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  HeartPulse,
  House,
  Layers3,
  Plus,
  ScanSearch,
  Scale,
  Stethoscope,
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
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const session = await createCheckoutSession(product.slug);
      window.location.assign(session.checkoutUrl);
    } catch {
      setCheckoutError('Pokladňu sa nepodarilo otvoriť. Skúste to prosím znova.');
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
  }, [slug, productLanguagesKey, trustBadgeCount]);

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
  const ctaLabel = isPreviewProduct
    ? (product.purchaseLabel || 'Čoskoro')
    : checkoutLoading
      ? 'Otváram…'
      : 'Kúpiť';

  const showGalleryControls = galleryImages.length > 1;
  const goToPreviousGalleryImage = () => {
    setActiveGalleryIndex((current) => (current - 1 + galleryImages.length) % galleryImages.length);
  };

  const goToNextGalleryImage = () => {
    setActiveGalleryIndex((current) => (current + 1) % galleryImages.length);
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
              className="product-page__image-panel"
              style={heroMediaHeight ? { height: `${heroMediaHeight}px` } : undefined}
            >
              <div className="product-page__image-stage">
                <img
                  src={activeGalleryImage}
                  alt={`${product.name} – náhľad ${normalizedActiveGalleryIndex + 1}`}
                  className="product-page__image"
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

              <div className="product-page__buy-row">
                <div className="product-page__price-block">
                  <span className="product-page__label">Cena</span>
                  <span className="product-page__price">{priceLabel}</span>
                </div>

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

              <p className="product-page__delivery">
                {product.deliveryNote || 'Po zaplatení dostanete príručku vo forme PDF na email.'}
              </p>

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

      <section className="product-page__section">
        <div className="container product-page__container">
          <div className="product-page__closing">
            <div className="product-page__closing-copy">
              <h2>{closingTitle}</h2>
              <p>{closingText}</p>
              {closingNote && <span className="product-page__closing-note">{closingNote}</span>}
            </div>

            <div className="product-page__closing-action">
              <span className="product-page__closing-price">{priceLabel}</span>
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
