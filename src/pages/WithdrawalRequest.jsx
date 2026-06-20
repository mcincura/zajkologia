import React, { useState } from 'react';
import { apiFetch } from '../api/client';

const requestTypes = [
  { value: 'withdrawal', label: 'Odstúpenie od zmluvy' },
  { value: 'pre_ship_cancel', label: 'Zrušenie pred odoslaním' },
  { value: 'defect_complaint', label: 'Reklamácia / chyba produktu' },
  { value: 'other', label: 'Iná žiadosť' },
];

const WithdrawalRequest = () => {
  const [form, setForm] = useState({
    orderId: '',
    email: '',
    requestType: 'withdrawal',
    requestedAmount: '',
    customerReason: '',
    customerNotes: '',
    returnTrackingNumber: '',
  });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));

  const onSubmit = async (event) => {
    event.preventDefault();
    setStatus('');
    setError('');

    const orderId = form.orderId.trim();
    if (!orderId || !form.email.trim()) {
      setError('Vyplňte číslo objednávky a e-mail z objednávky.');
      return;
    }

    setBusy(true);
    try {
      await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/refund-request`, {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          requestType: form.requestType,
          requestedAmount: form.requestedAmount
            ? Math.round(Number(String(form.requestedAmount).replace(',', '.')) * 100)
            : null,
          customerReason: form.customerReason,
          customerNotes: form.customerNotes,
          returnTrackingNumber: form.returnTrackingNumber,
        }),
      });
      setStatus('Žiadosť bola odoslaná na manuálne posúdenie. Ozveme sa vám e-mailom.');
      setForm({
        orderId: '',
        email: '',
        requestType: 'withdrawal',
        requestedAmount: '',
        customerReason: '',
        customerNotes: '',
        returnTrackingNumber: '',
      });
    } catch (err) {
      if (err?.data?.error === 'order_email_mismatch') {
        setError('E-mail sa nezhoduje s e-mailom pri objednávke.');
      } else if (err?.data?.error === 'order_not_paid') {
        setError('K tejto objednávke zatiaľ neevidujeme prijatú platbu.');
      } else {
        setError('Žiadosť sa nepodarilo odoslať. Skontrolujte údaje alebo nám napíšte e-mail.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '780px', padding: '4rem 0' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>Odstúpenie od zmluvy</h1>
      <p style={{ color: '#4b5563', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        Tento formulár slúži na odoslanie žiadosti k objednávke. Žiadosť uložíme ako podklad
        na manuálne posúdenie. Vrátenie platby nikdy nespúšťa automaticky zákaznícky formulár.
      </p>

      <form
        onSubmit={onSubmit}
        style={{
          display: 'grid',
          gap: '1rem',
          background: 'white',
          border: '1px solid rgba(122, 63, 0, 0.12)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: 'var(--shadow)',
        }}
      >
        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: '#2b1105' }}>Číslo objednávky</span>
          <input
            value={form.orderId}
            onChange={(event) => updateForm({ orderId: event.target.value })}
            placeholder="napr. UUID objednávky z potvrdenia"
            style={{ padding: '0.72rem 0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: '#2b1105' }}>E-mail z objednávky</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => updateForm({ email: event.target.value })}
            style={{ padding: '0.72rem 0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: '#2b1105' }}>Typ žiadosti</span>
          <select
            value={form.requestType}
            onChange={(event) => updateForm({ requestType: event.target.value })}
            style={{ padding: '0.72rem 0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          >
            {requestTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: '#2b1105' }}>Požadovaná suma v EUR</span>
          <input
            inputMode="decimal"
            value={form.requestedAmount}
            onChange={(event) => updateForm({ requestedAmount: event.target.value })}
            placeholder="voliteľné"
            style={{ padding: '0.72rem 0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: '#2b1105' }}>Stručný dôvod</span>
          <input
            value={form.customerReason}
            onChange={(event) => updateForm({ customerReason: event.target.value })}
            placeholder="napr. odstúpenie do 14 dní, poškodený produkt"
            style={{ padding: '0.72rem 0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: '#2b1105' }}>Poznámka</span>
          <textarea
            rows={5}
            value={form.customerNotes}
            onChange={(event) => updateForm({ customerNotes: event.target.value })}
            style={{ padding: '0.72rem 0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px', resize: 'vertical' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '0.35rem' }}>
          <span style={{ fontWeight: 800, color: '#2b1105' }}>Číslo spätnej zásielky</span>
          <input
            value={form.returnTrackingNumber}
            onChange={(event) => updateForm({ returnTrackingNumber: event.target.value })}
            placeholder="voliteľné"
            style={{ padding: '0.72rem 0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          style={{
            justifySelf: 'start',
            background: '#341320',
            color: 'white',
            padding: '0.78rem 1.05rem',
            borderRadius: '999px',
            fontWeight: 900,
          }}
        >
          {busy ? 'Odosielam…' : 'Odstúpiť od zmluvy / odoslať žiadosť'}
        </button>

        {status && <div style={{ color: '#166534', fontWeight: 800 }}>{status}</div>}
        {error && <div style={{ color: '#8a1c2b', fontWeight: 800 }}>{error}</div>}
      </form>
    </div>
  );
};

export default WithdrawalRequest;
