import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CirclePause,
  Copy,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Tag,
  TriangleAlert,
} from 'lucide-react';
import {
  apiFetch,
  createAdminCoupon,
  loadAdminCoupon,
  loadAdminCoupons,
  runAdminCouponAction,
  updateAdminCoupon,
} from '../../api/client';
import '../../styles/admin-coupons.css';

const LIFECYCLE_OPTIONS = [
  ['current', 'Aktuálne'],
  ['all', 'Všetky'],
  ['draft', 'Koncept'],
  ['scheduled', 'Naplánované'],
  ['active', 'Aktívne'],
  ['paused', 'Pozastavené'],
  ['expired', 'Expirované'],
  ['exhausted', 'Vyčerpané'],
  ['sync_error', 'Chyba synchronizácie'],
  ['archived', 'Archivované'],
];

const LIFECYCLE_LABELS = Object.fromEntries(LIFECYCLE_OPTIONS);

const ACTION_CONFIRMATIONS = {
  archive: {
    title: 'Archivovať kupón?',
    confirmLabel: 'Archivovať kupón',
    message: (code) => `Kupón ${code} prestane byť použiteľný. História a objednávky zostanú zachované.`,
    destructive: true,
  },
  pause: {
    title: 'Pozastaviť kupón?',
    confirmLabel: 'Pozastaviť kupón',
    message: (code) => `Zákazníci prestanú môcť používať kupón ${code}, kým ho znovu neaktivujete.`,
  },
  activate: {
    title: 'Aktivovať kupón?',
    confirmLabel: 'Aktivovať kupón',
    message: (code) => `Kupón ${code} bude použiteľný až po úspešnej synchronizácii so Stripe.`,
  },
  duplicate: {
    title: 'Vytvoriť kópiu kupónu?',
    confirmLabel: 'Vytvoriť kópiu',
    message: (code) => `Vytvorí sa nový koncept podľa kupónu ${code}. Pôvodný kupón sa nezmení.`,
  },
};

const emptyDraft = () => ({
  id: null,
  code: '',
  name: '',
  kind: 'manual',
  status: 'draft',
  discountType: 'percent_off',
  percentOff: 10,
  amountOffEuros: '',
  currency: 'eur',
  scope: 'all',
  productSlug: '',
  variantCode: '',
  minimumAmountEuros: '',
  maxRedemptions: '',
  startsAt: '',
  redeemBy: '',
  allowWithSales: false,
  claimRequired: false,
  claimType: 'private',
});

const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toUtcDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const fromMinor = (value) => value == null ? '' : (Number(value) / 100).toFixed(2);

const toMinor = (value) => {
  if (value === '') return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? Math.round(number * 100) : null;
};

const couponToDraft = (coupon) => ({
  ...emptyDraft(),
  ...coupon,
  productSlug: coupon.productSlug || '',
  variantCode: coupon.variantCode || '',
  claimType: coupon.claimType || (coupon.kind === 'welcome' ? 'newsletter' : 'private'),
  amountOffEuros: fromMinor(coupon.amountOff),
  minimumAmountEuros: fromMinor(coupon.minimumAmount),
  maxRedemptions: coupon.maxRedemptions ?? '',
  startsAt: toDateTimeInput(coupon.startsAt),
  redeemBy: toDateTimeInput(coupon.redeemBy),
});

const draftToPayload = (draft) => ({
  code: draft.code.trim().toUpperCase(),
  name: draft.name.trim(),
  kind: draft.kind,
  status: draft.status,
  discountType: draft.discountType,
  percentOff: draft.discountType === 'percent_off' ? Number(draft.percentOff) : null,
  amountOff: draft.discountType === 'amount_off' ? toMinor(draft.amountOffEuros) : null,
  currency: draft.currency.toLowerCase(),
  scope: draft.scope,
  productSlug: draft.scope === 'all' ? null : draft.productSlug,
  variantCode: draft.scope === 'variant' ? draft.variantCode : null,
  minimumAmount: toMinor(draft.minimumAmountEuros),
  maxRedemptions: draft.maxRedemptions === '' ? null : Number(draft.maxRedemptions),
  startsAt: toUtcDateTime(draft.startsAt),
  redeemBy: toUtcDateTime(draft.redeemBy),
  allowWithSales: draft.allowWithSales,
  claimRequired: draft.kind === 'welcome' || draft.claimRequired,
  claimType: draft.kind === 'welcome' ? 'newsletter' : draft.claimRequired ? draft.claimType : null,
});

const formatMoney = (amountMinor, currency = 'eur') => new Intl.NumberFormat('sk-SK', {
  style: 'currency',
  currency: String(currency || 'eur').toUpperCase(),
}).format(Number(amountMinor || 0) / 100);

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('sk-SK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Bez obmedzenia';

const getAdminError = (error) => {
  const code = error?.data?.error || error?.message;
  const messages = {
    coupon_code_exists: 'Tento kód už existuje.',
    missing_coupon_fields: 'Vyplňte názov aj kód kupónu.',
    invalid_coupon_percent: 'Percentuálna zľava musí byť od 1 do 99 %.',
    invalid_coupon_amount: 'Zadajte kladnú pevnú sumu zľavy a menu.',
    coupon_product_scope_required: 'Vyberte produkt pre tento rozsah platnosti.',
    coupon_variant_scope_required: 'Vyberte variant pre tento rozsah platnosti.',
    coupon_product_not_found: 'Vybraný produkt neexistuje.',
    coupon_variant_not_found: 'Vybraný variant neexistuje.',
    coupon_date_window_invalid: 'Začiatok platnosti musí byť pred koncom platnosti.',
    coupon_date_invalid: 'Zadajte platný dátum a čas.',
    coupon_minimum_amount_invalid: 'Minimum musí byť platná nezáporná suma.',
    coupon_max_redemptions_invalid: 'Maximálny počet použití musí byť celé kladné číslo.',
    coupon_max_redemptions_below_usage: 'Limit nemožno znížiť pod počet už použitých kupónov.',
    coupon_kind_immutable: 'Typ existujúceho kupónu nemožno zmeniť. Vytvorte radšej kópiu.',
    coupon_archived: 'Archivovaný kupón už nemožno upravovať.',
  };
  return messages[code] || `Operácia zlyhala (${code || 'neznáma chyba'}).`;
};

const AdminCouponsSection = () => {
  const [coupons, setCoupons] = useState([]);
  const [stateCounts, setStateCounts] = useState({});
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('current');
  const [draft, setDraft] = useState(emptyDraft);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announcementKind, setAnnouncementKind] = useState('status');
  const [pendingAction, setPendingAction] = useState(null);
  const editorHeadingRef = useRef(null);
  const actionTriggerRef = useRef(null);
  const actionCancelRef = useRef(null);
  const actionConfirmRef = useRef(null);

  const loadWorkspace = async ({ preserveSelection = true } = {}) => {
    setLoading(true);
    try {
      const [couponData, productData] = await Promise.all([
        loadAdminCoupons(),
        apiFetch('/api/products/admin'),
      ]);
      setCoupons(couponData.coupons);
      setStateCounts(couponData.stateCounts);
      setProducts(productData?.products || []);
      if (preserveSelection && draft.id) {
        const next = couponData.coupons.find((coupon) => coupon.id === draft.id);
        if (next) setDraft(couponToDraft(next));
      }
    } catch (error) {
      setAnnouncement(getAdminError(error));
      setAnnouncementKind('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspace({ preserveSelection: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pendingAction) return undefined;
    const focusFrame = requestAnimationFrame(() => actionCancelRef.current?.focus());
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setPendingAction(null);
      requestAnimationFrame(() => actionTriggerRef.current?.focus());
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [pendingAction]);

  const visibleCoupons = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('sk');
    return coupons.filter((coupon) => {
      if (stateFilter === 'current' && coupon.lifecycleState === 'archived') return false;
      if (!['all', 'current'].includes(stateFilter) && coupon.lifecycleState !== stateFilter) return false;
      if (!needle) return true;
      return `${coupon.code} ${coupon.name} ${coupon.productSlug || ''}`.toLocaleLowerCase('sk').includes(needle);
    });
  }, [coupons, search, stateFilter]);

  const selectedProduct = products.find((product) => product.slug === draft.productSlug) || null;
  const variants = selectedProduct?.colorVariants || selectedProduct?.variants || [];

  const startNew = () => {
    setDraft(emptyDraft());
    setDetail(null);
    setAnnouncement('Nový kupón je pripravený ako koncept.');
    setAnnouncementKind('status');
    requestAnimationFrame(() => editorHeadingRef.current?.focus());
  };

  const selectCoupon = async (coupon) => {
    setDraft(couponToDraft(coupon));
    setDetail(null);
    setDetailLoading(true);
    try {
      const loaded = await loadAdminCoupon(coupon.id);
      setDetail(loaded);
    } catch (error) {
      setAnnouncement(getAdminError(error));
      setAnnouncementKind('error');
    } finally {
      setDetailLoading(false);
      requestAnimationFrame(() => editorHeadingRef.current?.focus());
    }
  };

  const validateDraft = () => {
    if (!draft.code.trim() || !draft.name.trim()) return 'Vyplňte názov aj kód kupónu.';
    if (draft.discountType === 'percent_off' && (Number(draft.percentOff) < 1 || Number(draft.percentOff) > 99)) return 'Percentuálna zľava musí byť od 1 do 99 %.';
    if (draft.discountType === 'amount_off' && Number(String(draft.amountOffEuros).replace(',', '.')) <= 0) return 'Zadajte kladnú sumu zľavy.';
    if (draft.scope !== 'all' && !draft.productSlug) return 'Vyberte produkt.';
    if (draft.scope === 'variant' && !draft.variantCode) return 'Vyberte variant.';
    if (draft.minimumAmountEuros !== '') {
      const minimum = Number(String(draft.minimumAmountEuros).replace(',', '.'));
      if (!Number.isFinite(minimum) || minimum < 0) return 'Minimum musí byť platná nezáporná suma.';
    }
    if (draft.maxRedemptions !== '') {
      const maximum = Number(draft.maxRedemptions);
      if (!Number.isSafeInteger(maximum) || maximum < 1) return 'Maximálny počet použití musí byť celé kladné číslo.';
    }
    if (draft.startsAt && draft.redeemBy && new Date(draft.startsAt) >= new Date(draft.redeemBy)) return 'Začiatok platnosti musí byť pred koncom platnosti.';
    return '';
  };

  const saveCoupon = async (event) => {
    event.preventDefault();
    const validation = validateDraft();
    if (validation) {
      setAnnouncement(validation);
      setAnnouncementKind('error');
      return;
    }
    setBusyAction('save');
    setAnnouncement('Ukladám pravidlá a synchronizujem ich so Stripe…');
    setAnnouncementKind('status');
    try {
      const result = draft.id
        ? await updateAdminCoupon(draft.id, draftToPayload(draft))
        : await createAdminCoupon(draftToPayload(draft));
      setDraft(couponToDraft(result.coupon));
      await loadWorkspace({ preserveSelection: false });
      const loaded = await loadAdminCoupon(result.coupon.id);
      setDetail(loaded);
      if (result.sync?.ok === false) {
        setAnnouncement('Pravidlá sú uložené, ale Stripe synchronizácia zlyhala. Kupón nie je použiteľný; použite Obnoviť synchronizáciu.');
        setAnnouncementKind('error');
      } else if (result.sync?.scheduled || result.coupon.lifecycleState === 'scheduled') {
        setAnnouncement(`Kupón ${result.coupon.code} je naplánovaný. Stripe projekcia je pripravená a bezpečne sa dokončí po začiatku platnosti.`);
        setAnnouncementKind('success');
      } else {
        setAnnouncement(`Kupón ${result.coupon.code} je uložený a jeho aktuálna verzia je synchronizovaná.`);
        setAnnouncementKind('success');
      }
    } catch (error) {
      setAnnouncement(getAdminError(error));
      setAnnouncementKind('error');
    } finally {
      setBusyAction('');
    }
  };

  const performAction = async (coupon, action) => {
    setBusyAction(`${coupon.id}:${action}`);
    setAnnouncement('Spracúvam zmenu…');
    setAnnouncementKind('status');
    try {
      const result = await runAdminCouponAction(coupon.id, action);
      await loadWorkspace({ preserveSelection: false });
      const affectedCoupon = result.coupon || coupon;
      await selectCoupon(affectedCoupon);
      if (
        result.sync?.ok === false ||
        (['activate', 'retry-sync'].includes(action) &&
          affectedCoupon.lifecycleState !== 'scheduled' &&
          !affectedCoupon.isCurrentVersionSynced)
      ) {
        setAnnouncement('Pravidlá sú uložené, ale Stripe synchronizácia zlyhala. Kupón nie je použiteľný; skontrolujte detail chyby a skúste obnovu znova.');
        setAnnouncementKind('error');
        return;
      }
      const actionMessages = {
        archive: 'Kupón je archivovaný. História zostala zachovaná.',
        pause: 'Kupón je pozastavený.',
        activate: 'Kupón je aktívny.',
        duplicate: `Kópia ${affectedCoupon.code} je pripravená ako koncept.`,
        'retry-sync': 'Aktuálna verzia je synchronizovaná so Stripe.',
      };
      setAnnouncement(actionMessages[action] || 'Zmena je uložená.');
      setAnnouncementKind('success');
    } catch (error) {
      setAnnouncement(action === 'retry-sync' ? 'Stripe synchronizácia znova zlyhala. Skontrolujte detail chyby a konfiguráciu.' : getAdminError(error));
      setAnnouncementKind('error');
      await loadWorkspace();
    } finally {
      setBusyAction('');
    }
  };

  const requestAction = (coupon, action, trigger = null) => {
    const confirmation = ACTION_CONFIRMATIONS[action];
    if (!confirmation) {
      performAction(coupon, action);
      return;
    }
    actionTriggerRef.current = trigger;
    setPendingAction({ coupon, action, ...confirmation });
  };

  const closeActionDialog = () => {
    setPendingAction(null);
    requestAnimationFrame(() => actionTriggerRef.current?.focus());
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    const { coupon, action } = pendingAction;
    setPendingAction(null);
    performAction(coupon, action);
  };

  const handleActionDialogKeyDown = (event) => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === actionCancelRef.current) {
      event.preventDefault();
      actionConfirmRef.current?.focus();
    } else if (!event.shiftKey && document.activeElement === actionConfirmRef.current) {
      event.preventDefault();
      actionCancelRef.current?.focus();
    }
  };

  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const isArchived = draft.status === 'archived' || Boolean(draft.archivedAt);

  return (
    <div className="admin-coupons">
      <header className="admin-coupons__header">
        <div><span className="admin-coupons__eyebrow">Pricing & eligibility</span><h1>Kupóny</h1><p>Jedno miesto pre manuálne kódy, uvítacie nároky, Stripe synchronizáciu a históriu použitia.</p></div>
        <div><button type="button" className="admin-coupons__secondary" onClick={() => loadWorkspace()} disabled={loading}><RefreshCw size={17} />Obnoviť</button><button type="button" className="admin-coupons__primary" onClick={startNew}><Plus size={17} />Nový kupón</button></div>
      </header>

      <div className={`admin-coupons__announcement is-${announcementKind}`} role={announcementKind === 'error' ? 'alert' : 'status'} aria-live="polite">{announcement}</div>

      <div className="admin-coupons__workspace">
        <section className="admin-coupons__catalog" aria-label="Zoznam kupónov">
          <div className="admin-coupons__tools">
            <label><span className="sr-only">Hľadať kupón</span><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kód, názov alebo produkt" /></label>
            <label><span className="sr-only">Stav kupónu</span><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>{LIFECYCLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}{value === 'all' ? ` (${coupons.length})` : value === 'current' ? ` (${coupons.filter((coupon) => coupon.lifecycleState !== 'archived').length})` : ` (${stateCounts[value] || 0})`}</option>)}</select></label>
          </div>

          {loading && <div className="admin-coupons__empty" role="status">Načítavam kupóny…</div>}
          {!loading && visibleCoupons.length === 0 && <div className="admin-coupons__empty"><Tag size={24} /><strong>Žiadne zodpovedajúce kupóny</strong><span>Zmeňte filter alebo vytvorte nový koncept.</span></div>}
          <div className="admin-coupons__list">
            {visibleCoupons.map((coupon) => (
              <button type="button" key={coupon.id} className={`admin-coupons__card${draft.id === coupon.id ? ' is-selected' : ''}`} onClick={() => selectCoupon(coupon)} aria-pressed={draft.id === coupon.id}>
                <div><strong>{coupon.code}</strong><span className={`admin-coupons__badge is-${coupon.lifecycleState}`}>{LIFECYCLE_LABELS[coupon.lifecycleState] || coupon.lifecycleState}</span></div>
                <span>{coupon.name}</span>
                <div><span>{coupon.discountType === 'percent_off' ? `${coupon.percentOff} %` : formatMoney(coupon.amountOff, coupon.currency)}</span><span>{coupon.redemptionCount} použití{coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ''}</span></div>
                <div className={`admin-coupons__sync is-${coupon.syncStatus}`}>{coupon.syncStatus === 'synced' && coupon.isCurrentVersionSynced ? 'Stripe synchronizované' : coupon.syncStatus === 'error' ? 'Chyba Stripe synchronizácie' : 'Čaká na synchronizáciu'}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-coupons__editor" aria-labelledby="coupon-editor-title">
          <div className="admin-coupons__editor-heading">
            <div><span>{draft.id ? `Verzia ${draft.version}` : 'Nový koncept'}</span><h2 id="coupon-editor-title" ref={editorHeadingRef} tabIndex="-1">{draft.id ? draft.code : 'Vytvoriť kupón'}</h2></div>
            {draft.id && <div className="admin-coupons__actions"><button type="button" onClick={(event) => requestAction(draft, 'duplicate', event.currentTarget)} disabled={Boolean(busyAction)}><Copy size={16} />Duplikovať</button>{['active', 'scheduled'].includes(draft.lifecycleState) ? <button type="button" onClick={(event) => requestAction(draft, 'pause', event.currentTarget)} disabled={Boolean(busyAction)}><CirclePause size={16} />Pozastaviť</button> : !isArchived && <button type="button" onClick={(event) => requestAction(draft, 'activate', event.currentTarget)} disabled={Boolean(busyAction)}><RotateCcw size={16} />Aktivovať</button>}{!isArchived && <button type="button" className="is-danger" onClick={(event) => requestAction(draft, 'archive', event.currentTarget)} disabled={Boolean(busyAction)}><Archive size={16} />Archivovať</button>}</div>}
          </div>

          {draft.id && draft.lifecycleState === 'scheduled' && !draft.isCurrentVersionSynced && !isArchived && (
            <div className="admin-coupons__sync-scheduled" role="status"><RefreshCw size={18} /><div><strong>Stripe aktivácia čaká na začiatok platnosti.</strong><span>Promotion Code zatiaľ neexistuje, takže ho nemožno použiť predčasne. Server ho vytvorí automaticky po naplánovanom čase.</span></div></div>
          )}

          {draft.id && draft.lifecycleState !== 'scheduled' && !draft.isCurrentVersionSynced && !isArchived && (
            <div className="admin-coupons__sync-error" role="alert"><TriangleAlert size={18} /><div><strong>Aktuálna verzia nie je použiteľná v pokladni.</strong><span>{draft.syncErrorCode || 'Synchronizácia čaká alebo zlyhala.'}{draft.syncErrorDetail ? ` · ${draft.syncErrorDetail}` : ''}</span></div><button type="button" onClick={() => requestAction(draft, 'retry-sync')} disabled={Boolean(busyAction)}><RefreshCw size={16} />Obnoviť synchronizáciu</button></div>
          )}

          <form className="admin-coupons__form" onSubmit={saveCoupon} noValidate>
            <fieldset disabled={isArchived || busyAction === 'save'}><legend>Základné údaje</legend><div className="admin-coupons__grid"><label><span>Kód *</span><input value={draft.code} onChange={(event) => updateDraft({ code: event.target.value.toUpperCase().replace(/\s/g, '') })} maxLength={64} autoComplete="off" /></label><label><span>Názov *</span><input value={draft.name} onChange={(event) => updateDraft({ name: event.target.value })} maxLength={191} /></label><label><span>Typ</span><select value={draft.kind} disabled={Boolean(draft.id)} onChange={(event) => updateDraft({ kind: event.target.value, claimRequired: event.target.value === 'welcome', claimType: event.target.value === 'welcome' ? 'newsletter' : 'private' })}><option value="manual">Manuálny kód</option><option value="welcome">Uvítacia zľava</option></select></label><label><span>Stav po uložení</span><select value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })}><option value="draft">Koncept</option><option value="active">Aktívny</option><option value="paused">Pozastavený</option></select></label></div></fieldset>

            <fieldset disabled={isArchived || busyAction === 'save'}><legend>Zľava a rozsah</legend><div className="admin-coupons__grid"><label><span>Spôsob zľavy</span><select value={draft.discountType} onChange={(event) => updateDraft({ discountType: event.target.value })}><option value="percent_off">Percentá</option><option value="amount_off">Pevná suma</option></select></label>{draft.discountType === 'percent_off' ? <label><span>Zľava v % *</span><input type="number" min="1" max="99" value={draft.percentOff} onChange={(event) => updateDraft({ percentOff: event.target.value })} /></label> : <label><span>Suma v EUR *</span><input inputMode="decimal" value={draft.amountOffEuros} onChange={(event) => updateDraft({ amountOffEuros: event.target.value })} /></label>}<label><span>Platí pre</span><select value={draft.scope} onChange={(event) => updateDraft({ scope: event.target.value, productSlug: event.target.value === 'all' ? '' : draft.productSlug || products[0]?.slug || '', variantCode: '' })}><option value="all">Všetky produkty</option><option value="product">Jeden produkt</option><option value="variant">Jeden variant</option></select></label><label><span>Produkt</span><select value={draft.productSlug} disabled={draft.scope === 'all'} onChange={(event) => updateDraft({ productSlug: event.target.value, variantCode: '' })}><option value="">Vyberte produkt</option>{products.map((product) => <option key={product.slug} value={product.slug}>{product.name}</option>)}</select></label>{draft.scope === 'variant' && <label><span>Variant</span><select value={draft.variantCode} onChange={(event) => updateDraft({ variantCode: event.target.value })}><option value="">Vyberte variant</option>{variants.map((variant) => <option key={variant.code} value={variant.code}>{variant.name || variant.code}</option>)}</select></label>}<label><span>Minimum v EUR</span><input inputMode="decimal" value={draft.minimumAmountEuros} onChange={(event) => updateDraft({ minimumAmountEuros: event.target.value })} placeholder="Bez minima" /></label></div><label className="admin-coupons__check"><input type="checkbox" checked={draft.allowWithSales} onChange={(event) => updateDraft({ allowWithSales: event.target.checked })} /><span>Povoliť kombináciu s akciovou cenou</span></label></fieldset>

            <fieldset disabled={isArchived || busyAction === 'save'}><legend>Platnosť a ochrana</legend><div className="admin-coupons__grid"><label><span>Začiatok</span><input type="datetime-local" value={draft.startsAt} onChange={(event) => updateDraft({ startsAt: event.target.value })} /></label><label><span>Koniec</span><input type="datetime-local" value={draft.redeemBy} onChange={(event) => updateDraft({ redeemBy: event.target.value })} /></label><label><span>Maximálny počet použití</span><input type="number" min="1" value={draft.maxRedemptions} onChange={(event) => updateDraft({ maxRedemptions: event.target.value })} placeholder="Bez limitu" /></label>{draft.kind === 'welcome' && <label><span>Typ nároku</span><select value="newsletter" disabled><option value="newsletter">Newsletter</option></select></label>}</div>{draft.kind === 'welcome' && <label className="admin-coupons__check"><input type="checkbox" checked disabled /><span>Vyžadovať podpísaný osobný nárok/token</span></label>}</fieldset>

            {!isArchived && <button className="admin-coupons__save" type="submit" disabled={Boolean(busyAction)}><Save size={17} />{busyAction === 'save' ? 'Ukladám a synchronizujem…' : 'Uložiť a synchronizovať'}</button>}
          </form>

          {draft.id && <section className="admin-coupons__history" aria-label="Použitie a história"><h3>Použitie a história</h3>{detailLoading && <p role="status">Načítavam históriu…</p>}{detail && <><div className="admin-coupons__metrics"><div><span>Uplatnenia</span><strong>{draft.redemptionCount || 0}</strong></div><div><span>Celková zľava</span><strong>{formatMoney(draft.totalDiscounted, draft.currency)}</strong></div><div><span>Aktívne rezervácie</span><strong>{draft.activeReservations || 0}</strong></div>{draft.claimRequired && <div><span>Dostupné nároky</span><strong>{detail.claimStats.available}</strong></div>}</div><div className="admin-coupons__table-wrap"><table><caption>Posledné uplatnenia</caption><thead><tr><th>Objednávka</th><th>Dátum</th><th>Zľava</th><th>Stav</th></tr></thead><tbody>{detail.redemptions.map((redemption) => <tr key={redemption.id}><td>{redemption.orderId}</td><td>{formatDate(redemption.createdAt)}</td><td>{formatMoney(redemption.amountDiscounted, redemption.currency)}</td><td>{redemption.orderStatus || '—'}</td></tr>)}{detail.redemptions.length === 0 && <tr><td colSpan="4">Kupón zatiaľ nebol použitý.</td></tr>}</tbody></table></div><details><summary>Verzie pravidiel ({detail.versions.length})</summary><ul>{detail.versions.map((version) => <li key={version.id}><strong>v{version.version}</strong><span>{formatDate(version.createdAt)}</span><span>{version.syncStatus}</span></li>)}</ul></details></>}</section>}
        </section>
      </div>

      {pendingAction && (
        <div
          className="admin-coupons__dialog-backdrop"
          onMouseDown={(event) => event.target === event.currentTarget && closeActionDialog()}
        >
          <div
            className="admin-coupons__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="coupon-action-title"
            aria-describedby="coupon-action-description"
            onKeyDown={handleActionDialogKeyDown}
          >
            <div className="admin-coupons__dialog-icon" aria-hidden="true">
              {pendingAction.destructive ? <Archive size={22} /> : <Tag size={22} />}
            </div>
            <div>
              <h2 id="coupon-action-title">{pendingAction.title}</h2>
              <p id="coupon-action-description">{pendingAction.message(pendingAction.coupon.code)}</p>
            </div>
            <div className="admin-coupons__dialog-actions">
              <button ref={actionCancelRef} type="button" onClick={closeActionDialog}>Zrušiť</button>
              <button
                ref={actionConfirmRef}
                type="button"
                className={pendingAction.destructive ? 'is-danger' : 'is-primary'}
                onClick={confirmPendingAction}
              >
                {pendingAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCouponsSection;
