import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { createCartCheckoutSession } from '../api/client';
import { useCart } from '../cart/useCart';
import { useProducts } from '../hooks/useProducts';
import { getProductTypeLabel, hasPhysicalDelivery } from '../utils/productTypes';
import '../styles/cart.css';

const formatMoneyMinor = (amountMinor, currency = 'eur') => {
  if (typeof amountMinor !== 'number') return 'Cena v pokladni';

  try {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: String(currency || 'eur').toUpperCase(),
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${String(currency || 'eur').toUpperCase()}`;
  }
};

const getCheckoutErrorMessage = (error) => {
  const code = error?.data?.error || error?.message;
  const messages = {
    cart_empty: 'Košík je prázdny.',
    cart_too_many_items: 'Košík obsahuje príliš veľa položiek.',
    cart_product_not_found: 'Niektorý produkt už nie je dostupný.',
    cart_product_unavailable: 'Niektorý produkt už nie je dostupný na nákup.',
    variant_required: 'Pri fyzickom produkte vyberte variant.',
    variant_unavailable: 'Niektorý variant už nie je dostupný.',
    variant_sold_out: 'Niektorý variant sa práve vypredal.',
    cart_mixed_currency: 'Produkty v košíku sa nedajú kúpiť spolu pre rozdielnu menu.',
    cart_shipping_unavailable: 'Pre kombináciu fyzických produktov nie je dostupné spoločné doručenie.',
    coupon_not_cart_eligible: 'Tento zľavový kód nie je platný pre košík.',
    coupon_not_combinable_with_sale: 'Zľavový kód sa nedá kombinovať s aktuálnou akciou.',
    coupon_invalid: 'Zľavový kód nie je platný.',
    coupon_expired: 'Zľavový kód už vypršal.',
    coupon_minimum_amount_not_met: 'Košík nespĺňa minimálnu hodnotu pre tento zľavový kód.',
  };

  return messages[code] || 'Pokladňu sa nepodarilo otvoriť. Skúste to prosím znova.';
};

const getCartLines = (cartItems, products) => {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));

  return cartItems.map((item) => {
    const product = productsBySlug.get(item.productSlug) || null;
    const isPhysical = hasPhysicalDelivery(product);
    const variant = isPhysical
      ? product.colorVariants?.find((candidate) => candidate.code === item.variantCode) || null
      : null;
    const quantity = isPhysical ? Number(item.quantity || 1) : 1;
    const maxQuantity = Math.max(1, Math.min(
      Number(product?.maxQuantity || 1),
      Number(variant?.available || product?.maxQuantity || 1)
    ));
    const unitAmount = isPhysical ? variant?.amount ?? product?.amount : product?.amount;
    const originalUnitAmount = isPhysical
      ? variant?.originalAmount ?? product?.originalAmount
      : product?.originalAmount;
    const currency = product?.currency || 'eur';
    const issues = [];

    if (!product || product.isMock || product.isPublished === false || product.status === 'archived') {
      issues.push('Produkt už nie je dostupný.');
    }
    if (isPhysical && !variant) issues.push('Vybraný variant už nie je dostupný.');
    if (isPhysical && variant && (variant.isActive === false || Number(variant.available || 0) <= 0)) {
      issues.push('Vybraný variant je vypredaný.');
    }
    if (isPhysical && variant && quantity > maxQuantity) {
      issues.push(`Znížte množstvo najviac na ${maxQuantity} ks.`);
    }
    if (product && typeof unitAmount !== 'number') {
      issues.push('Cena produktu nie je dostupná.');
    }

    return {
      ...item,
      product,
      variant,
      isPhysical,
      quantity,
      maxQuantity,
      unitAmount,
      originalUnitAmount,
      currency,
      issues,
      lineTotal: typeof unitAmount === 'number' ? unitAmount * quantity : 0,
    };
  });
};

const CartPage = () => {
  const [searchParams] = useSearchParams();
  const { items, removeItem, updateQuantity } = useCart();
  const { products, loading } = useProducts(true);
  const [couponCode, setCouponCode] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const cancelled = searchParams.get('checkout') === 'cancelled';

  const lines = useMemo(() => getCartLines(items, products), [items, products]);
  const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  const physicalLines = lines.filter((line) => line.isPhysical);
  const shippingAmount = physicalLines.length
    ? Math.max(...physicalLines.map((line) => Number(line.product?.shippingAmount || 0)))
    : 0;
  const currency = lines[0]?.currency || 'eur';
  const hasIssues = lines.some((line) => line.issues.length > 0);
  const isEmpty = items.length === 0;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      const session = await createCartCheckoutSession(
        items.map((item) => ({
          productSlug: item.productSlug,
          ...(item.variantCode ? { variantCode: item.variantCode } : {}),
          quantity: item.quantity,
        })),
        {
          couponCode: couponCode.trim().toUpperCase(),
        }
      );
      window.location.assign(session.checkoutUrl);
    } catch (err) {
      setCheckoutError(getCheckoutErrorMessage(err));
      setCheckoutLoading(false);
    }
  };

  if (isEmpty) {
    return (
      <div className="cart-page">
        <div className="container cart-page__container">
          <Link to="/?category=Produkty" className="cart-page__back">
            <ArrowLeft size={18} />
            Späť na produkty
          </Link>
          <section className="cart-page__empty">
            <ShoppingCart size={34} />
            <h1>Košík je prázdny</h1>
            <p>Vyberte si digitálny produkt alebo variant fyzického produktu a pridajte ho do košíka.</p>
            <Link to="/?category=Produkty" className="cart-page__primary-link">
              Zobraziť produkty
            </Link>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container cart-page__container">
        <Link to="/?category=Produkty" className="cart-page__back">
          <ArrowLeft size={18} />
          Pokračovať v nákupe
        </Link>

        <div className="cart-page__header">
          <div>
            <h1>Košík</h1>
            <p>{items.length} položiek pripravených na jednu bezpečnú platbu cez Stripe.</p>
          </div>
        </div>

        {cancelled && (
          <div className="cart-page__notice">
            Platba nebola dokončená. Položky zostali v košíku.
          </div>
        )}

        <div className="cart-page__layout">
          <section className="cart-page__items" aria-label="Položky v košíku">
            {loading && (
              <div className="cart-page__notice">Aktualizujem ceny a dostupnosť…</div>
            )}

            {lines.map((line) => (
              <article key={`${line.productSlug}-${line.variantCode || 'digital'}`} className="cart-item">
                <img
                  src={line.variant?.image || line.product?.image || '/zajo.png'}
                  alt={line.product?.name || line.productSlug}
                  className="cart-item__image"
                />
                <div className="cart-item__body">
                  <div className="cart-item__main">
                    <div>
                      <h2>{line.product?.name || line.productSlug}</h2>
                      {line.variant?.name && <p>Variant: {line.variant.name}</p>}
                      <p>{getProductTypeLabel(line.product)}</p>
                    </div>
                    <button
                      type="button"
                      className="cart-item__remove"
                      onClick={() => removeItem(line)}
                      aria-label={`Odstrániť ${line.product?.name || line.productSlug}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  {line.issues.length > 0 && (
                    <div className="cart-item__issues">
                      {line.issues.map((issue) => (
                        <span key={issue}>{issue}</span>
                      ))}
                    </div>
                  )}

                  <div className="cart-item__footer">
                    <div className="cart-item__price">
                      {typeof line.originalUnitAmount === 'number' && line.originalUnitAmount > line.unitAmount && (
                        <span>{formatMoneyMinor(line.originalUnitAmount, line.currency)}</span>
                      )}
                      <strong>{formatMoneyMinor(line.unitAmount, line.currency)}</strong>
                    </div>

                    {line.isPhysical ? (
                      <div className="cart-item__quantity" aria-label="Množstvo">
                        <button
                          type="button"
                          onClick={() => updateQuantity(line, line.quantity - 1)}
                          aria-label="Znížiť množstvo"
                        >
                          <Minus size={15} />
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(line, line.quantity + 1)}
                          disabled={line.quantity >= line.maxQuantity}
                          aria-label="Zvýšiť množstvo"
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="cart-item__fixed-quantity">1 ks</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="cart-summary" aria-label="Súhrn košíka">
            <h2>Súhrn</h2>
            <div className="cart-summary__row">
              <span>Medzisúčet</span>
              <strong>{formatMoneyMinor(subtotal, currency)}</strong>
            </div>
            {physicalLines.length > 0 && (
              <div className="cart-summary__row">
                <span>Doprava Packeta / Z-BOX</span>
                <strong>{formatMoneyMinor(shippingAmount, currency)}</strong>
              </div>
            )}
            <div className="cart-summary__total">
              <span>Odhad spolu</span>
              <strong>{formatMoneyMinor(subtotal + shippingAmount, currency)}</strong>
            </div>

            <label className="cart-summary__coupon">
              <span>Zľavový kód pre košík</span>
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                placeholder="KÓD"
                autoComplete="off"
              />
            </label>

            <button
              type="button"
              className="cart-summary__checkout"
              onClick={handleCheckout}
              disabled={checkoutLoading || loading || hasIssues}
            >
              <ShoppingCart size={18} />
              {checkoutLoading ? 'Otváram pokladňu…' : 'Prejsť do pokladne'}
            </button>

            {checkoutError && <div className="cart-summary__error">{checkoutError}</div>}
            {hasIssues && (
              <div className="cart-summary__error">
                Pred pokračovaním upravte alebo odstráňte nedostupné položky.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
