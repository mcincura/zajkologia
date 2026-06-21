import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../api/client';

const inputStyle = {
  padding: '0.55rem 0.65rem',
  border: '1px solid #e5e1dc',
  borderRadius: '8px',
  width: '100%',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.3rem',
};

const labelTextStyle = {
  fontSize: '0.78rem',
  color: '#66584f',
  fontWeight: 800,
};

const buttonStyle = {
  background: 'white',
  color: '#55463d',
  border: '1px solid #ddd',
  padding: '0.45rem 0.65rem',
  borderRadius: '6px',
  fontWeight: 800,
};

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

const emptyCouponDraft = (product) => ({
  id: null,
  code: '',
  name: '',
  isActive: true,
  discountType: 'percent_off',
  percentOff: 10,
  amountOff: null,
  currency: 'eur',
  scope: 'product',
  productSlug: product?.slug || '',
  variantCode: '',
  minimumAmount: null,
  maxRedemptions: null,
  redeemBy: '',
  allowWithSales: false,
});

const parseEuroToMinor = (value) => {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
};

const formatMinorInput = (value) => {
  if (value == null || value === '') return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return (amount / 100).toFixed(2);
};

const formatDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const salePayload = (sale) => ({
  ...sale,
  productSlug: sale.productSlug,
  variantCode: sale.variantCode || null,
  saleAmount: sale.saleType === 'percent_off' ? null : sale.saleAmount,
  salePercent: sale.saleType === 'percent_off' ? Number(sale.salePercent || 0) : null,
  compareAtAmount: sale.compareAtAmount || null,
  startsAt: sale.startsAt || null,
  endsAt: sale.endsAt || null,
});

const couponPayload = (coupon) => ({
  ...coupon,
  code: String(coupon.code || '').trim().toUpperCase(),
  percentOff: coupon.discountType === 'percent_off' ? Number(coupon.percentOff || 0) : null,
  amountOff: coupon.discountType === 'amount_off' ? coupon.amountOff : null,
  productSlug: coupon.scope === 'all' ? null : coupon.productSlug,
  variantCode: coupon.scope === 'variant' ? coupon.variantCode : null,
  minimumAmount: coupon.minimumAmount || null,
  maxRedemptions: coupon.maxRedemptions || null,
  redeemBy: coupon.redeemBy || null,
});

const ProductPromotionsSection = ({ selectedProduct, products = [] }) => {
  const [sales, setSales] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [saleDraft, setSaleDraft] = useState(() => emptySaleDraft(selectedProduct));
  const [couponDraft, setCouponDraft] = useState(() => emptyCouponDraft(selectedProduct));
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const selectedProductSlug = selectedProduct?.slug || '';

  const productSales = useMemo(() => {
    if (!selectedProductSlug) return [];
    return sales.filter((sale) => sale.productSlug === selectedProductSlug);
  }, [sales, selectedProductSlug]);

  const variants = selectedProduct?.variants || [];

  useEffect(() => {
    const productReference = { slug: selectedProductSlug };
    setSaleDraft((current) =>
      current.id ? current : emptySaleDraft(productReference)
    );
    setCouponDraft((current) =>
      current.id ? current : { ...emptyCouponDraft(productReference), scope: 'product' }
    );
  }, [selectedProductSlug]);

  const loadPromotions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/products/admin/promotions');
      setSales(data.sales || []);
      setCoupons(data.coupons || []);
      setStatus('');
    } catch (err) {
      setStatus(`Promotion load failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const saveSale = async () => {
    if (!selectedProduct) return;
    setBusy(true);
    setStatus('');
    try {
      const payload = salePayload({
        ...saleDraft,
        productSlug: saleDraft.productSlug || selectedProduct.slug,
      });
      await apiFetch(
        saleDraft.id
          ? `/api/products/admin/sales/${saleDraft.id}`
          : '/api/products/admin/sales',
        {
          method: saleDraft.id ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      setSaleDraft(emptySaleDraft(selectedProduct));
      await loadPromotions();
      setStatus('Sale saved.');
    } catch (err) {
      setStatus(`Sale save failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteSale = async (sale) => {
    if (!window.confirm(`Delete sale "${sale.name}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/products/admin/sales/${sale.id}`, { method: 'DELETE' });
      await loadPromotions();
      setStatus('Sale deleted.');
    } catch (err) {
      setStatus(`Sale delete failed: ${err.message}`);
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
      await loadPromotions();
    } catch (err) {
      setStatus(`Sale toggle failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const saveCoupon = async () => {
    setBusy(true);
    setStatus('');
    try {
      const payload = couponPayload(couponDraft);
      await apiFetch(
        couponDraft.id
          ? `/api/products/admin/coupons/${couponDraft.id}`
          : '/api/products/admin/coupons',
        {
          method: couponDraft.id ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      setCouponDraft(emptyCouponDraft(selectedProduct));
      await loadPromotions();
      setStatus('Coupon saved. Sync it to Stripe before using it in checkout.');
    } catch (err) {
      setStatus(`Coupon save failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const syncCoupon = async (coupon) => {
    setBusy(true);
    setStatus('');
    try {
      await apiFetch(`/api/products/admin/coupons/${coupon.id}/stripe-sync`, {
        method: 'POST',
      });
      await loadPromotions();
      setStatus('Coupon synced to Stripe.');
    } catch (err) {
      setStatus(`Coupon sync failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const toggleCoupon = async (coupon) => {
    setBusy(true);
    try {
      const data = await apiFetch(`/api/products/admin/coupons/${coupon.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...coupon, isActive: !coupon.isActive }),
      });
      if (data.coupon?.stripePromotionCodeId) {
        await syncCoupon(data.coupon);
      } else {
        await loadPromotions();
      }
    } catch (err) {
      setStatus(`Coupon toggle failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const deleteCoupon = async (coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/products/admin/coupons/${coupon.id}`, { method: 'DELETE' });
      await loadPromotions();
      setStatus('Coupon deleted.');
    } catch (err) {
      setStatus(`Coupon delete failed: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  if (!selectedProduct) return null;

  return (
    <div style={{ border: '1px solid #eee', borderRadius: '10px', padding: '1rem', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.8rem' }}>
        <div>
          <h3 style={{ margin: 0 }}>Sales and coupons</h3>
          <div style={{ fontSize: '0.82rem', color: '#6f6259', marginTop: '0.2rem' }}>
            Sales change checkout pricing. Coupons sync to Stripe Promotion Codes.
          </div>
        </div>
        <button type="button" onClick={loadPromotions} disabled={loading} style={buttonStyle}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {status && (
        <div style={{ marginBottom: '0.8rem', padding: '0.55rem 0.65rem', background: 'white', border: '1px solid #eee', borderRadius: '8px', color: '#444' }}>
          {status}
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <section style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.85rem' }}>
          <h4 style={{ margin: '0 0 0.65rem' }}>{saleDraft.id ? 'Edit sale' : 'Add sale'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px 120px', gap: '0.65rem', alignItems: 'end' }}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Name</span>
              <input value={saleDraft.name} onChange={(e) => setSaleDraft({ ...saleDraft, name: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Variant</span>
              <select value={saleDraft.variantCode || ''} onChange={(e) => setSaleDraft({ ...saleDraft, variantCode: e.target.value })} style={inputStyle}>
                <option value="">All variants</option>
                {variants.map((variant) => (
                  <option key={variant.code} value={variant.code}>{variant.name}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Type</span>
              <select value={saleDraft.saleType} onChange={(e) => setSaleDraft({ ...saleDraft, saleType: e.target.value })} style={inputStyle}>
                <option value="fixed_price">Fixed sale price</option>
                <option value="amount_off">Amount off</option>
                <option value="percent_off">Percent off</option>
              </select>
            </label>
            <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', paddingBottom: '0.55rem' }}>
              <input type="checkbox" checked={Boolean(saleDraft.isActive)} onChange={(e) => setSaleDraft({ ...saleDraft, isActive: e.target.checked })} />
              <span style={labelTextStyle}>Active</span>
            </label>
            {saleDraft.saleType === 'percent_off' ? (
              <label style={labelStyle}>
                <span style={labelTextStyle}>Percent off</span>
                <input type="number" min="1" max="99" value={saleDraft.salePercent || ''} onChange={(e) => setSaleDraft({ ...saleDraft, salePercent: Number(e.target.value) || null })} style={inputStyle} />
              </label>
            ) : (
              <label style={labelStyle}>
                <span style={labelTextStyle}>{saleDraft.saleType === 'fixed_price' ? 'Sale price EUR' : 'Amount off EUR'}</span>
                <input value={formatMinorInput(saleDraft.saleAmount)} onChange={(e) => setSaleDraft({ ...saleDraft, saleAmount: parseEuroToMinor(e.target.value) })} style={inputStyle} />
              </label>
            )}
            <label style={labelStyle}>
              <span style={labelTextStyle}>Compare-at EUR</span>
              <input value={formatMinorInput(saleDraft.compareAtAmount)} onChange={(e) => setSaleDraft({ ...saleDraft, compareAtAmount: parseEuroToMinor(e.target.value) })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Label</span>
              <input value={saleDraft.label || ''} onChange={(e) => setSaleDraft({ ...saleDraft, label: e.target.value })} placeholder="-20 %" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Description</span>
              <input value={saleDraft.description || ''} onChange={(e) => setSaleDraft({ ...saleDraft, description: e.target.value })} placeholder="Letná akcia" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Starts</span>
              <input type="datetime-local" value={formatDateTimeInput(saleDraft.startsAt)} onChange={(e) => setSaleDraft({ ...saleDraft, startsAt: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Ends</span>
              <input type="datetime-local" value={formatDateTimeInput(saleDraft.endsAt)} onChange={(e) => setSaleDraft({ ...saleDraft, endsAt: e.target.value })} style={inputStyle} />
            </label>
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              <button type="button" onClick={saveSale} disabled={busy} style={{ ...buttonStyle, background: 'var(--color-dark)', color: 'white' }}>
                {saleDraft.id ? 'Save sale' : 'Add sale'}
              </button>
              {saleDraft.id && (
                <button type="button" onClick={() => setSaleDraft(emptySaleDraft(selectedProduct))} style={buttonStyle}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.8rem' }}>
            {productSales.map((sale) => (
              <div key={sale.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'center', border: '1px solid #eee', borderRadius: '8px', padding: '0.65rem' }}>
                <div>
                  <strong>{sale.name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#6f6259' }}>
                    {sale.isActive ? 'Active' : 'Off'} · {sale.variantCode || 'all variants'} · {sale.saleType}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" onClick={() => setSaleDraft(sale)} style={buttonStyle}>Edit</button>
                  <button type="button" onClick={() => toggleSale(sale)} disabled={busy} style={buttonStyle}>{sale.isActive ? 'Turn off' : 'Turn on'}</button>
                  <button type="button" onClick={() => deleteSale(sale)} disabled={busy} style={{ ...buttonStyle, color: '#a40000' }}>Delete</button>
                </div>
              </div>
            ))}
            {!productSales.length && (
              <div style={{ color: '#777', fontSize: '0.85rem' }}>No sales for this product yet.</div>
            )}
          </div>
        </section>

        <section style={{ background: 'white', border: '1px solid #eee', borderRadius: '8px', padding: '0.85rem' }}>
          <h4 style={{ margin: '0 0 0.65rem' }}>{couponDraft.id ? 'Edit coupon' : 'Add coupon'}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 150px 150px', gap: '0.65rem', alignItems: 'end' }}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Code</span>
              <input value={couponDraft.code} onChange={(e) => setCouponDraft({ ...couponDraft, code: e.target.value.toUpperCase() })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Name</span>
              <input value={couponDraft.name} onChange={(e) => setCouponDraft({ ...couponDraft, name: e.target.value })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Discount</span>
              <select value={couponDraft.discountType} onChange={(e) => setCouponDraft({ ...couponDraft, discountType: e.target.value })} style={inputStyle}>
                <option value="percent_off">Percent off</option>
                <option value="amount_off">Amount off</option>
              </select>
            </label>
            {couponDraft.discountType === 'percent_off' ? (
              <label style={labelStyle}>
                <span style={labelTextStyle}>Percent</span>
                <input type="number" min="1" max="99" value={couponDraft.percentOff || ''} onChange={(e) => setCouponDraft({ ...couponDraft, percentOff: Number(e.target.value) || null })} style={inputStyle} />
              </label>
            ) : (
              <label style={labelStyle}>
                <span style={labelTextStyle}>Amount EUR</span>
                <input value={formatMinorInput(couponDraft.amountOff)} onChange={(e) => setCouponDraft({ ...couponDraft, amountOff: parseEuroToMinor(e.target.value) })} style={inputStyle} />
              </label>
            )}
            <label style={labelStyle}>
              <span style={labelTextStyle}>Scope</span>
              <select value={couponDraft.scope} onChange={(e) => setCouponDraft({ ...couponDraft, scope: e.target.value })} style={inputStyle}>
                <option value="all">All products</option>
                <option value="product">Product</option>
                <option value="variant">Variant</option>
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Product</span>
              <select value={couponDraft.productSlug || ''} onChange={(e) => setCouponDraft({ ...couponDraft, productSlug: e.target.value })} disabled={couponDraft.scope === 'all'} style={inputStyle}>
                {products.map((product) => (
                  <option key={product.slug} value={product.slug}>{product.name}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Variant</span>
              <select value={couponDraft.variantCode || ''} onChange={(e) => setCouponDraft({ ...couponDraft, variantCode: e.target.value })} disabled={couponDraft.scope !== 'variant'} style={inputStyle}>
                <option value="">Choose variant</option>
                {variants.map((variant) => (
                  <option key={variant.code} value={variant.code}>{variant.name}</option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Minimum EUR</span>
              <input value={formatMinorInput(couponDraft.minimumAmount)} onChange={(e) => setCouponDraft({ ...couponDraft, minimumAmount: parseEuroToMinor(e.target.value) })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Max uses</span>
              <input type="number" min="1" value={couponDraft.maxRedemptions || ''} onChange={(e) => setCouponDraft({ ...couponDraft, maxRedemptions: Number(e.target.value) || null })} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>Expires</span>
              <input type="datetime-local" value={formatDateTimeInput(couponDraft.redeemBy)} onChange={(e) => setCouponDraft({ ...couponDraft, redeemBy: e.target.value })} style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', paddingBottom: '0.55rem' }}>
              <input type="checkbox" checked={Boolean(couponDraft.allowWithSales)} onChange={(e) => setCouponDraft({ ...couponDraft, allowWithSales: e.target.checked })} />
              <span style={labelTextStyle}>Allow with sales</span>
            </label>
            <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', paddingBottom: '0.55rem' }}>
              <input type="checkbox" checked={Boolean(couponDraft.isActive)} onChange={(e) => setCouponDraft({ ...couponDraft, isActive: e.target.checked })} />
              <span style={labelTextStyle}>Active</span>
            </label>
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              <button type="button" onClick={saveCoupon} disabled={busy} style={{ ...buttonStyle, background: 'var(--color-dark)', color: 'white' }}>
                {couponDraft.id ? 'Save coupon' : 'Add coupon'}
              </button>
              {couponDraft.id && (
                <button type="button" onClick={() => setCouponDraft(emptyCouponDraft(selectedProduct))} style={buttonStyle}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.45rem', marginTop: '0.8rem' }}>
            {coupons.map((coupon) => (
              <div key={coupon.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'center', border: '1px solid #eee', borderRadius: '8px', padding: '0.65rem' }}>
                <div>
                  <strong>{coupon.code}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#6f6259' }}>
                    {coupon.isActive ? 'Active' : 'Off'} · {coupon.scope} · redeemed {coupon.timesRedeemed || 0}{coupon.stripePromotionCodeId ? ' · Stripe synced' : ' · not synced'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="button" onClick={() => setCouponDraft(coupon)} style={buttonStyle}>Edit</button>
                  <button type="button" onClick={() => syncCoupon(coupon)} disabled={busy} style={buttonStyle}>Sync Stripe</button>
                  <button type="button" onClick={() => toggleCoupon(coupon)} disabled={busy} style={buttonStyle}>{coupon.isActive ? 'Turn off' : 'Turn on'}</button>
                  <button type="button" onClick={() => deleteCoupon(coupon)} disabled={busy} style={{ ...buttonStyle, color: '#a40000' }}>Delete</button>
                </div>
              </div>
            ))}
            {!coupons.length && (
              <div style={{ color: '#777', fontSize: '0.85rem' }}>No coupons yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductPromotionsSection;
