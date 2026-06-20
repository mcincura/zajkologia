import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, PackageCheck } from 'lucide-react';
import { apiFetch } from '../api/client';
import {
  clearStoredWelcomeDiscountOffer,
  suppressEmailCaptureOffers,
} from '../utils/welcomeDiscount';

const CheckoutSuccess = () => {
  const [searchParams] = useSearchParams();
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

      clearStoredWelcomeDiscountOffer();
      suppressEmailCaptureOffers('purchased');

      try {
        const data = await apiFetch(`/api/stripe/checkout-session/${encodeURIComponent(sessionId)}`);
        if (cancelled) return;
        setOrder(data?.order || null);
        setStatus('loaded');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const isPhysicalOrder = order?.orderType === 'physical';
  const primaryOrderItem = order?.items?.[0] || null;

  return (
    <div className="container" style={{ padding: '4rem 0', maxWidth: '760px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
        <CheckCircle2 size={34} color="#2f7d32" />
        <h1 style={{ margin: 0, fontSize: '2rem' }}>
          {isPhysicalOrder ? 'Ďakujeme za predobjednávku' : 'Ďakujeme za nákup'}
        </h1>
      </div>

      <p style={{ color: '#555', lineHeight: 1.7, fontSize: '1.05rem' }}>
        {isPhysicalOrder
          ? 'Platba bola prijatá. Predobjednávku sme zaevidovali a ručne vyrábaný produkt pripravíme na doručenie.'
          : 'Platba bola prijatá. PDF príručku doručíme na e-mail zadaný v pokladni spolu s potvrdením objednávky.'}
      </p>

      <div
        style={{
          marginTop: '1.5rem',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          background: '#fdf6f6',
          border: '1px solid #eccfc3',
          color: '#6b4c3b',
          display: 'flex',
          gap: '0.8rem',
          alignItems: 'flex-start',
        }}
      >
        {isPhysicalOrder ? <PackageCheck size={22} /> : <Mail size={22} />}
        <div>
          <strong>{isPhysicalOrder ? 'Predobjednávka je uložená.' : 'Skontrolujte si e-mail.'}</strong>
          <div style={{ marginTop: '0.35rem', lineHeight: 1.6 }}>
            {isPhysicalOrder
              ? 'Doručovacie údaje máme z pokladne. O ďalšom stave objednávky vás budeme informovať.'
              : 'Ak správu nevidíte do pár minút, skontrolujte aj priečinok spam alebo promo.'}
          </div>
        </div>
      </div>

      {status === 'loaded' && order && (
        <div style={{ marginTop: '1.5rem', color: '#555', lineHeight: 1.7 }}>
          <div>Objednávka: <strong>{order.id}</strong></div>
          <div>Produkt: <strong>{order.productName}</strong></div>
          {primaryOrderItem?.variantName && (
            <div>Farba: <strong>{primaryOrderItem.variantName}</strong></div>
          )}
          <div>Stav: <strong>{order.status}</strong></div>
        </div>
      )}

      {status === 'error' && (
        <p style={{ color: '#8a1c2b', marginTop: '1.5rem', fontWeight: 700 }}>
          Stav objednávky sa nepodarilo načítať, ale ak platba prešla, objednávku spracujeme.
        </p>
      )}

      <Link
        to="/"
        style={{
          display: 'inline-flex',
          marginTop: '2rem',
          color: '#6b4c3b',
          fontWeight: 800,
          textDecoration: 'underline',
        }}
      >
        Späť na Zajkológiu
      </Link>
    </div>
  );
};

export default CheckoutSuccess;
