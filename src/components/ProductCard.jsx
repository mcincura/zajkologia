import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { createCheckoutSession } from '../api/client';
import ProductLanguageBadges from './ProductLanguageBadges';
import { PRODUCT_PAGE_TEMPLATE, inferProductPageTemplate } from '../utils/productTemplates';
import { clearStoredWelcomeDiscountOffer } from '../utils/welcomeDiscount';
import '../styles/products.css';

const ProductCard = ({ product, accentColor = '#eccfc3' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const from = location.pathname + location.search;
  const destination = `/product/${product.slug}`;
  const isPreviewProduct = Boolean(product.isMock);
  const productTemplate = inferProductPageTemplate(product);
  const needsVariantSelection = product.productType === 'physical';

  const handleCheckout = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPreviewProduct) return;
    if (needsVariantSelection) {
      navigate(destination, { state: { from } });
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError('');
    try {
      const session = await createCheckoutSession(product.slug);
      window.location.assign(session.checkoutUrl);
    } catch (err) {
      if (err?.data?.error === 'welcome_discount_reserved') {
        setCheckoutError('Uvítacia zľava je už pripravená v otvorenej pokladni. Dokončite otvorenú platbu alebo to skúste neskôr.');
      } else if (err?.data?.error?.startsWith?.('welcome_discount_')) {
        clearStoredWelcomeDiscountOffer();
        setCheckoutError('Uvítacia zľava už bola použitá alebo nie je platná.');
      } else {
        setCheckoutError('Pokladňu sa nepodarilo otvoriť. Skúste to prosím znova.');
      }
      setCheckoutLoading(false);
    }
  };

  const description = product.shortDescription || product.description || '';
  const price = product.price || 'Cena v pokladni';
  const cardBadges = [product.preorderNote, product.saleLabel].filter(Boolean);
  const buttonLabel = isPreviewProduct
    ? product.purchaseLabel || 'Čoskoro'
    : checkoutLoading
      ? 'Otváram...'
      : needsVariantSelection
        ? product.purchaseLabel ||
          (productTemplate === PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER ? 'Vybrať farbu' : 'Vybrať variant')
        : 'Kúpiť';

  return (
    <article
      className="product-card"
      style={{ '--product-accent': product.accentColor || accentColor }}
    >
      <Link
        className="product-card__overlay-link"
        to={destination}
        state={{ from }}
        aria-label={`Pozrieť produkt ${product.name}`}
      />

      <div className="product-card__media">
        <img
          className="product-card__image"
          src={product.image}
          alt={product.name}
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="product-card__content">
        {cardBadges.length > 0 && (
          <div className="product-card__badge-row">
            {cardBadges.map((badge) => (
              <span key={badge} className="product-card__badge">
                {badge}
              </span>
            ))}
          </div>
        )}

        <ProductLanguageBadges languages={product.languages} />

        <h3 className="product-card__title">
          <Link className="product-card__title-link" to={destination} state={{ from }}>
            {product.name}
          </Link>
        </h3>
        {description && <p className="product-card__description">{description}</p>}
        {product.stockNote && (
          <div className="product-card__stock">{product.stockNote}</div>
        )}

        <div className="product-card__purchase">
          <div className="product-card__price">
            <span className="product-card__price-label">Cena</span>
            {product.originalPrice && (
              <span className="product-card__price-original">{product.originalPrice}</span>
            )}
            <span className="product-card__price-value">{price}</span>
            {product.shippingNote && (
              <span className="product-card__price-note">{product.shippingNote}</span>
            )}
          </div>
          <button
            className={`product-card__button${isPreviewProduct ? ' product-card__button--preview' : ''}`}
            type="button"
            onClick={handleCheckout}
            disabled={checkoutLoading || isPreviewProduct}
            aria-label={
              isPreviewProduct
                ? `Produkt zatiaľ nie je v predaji: ${product.name}`
                : needsVariantSelection
                  ? `Vybrať farebnú kombináciu produktu ${product.name}`
                  : `Kúpiť ${product.name}`
            }
          >
            <ShoppingCart size={16} />
            {buttonLabel}
          </button>
        </div>

        <Link className="product-card__hint" to={destination} state={{ from }}>
          Pozrieť detail
          <ArrowRight size={15} strokeWidth={2.4} />
        </Link>

        {checkoutError && (
          <div className="product-card__error">{checkoutError}</div>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
