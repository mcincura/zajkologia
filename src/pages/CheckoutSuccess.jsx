import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Mail, PackageCheck, Tag } from 'lucide-react';
import { apiFetch } from '../api/client';
import { useCart } from '../cart/useCart';
import { clearStoredWelcomeDiscountOffer, suppressEmailCaptureOffers } from '../utils/welcomeDiscount';
import '../styles/checkout-success.css';

const COMPLETED_ORDER_STATES = new Set(['paid', 'fulfilled', 'partially_refunded', 'refunded']);

const formatMoneyMinor = (amountMinor, currency = 'eur') => {
  try {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: String(currency || 'eur').toUpperCase(),
    }).format(Number(amountMinor || 0) / 100);
  } catch {
    return `${(Number(amountMinor || 0) / 100).toFixed(2)} ${String(currency || 'eur').toUpperCase()}`;
  }
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
  const { clearCart, removeCoupon } = useCart();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!sessionId) {
        setStatus('missing');
        return;
      }
      try {
        let loadedOrder = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const data = await apiFetch(`/api/stripe/checkout-session/${encodeURIComponent(sessionId)}`);
          loadedOrder = data?.order || null;
          if (cancelled || COMPLETED_ORDER_STATES.has(loadedOrder?.status)) break;
          await delay(1200);
        }
        if (cancelled) return;
        setOrder(loadedOrder);
        const completed = COMPLETED_ORDER_STATES.has(loadedOrder?.status);
        setStatus(completed ? 'loaded' : 'confirming');
        if (completed) {
          if (loadedOrder?.checkoutKind === 'cart') clearCart();
          removeCoupon();
          clearStoredWelcomeDiscountOffer();
          suppressEmailCaptureOffers('purchased');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [clearCart, removeCoupon, sessionId]);

  const hasDigitalItems = Boolean(order?.hasDigitalItems);
  const hasPhysicalItems = Boolean(order?.hasPhysicalItems);
  const isMixedOrder = hasDigitalItems && hasPhysicalItems;
  const isPhysicalOrder = hasPhysicalItems && !hasDigitalItems;
  const successTitle = isMixedOrder
    ? 'Ďakujeme za objednávku'
    : isPhysicalOrder
      ? 'Ďakujeme za predobjednávku'
      : 'Ďakujeme za nákup';
  const guidanceText = isMixedOrder
    ? 'Platba bola potvrdená. PDF produkty pošleme ako bezpečný odkaz na e-mail a fyzické položky pripravíme na doručenie.'
    : isPhysicalOrder
      ? 'Platba bola potvrdená. Predobjednávku sme zaevidovali a produkt pripravíme na doručenie.'
      : 'Platba bola potvrdená. PDF doručíme bezpečným odkazom na e-mail zadaný v pokladni.';

  const amountTotal = useMemo(() => {
    if (order?.amountTotal != null) return Number(order.amountTotal);
    return Number(order?.subtotalAmount || 0) - Number(order?.discountAmount || 0) + Number(order?.shippingAmount || 0);
  }, [order]);

  if (status === 'loading') {
    return <main className="checkout-success"><Clock3 size={34} /><h1>Overujeme platbu…</h1><p>Prosím, nezatvárajte túto stránku.</p></main>;
  }

  if (status === 'missing') {
    return <main className="checkout-success" role="alert"><h1>Chýba identifikátor objednávky</h1><p>Otvorte prosím odkaz, ktorý vás sem presmeroval zo Stripe pokladne.</p><Link to="/">Späť na Zajkológiu</Link></main>;
  }

  return (
    <main className="checkout-success">
      {status === 'loaded' ? <CheckCircle2 size={38} aria-hidden="true" /> : <Clock3 size={38} aria-hidden="true" />}
      <h1>{status === 'loaded' ? successTitle : 'Platbu ešte potvrdzujeme'}</h1>
      <p>{status === 'loaded' ? guidanceText : 'Stripe nás presmeroval späť, ale čakáme na bezpečné potvrdenie platby. Váš košík ani zľavu zatiaľ nemažeme.'}</p>

      {order && (
        <section className="checkout-success__order" aria-label="Súhrn objednávky">
          <div className="checkout-success__header">
            <div><span>Objednávka</span><strong>{order.id}</strong></div>
            <span className="checkout-success__status">{order.status}</span>
          </div>

          <div className="checkout-success__items">
            {(order.items || []).map((item) => (
              <div className="checkout-success__item" key={`${item.productSlug}-${item.variantCode || 'digital'}`}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>{item.variantName ? `Variant: ${item.variantName} · ` : ''}{item.quantity} ks</span>
                </div>
                <div>
                  {item.discountAmount > 0 && <span>− {formatMoneyMinor(item.discountAmount, item.currency)}</span>}
                  <strong>{formatMoneyMinor(item.netAmount, item.currency)}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="checkout-success__totals">
            <div><span>Medzisúčet</span><strong>{formatMoneyMinor(order.subtotalAmount, order.currency)}</strong></div>
            {order.discountAmount > 0 && (
              <div className="checkout-success__discount"><span><Tag size={15} />Zľava {order.couponCode}</span><strong>− {formatMoneyMinor(order.discountAmount, order.currency)}</strong></div>
            )}
            {order.shippingAmount > 0 && <div><span>Doprava</span><strong>{formatMoneyMinor(order.shippingAmount, order.shippingCurrency || order.currency)}</strong></div>}
            <div className="checkout-success__total"><span>Spolu</span><strong>{formatMoneyMinor(amountTotal, order.currency)}</strong></div>
          </div>
        </section>
      )}

      {status === 'loaded' && (
        <div className="checkout-success__guidance">
          {hasPhysicalItems ? <PackageCheck size={22} /> : <Mail size={22} />}
          <div><strong>{hasPhysicalItems ? 'Objednávka je uložená.' : 'Skontrolujte si e-mail.'}</strong><span>{isMixedOrder ? 'Digitálne produkty nájdete v e-maile, fyzické položky pripravíme na doručenie.' : hasPhysicalItems ? 'Doručovacie údaje máme zo Stripe pokladne.' : 'V e-maile nájdete bezpečný odkaz na stiahnutie.'}</span></div>
        </div>
      )}

      {status === 'error' && <p className="checkout-success__error" role="alert">Stav objednávky sa nepodarilo načítať. Košík ani zľavu sme neodstránili; skúste stránku obnoviť.</p>}
      <Link className="checkout-success__back" to="/">Späť na Zajkológiu</Link>
    </main>
  );
};

export default CheckoutSuccess;
