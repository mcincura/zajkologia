import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';

const inputStyle = { padding: '0.55rem 0.65rem', border: '1px solid #e5e1dc', borderRadius: '8px', width: '100%' };
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '0.3rem' };
const labelTextStyle = { fontSize: '0.78rem', color: '#66584f', fontWeight: 800 };
const buttonStyle = { background: 'white', color: '#55463d', border: '1px solid #ddd', padding: '0.45rem 0.65rem', borderRadius: '6px', fontWeight: 800 };

const emptySaleDraft = (product) => ({
  id: null,
  name: '',
  productSlug: product?.slug || '',
  variantCode: '',
  isActive: true,
  saleType: 'fixed_price',
  saleAmount: null,
  salePercent: null,
  compareAtAmount: null,
  label: '',
  description: '',
  startsAt: '',
  endsAt: '',
  sortOrder: 0,
});

const parseEuroToMinor = (value) => {
  const amount = Number(String(value || '').trim().replace(',', '.'));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
};

const formatMinorInput = (value) => value == null || value === '' ? '' : (Number(value) / 100).toFixed(2);

const formatDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const salePayload = (sale) => ({
  ...sale,
  variantCode: sale.variantCode || null,
  saleAmount: sale.saleType === 'percent_off' ? null : sale.saleAmount,
  salePercent: sale.saleType === 'percent_off' ? Number(sale.salePercent || 0) : null,
  compareAtAmount: sale.compareAtAmount || null,
  startsAt: sale.startsAt || null,
  endsAt: sale.endsAt || null,
});

const ProductPromotionsSection = ({ selectedProduct }) => {
  const [sales, setSales] = useState([]);
  const [saleDraft, setSaleDraft] = useState(() => emptySaleDraft(selectedProduct));
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const selectedProductSlug = selectedProduct?.slug || '';
  const variants = selectedProduct?.variants || selectedProduct?.colorVariants || [];

  const productSales = useMemo(
    () => sales.filter((sale) => sale.productSlug === selectedProductSlug),
    [sales, selectedProductSlug]
  );

  useEffect(() => {
    setSaleDraft((current) => current.id ? current : emptySaleDraft({ slug: selectedProductSlug }));
  }, [selectedProductSlug]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/products/admin/promotions');
      setSales(data.sales || []);
      setStatus('');
    } catch (error) {
      setStatus(`Sales load failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const saveSale = async () => {
    if (!selectedProduct) return;
    setBusy(true);
    setStatus('');
    try {
      const payload = salePayload({ ...saleDraft, productSlug: saleDraft.productSlug || selectedProduct.slug });
      await apiFetch(saleDraft.id ? `/api/products/admin/sales/${saleDraft.id}` : '/api/products/admin/sales', {
        method: saleDraft.id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      setSaleDraft(emptySaleDraft(selectedProduct));
      await loadSales();
      setStatus('Sale saved.');
    } catch (error) {
      setStatus(`Sale save failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleSale = async (sale) => {
    setBusy(true);
    try {
      await apiFetch(`/api/products/admin/sales/${sale.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...sale, isActive: !sale.isActive }),
      });
      await loadSales();
    } catch (error) {
      setStatus(`Sale toggle failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteSale = async (sale) => {
    if (!window.confirm(`Delete sale "${sale.name}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/products/admin/sales/${sale.id}`, { method: 'DELETE' });
      await loadSales();
      setStatus('Sale deleted.');
    } catch (error) {
      setStatus(`Sale delete failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!selectedProduct) return null;

  return (
    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1rem', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.8rem' }}>
        <div><h3 style={{ margin: 0 }}>Sales</h3><div style={{ fontSize: '0.82rem', color: '#6f6259', marginTop: '0.2rem' }}>Sales remain product-specific. Coupon rules and Stripe synchronization now live in <Link to="/admin/coupons">Admin → Coupons</Link>.</div></div>
        <button type="button" onClick={loadSales} disabled={loading} style={buttonStyle}>{loading ? 'Loading...' : 'Refresh'}</button>
      </div>
      {status && <div role="status" aria-live="polite" style={{ marginBottom: '0.8rem', padding: '0.55rem 0.65rem', background: 'white', border: '1px solid #eee', borderRadius: '8px', color: '#444' }}>{status}</div>}
      <section style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.85rem' }}>
        <h4 style={{ margin: '0 0 0.65rem' }}>{saleDraft.id ? 'Edit sale' : 'Add sale'}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem', alignItems: 'end' }}>
          <label style={labelStyle}><span style={labelTextStyle}>Name</span><input value={saleDraft.name} onChange={(event) => setSaleDraft({ ...saleDraft, name: event.target.value })} style={inputStyle} /></label>
          <label style={labelStyle}><span style={labelTextStyle}>Variant</span><select value={saleDraft.variantCode || ''} onChange={(event) => setSaleDraft({ ...saleDraft, variantCode: event.target.value })} style={inputStyle}><option value="">All variants</option>{variants.map((variant) => <option key={variant.code} value={variant.code}>{variant.name}</option>)}</select></label>
          <label style={labelStyle}><span style={labelTextStyle}>Type</span><select value={saleDraft.saleType} onChange={(event) => setSaleDraft({ ...saleDraft, saleType: event.target.value })} style={inputStyle}><option value="fixed_price">Fixed sale price</option><option value="amount_off">Amount off</option><option value="percent_off">Percent off</option></select></label>
          {saleDraft.saleType === 'percent_off' ? <label style={labelStyle}><span style={labelTextStyle}>Percent off</span><input type="number" min="1" max="99" value={saleDraft.salePercent || ''} onChange={(event) => setSaleDraft({ ...saleDraft, salePercent: Number(event.target.value) || null })} style={inputStyle} /></label> : <label style={labelStyle}><span style={labelTextStyle}>{saleDraft.saleType === 'fixed_price' ? 'Sale price EUR' : 'Amount off EUR'}</span><input value={formatMinorInput(saleDraft.saleAmount)} onChange={(event) => setSaleDraft({ ...saleDraft, saleAmount: parseEuroToMinor(event.target.value) })} style={inputStyle} /></label>}
          <label style={labelStyle}><span style={labelTextStyle}>Compare-at EUR</span><input value={formatMinorInput(saleDraft.compareAtAmount)} onChange={(event) => setSaleDraft({ ...saleDraft, compareAtAmount: parseEuroToMinor(event.target.value) })} style={inputStyle} /></label>
          <label style={labelStyle}><span style={labelTextStyle}>Label</span><input value={saleDraft.label || ''} onChange={(event) => setSaleDraft({ ...saleDraft, label: event.target.value })} style={inputStyle} /></label>
          <label style={labelStyle}><span style={labelTextStyle}>Description</span><input value={saleDraft.description || ''} onChange={(event) => setSaleDraft({ ...saleDraft, description: event.target.value })} style={inputStyle} /></label>
          <label style={labelStyle}><span style={labelTextStyle}>Starts</span><input type="datetime-local" value={formatDateTimeInput(saleDraft.startsAt)} onChange={(event) => setSaleDraft({ ...saleDraft, startsAt: event.target.value })} style={inputStyle} /></label>
          <label style={labelStyle}><span style={labelTextStyle}>Ends</span><input type="datetime-local" value={formatDateTimeInput(saleDraft.endsAt)} onChange={(event) => setSaleDraft({ ...saleDraft, endsAt: event.target.value })} style={inputStyle} /></label>
          <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', paddingBottom: '0.55rem' }}><input type="checkbox" checked={Boolean(saleDraft.isActive)} onChange={(event) => setSaleDraft({ ...saleDraft, isActive: event.target.checked })} /><span style={labelTextStyle}>Active</span></label>
          <div style={{ display: 'flex', gap: '0.45rem' }}><button type="button" onClick={saveSale} disabled={busy} style={{ ...buttonStyle, background: 'var(--color-dark)', color: 'white' }}>{saleDraft.id ? 'Save sale' : 'Add sale'}</button>{saleDraft.id && <button type="button" onClick={() => setSaleDraft(emptySaleDraft(selectedProduct))} style={buttonStyle}>Cancel</button>}</div>
        </div>
        <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.8rem' }}>
          {productSales.map((sale) => <div key={sale.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'center', border: '1px solid #eee', borderRadius: '8px', padding: '0.65rem' }}><div><strong>{sale.name}</strong><div style={{ fontSize: '0.8rem', color: '#6f6259' }}>{sale.isActive ? 'Active' : 'Off'} · {sale.variantCode || 'all variants'} · {sale.saleType}</div></div><div style={{ display: 'flex', gap: '0.4rem' }}><button type="button" onClick={() => setSaleDraft(sale)} style={buttonStyle}>Edit</button><button type="button" onClick={() => toggleSale(sale)} disabled={busy} style={buttonStyle}>{sale.isActive ? 'Turn off' : 'Turn on'}</button><button type="button" onClick={() => deleteSale(sale)} disabled={busy} style={{ ...buttonStyle, color: '#a40000' }}>Delete</button></div></div>)}
          {!productSales.length && <div style={{ color: '#777', fontSize: '0.85rem' }}>No sales for this product yet.</div>}
        </div>
      </section>
    </div>
  );
};

export default ProductPromotionsSection;
