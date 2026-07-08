import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useCart } from '../cart/useCart';
import ProductLanguageBadges from './ProductLanguageBadges';
import { PRODUCT_PAGE_TEMPLATE, inferProductPageTemplate } from '../utils/productTemplates';
import { PRODUCT_TYPE, requiresVariantSelection } from '../utils/productTypes';
import '../styles/products.css';

const ProductCard = ({ product, accentColor = '#eccfc3' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const from = location.pathname + location.search;
  const destination = `/product/${product.slug}`;
  const isPreviewProduct = Boolean(product.isMock);
  const productTemplate = inferProductPageTemplate(product);
  const needsVariantSelection = requiresVariantSelection(product);

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isPreviewProduct) return;
    if (needsVariantSelection) {
      navigate(destination, { state: { from } });
      return;
    }
    addItem({ product, productSlug: product.slug, productType: PRODUCT_TYPE.DIGITAL, quantity: 1 });
    setAdded(true);
  };

  const description = product.shortDescription || product.description || '';
  const price = product.price || 'Cena v pokladni';
  const cardBadges = [product.preorderNote, product.saleLabel].filter(Boolean);
  const buttonLabel = isPreviewProduct
    ? product.purchaseLabel || 'Čoskoro'
    : added && !needsVariantSelection
      ? 'Pridané'
      : needsVariantSelection
        ? product.purchaseLabel ||
          (productTemplate === PRODUCT_PAGE_TEMPLATE.PHYSICAL_PREORDER ? 'Vybrať farbu' : 'Vybrať variant')
        : 'Pridať';

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
            onClick={handleAddToCart}
            disabled={isPreviewProduct}
            aria-label={
              isPreviewProduct
                ? `Produkt zatiaľ nie je v predaji: ${product.name}`
                : needsVariantSelection
                  ? `Vybrať farebnú kombináciu produktu ${product.name}`
                  : `Pridať ${product.name} do košíka`
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
      </div>
    </article>
  );
};

export default ProductCard;
