import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Minus, Plus, ShoppingCart, Tag, Trash2, X } from 'lucide-react';
import { createCartCheckoutSession, quoteCheckout } from '../api/client';
import { useCart } from '../cart/useCart';
import { useProducts } from '../hooks/useProducts';
import { getCouponErrorMessage, normalizeCouponCode } from '../utils/couponErrors';
import { getProductTypeLabel, hasPhysicalDelivery } from '../utils/productTypes';
import '../styles/cart.css';

const COUPON_REMOVED_MESSAGE = 'Zľavový kód bol odstránený.';

const formatMoneyMinor = (amountMinor, currency = 'eur') => {
  if (!Number.isFinite(Number(amountMinor))) return 'Cena v pokladni';
  try {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: String(currency || 'eur').toUpperCase(),
    }).format(Number(amountMinor) / 100);
  } catch {
    return `${(Number(amountMinor) / 100).toFixed(2)} ${String(currency || 'eur').toUpperCase()}`;
  }
};

const getCartLines = (cartItems, products) => {
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));
  return cartItems.map((item) => {
    const product = productsBySlug.get(item.productSlug) || null;
    const isPhysical = hasPhysicalDelivery(product);
    const variant = isPhysical
      ? product?.colorVariants?.find((candidate) => candidate.code === item.variantCode) || null
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
    if (product && !Number.isFinite(Number(unitAmount))) issues.push('Cena produktu nie je dostupná.');
    return {
      ...item,
      product,
      variant,
      isPhysical,
      quantity,
      maxQuantity,
      unitAmount,
      originalUnitAmount,
      currency: product?.currency || 'eur',
      issues,
      lineTotal: Number.isFinite(Number(unitAmount)) ? Number(unitAmount) * quantity : 0,
    };
  });
};

const CartPage = () => {
  const [searchParams] = useSearchParams();
  const { items, coupon, removeItem, updateQuantity, applyCoupon, removeCoupon } = useCart();
  const { products, loading } = useProducts(true);
  const [couponDraft, setCouponDraft] = useState(coupon?.code || '');
  const [quote, setQuote] = useState(null);
  const [quoteState, setQuoteState] = useState('loading');
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState('status');
  const [applyLoading, setApplyLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const requestSequence = useRef(0);
  const couponInputRef = useRef(null);
  const messageRef = useRef(null);
  const focusCouponAfterRemoveRef = useRef(false);
  const cancelled = searchParams.get('checkout') === 'cancelled';

  useEffect(() => setCouponDraft(coupon?.code || ''), [coupon?.code]);

  useEffect(() => {
    if (coupon || !focusCouponAfterRemoveRef.current) return;
    focusCouponAfterRemoveRef.current = false;
    requestAnimationFrame(() => couponInputRef.current?.focus());
  }, [coupon]);

  const checkoutItems = useMemo(() => items.map((item) => ({
    productSlug: item.productSlug,
    ...(item.variantCode ? { variantCode: item.variantCode } : {}),
    quantity: item.quantity,
  })), [items]);
  const lines = useMemo(() => getCartLines(items, products), [items, products]);
  const localSubtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
  const physicalLines = lines.filter((line) => line.isPhysical);
  const localShipping = physicalLines.length
    ? Math.max(...physicalLines.map((line) => Number(line.product?.shippingAmount || 0)))
    : 0;
  const localCurrency = lines[0]?.currency || 'eur';
  const hasIssues = lines.some((line) => line.issues.length > 0);
  const isEmpty = items.length === 0;

  useEffect(() => {
    if (!checkoutItems.length) {
      setQuote(null);
      setQuoteState('idle');
      return undefined;
    }
    const currentRequest = requestSequence.current + 1;
    requestSequence.current = currentRequest;
    setQuoteState('loading');
    const run = async () => {
      try {
        const nextQuote = await quoteCheckout(checkoutItems, {
          ...(coupon?.code ? { couponCode: coupon.code } : {}),
          ...(coupon?.claimToken ? { claimToken: coupon.claimToken } : {}),
        });
        if (requestSequence.current !== currentRequest) return;
        setQuote(nextQuote);
        setQuoteState('loaded');
        if (coupon && nextQuote?.coupon) {
          setMessage(`Kód ${nextQuote.normalizedCode} je použitý. Ušetríte ${formatMoneyMinor(nextQuote.discountAmount, nextQuote.currency)}.`);
          setMessageKind('success');
        } else if (!coupon) {
          setMessage((current) => current === COUPON_REMOVED_MESSAGE ? current : '');
          setMessageKind('status');
        }
      } catch (error) {
        if (requestSequence.current !== currentRequest) return;
        setQuote(null);
        setQuoteState('error');
        setMessage(getCouponErrorMessage(error, 'Ceny sa nepodarilo overiť. Skúste to prosím znova.'));
        setMessageKind('error');
      }
    };
    run();
    return () => {
      if (requestSequence.current === currentRequest) requestSequence.current += 1;
    };
  }, [checkoutItems, coupon]);

  const handleApplyCoupon = async (event) => {
    event.preventDefault();
    const normalizedCode = normalizeCouponCode(couponDraft);
    if (!normalizedCode) {
      setMessage('Zadajte zľavový kód.');
      setMessageKind('error');
      couponInputRef.current?.focus();
      return;
    }
    setApplyLoading(true);
    setMessage('Overujem zľavový kód…');
    setMessageKind('status');
    try {
      const matchingClaimToken = coupon?.code === normalizedCode ? coupon.claimToken : '';
      const nextQuote = await quoteCheckout(checkoutItems, {
        couponCode: normalizedCode,
        ...(matchingClaimToken ? { claimToken: matchingClaimToken } : {}),
      });
      setQuote(nextQuote);
      setQuoteState('loaded');
      applyCoupon({
        code: nextQuote.normalizedCode,
        ...(matchingClaimToken ? { claimToken: matchingClaimToken } : {}),
        source: matchingClaimToken ? 'welcome' : 'manual',
      });
      setMessage(`Kód ${nextQuote.normalizedCode} je použitý. Ušetríte ${formatMoneyMinor(nextQuote.discountAmount, nextQuote.currency)}.`);
      setMessageKind('success');
    } catch (error) {
      setMessage(getCouponErrorMessage(error));
      setMessageKind('error');
      requestAnimationFrame(() => messageRef.current?.focus());
    } finally {
      setApplyLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    focusCouponAfterRemoveRef.current = true;
    removeCoupon();
    setCouponDraft('');
    setMessage(COUPON_REMOVED_MESSAGE);
    setMessageKind('status');
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setMessage('Ešte raz overujem ceny a dostupnosť…');
    setMessageKind('status');
    try {
      const session = await createCartCheckoutSession(checkoutItems, {
        ...(coupon?.code ? { couponCode: coupon.code } : {}),
        ...(coupon?.claimToken ? { claimToken: coupon.claimToken } : {}),
      });
      window.location.assign(session.checkoutPageUrl || session.checkoutUrl);
    } catch (error) {
      setMessage(getCouponErrorMessage(error, 'Pokladňu sa nepodarilo otvoriť. Skúste to prosím znova.'));
      setMessageKind('error');
      setCheckoutLoading(false);
      requestAnimationFrame(() => messageRef.current?.focus());
    }
  };

  if (isEmpty) {
    return (
      <div className="cart-page">
        <div className="container cart-page__container">
          <Link to="/?category=Produkty" className="cart-page__back"><ArrowLeft size={18} />Späť na produkty</Link>
          <section className="cart-page__empty">
            <ShoppingCart size={34} />
            <h1>Košík je prázdny</h1>
            {coupon ? <p>Váš kód {coupon.code} zostáva uložený pre ďalší nákup.</p> : <p>Vyberte si produkt a pridajte ho do košíka.</p>}
            <Link to="/?category=Produkty" className="cart-page__primary-link">Zobraziť produkty</Link>
          </section>
        </div>
      </div>
    );
  }

  const currency = quote?.currency || localCurrency;
  const subtotal = quote?.subtotal ?? localSubtotal;
  const shippingAmount = quote?.shippingAmount ?? localShipping;
  const discountAmount = quote?.discountAmount || 0;
  const total = quote?.total ?? subtotal + shippingAmount;
  const quoteReady = quoteState === 'loaded' && (!coupon || Boolean(quote?.coupon));

  return (
    <div className="cart-page">
      <div className="container cart-page__container">
        <Link to="/?category=Produkty" className="cart-page__back"><ArrowLeft size={18} />Pokračovať v nákupe</Link>
        <header className="cart-page__header"><div><h1>Košík</h1><p>{items.length} položiek pripravených na bezpečnú platbu cez Stripe.</p></div></header>
        {cancelled && <div className="cart-page__notice" role="status">Platba nebola dokončená. Položky aj použitý zľavový kód zostali uložené.</div>}

        <div className="cart-page__layout">
          <section className="cart-page__items" aria-label="Položky v košíku">
            {loading && <div className="cart-page__notice" role="status">Aktualizujem ceny a dostupnosť…</div>}
            {lines.map((line, index) => {
              const quotedLine = quote?.items?.[index];
              return (
                <article key={`${line.productSlug}-${line.variantCode || 'digital'}`} className="cart-item">
                  <img src={line.variant?.image || line.product?.image || '/zajo.png'} alt="" className="cart-item__image" />
                  <div className="cart-item__body">
                    <div className="cart-item__main">
                      <div><h2>{line.product?.name || line.productSlug}</h2>{line.variant?.name && <p>Variant: {line.variant.name}</p>}<p>{getProductTypeLabel(line.product)}</p></div>
                      <button type="button" className="cart-item__remove" onClick={() => removeItem(line)} aria-label={`Odstrániť ${line.product?.name || line.productSlug}`}><Trash2 size={17} /></button>
                    </div>
                    {line.issues.length > 0 && <div className="cart-item__issues" role="alert">{line.issues.map((issue) => <span key={issue}>{issue}</span>)}</div>}
                    <div className="cart-item__footer">
                      <div className="cart-item__price">
                        {typeof line.originalUnitAmount === 'number' && line.originalUnitAmount > line.unitAmount && <span>{formatMoneyMinor(line.originalUnitAmount, line.currency)}</span>}
                        <strong>{formatMoneyMinor(quotedLine?.netAmount ?? line.lineTotal, line.currency)}</strong>
                        {quotedLine?.discountAmount > 0 && <em>− {formatMoneyMinor(quotedLine.discountAmount, line.currency)}</em>}
                      </div>
                      {line.isPhysical ? (
                        <div className="cart-item__quantity" aria-label={`Množstvo produktu ${line.product?.name || line.productSlug}`}>
                          <button type="button" onClick={() => updateQuantity(line, line.quantity - 1)} aria-label="Znížiť množstvo"><Minus size={15} /></button>
                          <span aria-live="polite">{line.quantity}</span>
                          <button type="button" onClick={() => updateQuantity(line, line.quantity + 1)} disabled={line.quantity >= line.maxQuantity} aria-label="Zvýšiť množstvo"><Plus size={15} /></button>
                        </div>
                      ) : <span className="cart-item__fixed-quantity">1 ks</span>}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <aside className="cart-summary" aria-label="Súhrn košíka">
            <div className="cart-summary__heading"><h2>Súhrn</h2>{quoteReady && <span><Check size={14} />Overené serverom</span>}</div>
            <div className="cart-summary__row"><span>Medzisúčet</span><strong>{formatMoneyMinor(subtotal, currency)}</strong></div>
            {discountAmount > 0 && <div className="cart-summary__row cart-summary__row--discount"><span>Zľava {quote?.normalizedCode}</span><strong>− {formatMoneyMinor(discountAmount, currency)}</strong></div>}
            {physicalLines.length > 0 && <div className="cart-summary__row"><span>Doprava Packeta / Z-BOX</span><strong>{formatMoneyMinor(shippingAmount, currency)}</strong></div>}
            <div className="cart-summary__total"><span>Spolu</span><strong>{formatMoneyMinor(total, currency)}</strong></div>

            {coupon && quote?.coupon ? (
              <div className="cart-summary__applied">
                <Tag size={18} />
                <div><strong>{quote.couponName || quote.normalizedCode}</strong><span>Kód {quote.normalizedCode} je použitý</span></div>
                <button type="button" onClick={handleRemoveCoupon} aria-label={`Odstrániť kód ${quote.normalizedCode}`}><X size={17} />Odstrániť</button>
              </div>
            ) : (
              <form className="cart-summary__coupon" onSubmit={handleApplyCoupon} noValidate>
                <label htmlFor="cart-coupon-code">Zľavový kód</label>
                <div>
                  <input id="cart-coupon-code" ref={couponInputRef} value={couponDraft} onChange={(event) => setCouponDraft(event.target.value.toUpperCase())} placeholder="ZADAJTE KÓD" autoComplete="off" disabled={applyLoading} />
                  <button type="submit" disabled={applyLoading || quoteState === 'loading'}>{applyLoading ? 'Overujem…' : 'Použiť'}</button>
                </div>
                {coupon && (
                  <button type="button" className="cart-summary__coupon-remove" onClick={handleRemoveCoupon}>
                    <X size={16} />Odstrániť uložený kód {coupon.code}
                  </button>
                )}
              </form>
            )}

            <div ref={messageRef} tabIndex={messageKind === 'error' ? -1 : undefined} className={`cart-summary__message cart-summary__message--${messageKind}`} role={messageKind === 'error' ? 'alert' : 'status'} aria-live={messageKind === 'error' ? 'assertive' : 'polite'}>{message}</div>
            <button type="button" className="cart-summary__checkout" onClick={handleCheckout} disabled={checkoutLoading || loading || hasIssues || !quoteReady}>
              <ShoppingCart size={18} />{checkoutLoading ? 'Otváram pokladňu…' : quoteState === 'loading' ? 'Overujem ceny…' : 'Prejsť do pokladne'}
            </button>
            {hasIssues && <div className="cart-summary__message cart-summary__message--error" role="alert">Pred pokračovaním upravte alebo odstráňte nedostupné položky.</div>}
            <p className="cart-summary__trust">Zľavu aj ceny ešte raz bezpečne overíme pri otvorení Stripe pokladne.</p>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
