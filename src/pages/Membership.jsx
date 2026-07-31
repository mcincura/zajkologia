import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  CircleUserRound,
  CreditCard,
  LayoutGrid,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Search,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import {
  createMembershipBillingPortal,
  createMembershipCheckout,
  loadMembershipCategories,
  loadMembershipOffer,
  loadMembershipPosts,
  loadMembershipSession,
  logoutMembership,
  requestMembershipCode,
  setMembershipPostSaved,
  verifyMembershipCode,
} from '../api/client';
import MembershipPostCard from '../components/MembershipPostCard';
import '../styles/membership.css';

const errorMessage = (error) => {
  const code = error?.data?.error || error?.message || '';
  const messages = {
    invalid_email: 'Skontrolujte, či je e-mail zadaný správne.',
    invalid_code: 'Kód nie je správny alebo už vypršal. Pošlite si nový.',
    too_many_codes: 'Bolo odoslaných príliš veľa kódov. Skúste to opäť o hodinu.',
    too_many_attempts: 'Bolo zadaných príliš veľa kódov. Skúste to opäť o hodinu.',
    membership_login_required: 'Účet s týmto e-mailom už existuje. Najprv sa prihláste nižšie.',
    membership_already_active: 'Pre tento e-mail už členstvo existuje. Prihláste sa nižšie.',
    membership_checkout_processing: 'Platba už bola dokončená. Chvíľu počkajte a potom sa prihláste.',
    membership_sales_not_open: 'Členstvo sa pripravuje. Predaj ešte nie je otvorený.',
    membership_checkout_unavailable: 'Členstvo sa práve nedá objednať. Skúste to, prosím, neskôr.',
    active_membership_required: 'Obsah je dostupný po aktivácii členstva.',
    billing_customer_missing: 'K tomuto účtu zatiaľ nemáme fakturačný profil.',
    billing_unavailable_for_complimentary_access:
      'Bezplatné členstvo nemá platbu, ktorú by bolo potrebné spravovať.',
    billing_portal_not_configured: 'Správa platieb sa pripravuje. Skúste to, prosím, neskôr.',
    membership_publishing_not_migrated: 'Publikačná časť klubu sa práve aktualizuje.',
  };
  return messages[code] || 'Niečo sa nepodarilo. Skúste to, prosím, ešte raz.';
};

const formatMoney = (unitAmount, currency) => {
  if (typeof unitAmount !== 'number') return 'Mesačné členstvo';
  try {
    return new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: String(currency || 'eur').toUpperCase(),
      maximumFractionDigits: 2,
    }).format(unitAmount / 100);
  } catch {
    return `${(unitAmount / 100).toFixed(2)} €`;
  }
};

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('sk-SK', { dateStyle: 'long' }).format(
      new Date(value)
    );
  } catch {
    return '';
  }
};

const mediaFilters = [
  { key: '', label: 'Všetko' },
  { key: 'video', label: 'Videá' },
  { key: 'audio', label: 'Audio' },
  { key: 'document', label: 'PDF a knihy' },
  { key: 'image', label: 'Obrázky' },
];

const Membership = () => {
  const [searchParams] = useSearchParams();
  const [offer, setOffer] = useState(null);
  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedRevision, setFeedRevision] = useState(0);
  const [queryInput, setQueryInput] = useState('');
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    type: '',
    saved: false,
  });
  const [email, setEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [code, setCode] = useState('');
  const [codePurpose, setCodePurpose] = useState('');
  const [confirmingPayment, setConfirmingPayment] = useState(
    searchParams.get('checkout') === 'success'
  );
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [saveBusy, setSaveBusy] = useState(null);

  const checkoutState = searchParams.get('checkout');
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const hasAccess = Boolean(session?.hasAccess);
  const testAccess = Boolean(session?.testAccess);
  const complimentaryAccess = Boolean(session?.complimentaryAccess);
  const prelaunchTestAccessEnabled = Boolean(
    offer?.testAccessEnabled && !offer?.available
  );
  const checkoutCodeRequested = codePurpose === 'checkout';
  const loginCodeRequested = codePurpose === 'login';
  const paymentPending = confirmingPayment && isAuthenticated && !hasAccess;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [nextOffer, nextSession, nextCategories] = await Promise.all([
          loadMembershipOffer().catch(() => null),
          loadMembershipSession(),
          loadMembershipCategories().catch(() => []),
        ]);
        if (cancelled) return;
        setOffer(nextOffer);
        setSession(nextSession);
        setCategories(nextCategories);
        if (nextSession?.member?.email) {
          setEmail(nextSession.member.email);
          setLoginEmail(nextSession.member.email);
        }
      } catch (error) {
        if (!cancelled) setStatus(errorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadFeed = async () => {
      setFeedLoading(true);
      try {
        const result = await loadMembershipPosts(filters);
        if (!cancelled) {
          setPosts(result.posts);
          setNextCursor(result.nextCursor);
        }
      } catch (error) {
        if (!cancelled) setStatus(errorMessage(error));
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    };
    loadFeed();
    return () => {
      cancelled = true;
    };
  }, [feedRevision, filters]);

  useEffect(() => {
    if (!confirmingPayment || !isAuthenticated || hasAccess) return undefined;
    let cancelled = false;
    let attempts = 0;
    let timerId;
    const pollForAccess = async () => {
      attempts += 1;
      try {
        const nextSession = await loadMembershipSession();
        if (cancelled) return;
        setSession(nextSession);
        if (nextSession?.hasAccess) {
          setConfirmingPayment(false);
          setStatus('Platba je potvrdená. Vitajte v Zajkológia klube.');
          setFeedRevision((value) => value + 1);
          return;
        }
      } catch {
        // A later attempt covers short-lived webhook or network delays.
      }
      if (cancelled) return;
      if (attempts < 12) {
        timerId = window.setTimeout(pollForAccess, 2500);
      } else {
        setConfirmingPayment(false);
        setStatus(
          'Stripe platbu ešte spracúva. Počkajte chvíľu a obnovte stránku — novú platbu nevytvárajte.'
        );
      }
    };
    timerId = window.setTimeout(pollForAccess, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [confirmingPayment, hasAccess, isAuthenticated]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.slug === filters.category),
    [categories, filters.category]
  );

  const redirectToCheckout = async () => {
    setBusy('checkout');
    setStatus('');
    try {
      const result = await createMembershipCheckout(email);
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      if ((error?.data?.error || error?.message) === 'membership_checkout_processing') {
        setConfirmingPayment(true);
        setStatus('Stripe už platbu spracúva. Potvrdzujeme váš prístup…');
      } else {
        setStatus(errorMessage(error));
      }
      setBusy('');
    }
  };

  const startCheckout = async (event) => {
    event.preventDefault();
    await redirectToCheckout();
  };

  const beginCheckoutVerification = async (event) => {
    event.preventDefault();
    setBusy('request-checkout-code');
    setStatus('');
    try {
      await requestMembershipCode(email);
      setCode('');
      setCodePurpose('checkout');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const sendCode = async (event) => {
    event.preventDefault();
    setBusy('request-code');
    setStatus('');
    try {
      await requestMembershipCode(loginEmail);
      setCode('');
      setCodePurpose('login');
      setStatus('Ak k tomuto e-mailu patrí členstvo, poslali sme naň 6-miestny kód.');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    setBusy('verify-code');
    setStatus('');
    try {
      const nextPurpose = codePurpose;
      const verificationEmail = nextPurpose === 'login' ? loginEmail : email;
      const nextSession = await verifyMembershipCode({
        email: verificationEmail,
        code,
      });
      setSession(nextSession);
      if (nextSession?.member?.email) {
        setEmail(nextSession.member.email);
        setLoginEmail(nextSession.member.email);
      }
      setCode('');
      setCodePurpose('');
      if (nextSession.hasAccess) {
        setStatus(
          nextSession.complimentaryAccess
            ? 'Bezplatné členstvo je aktívne. Vitajte v klube.'
            : nextSession.testAccess
              ? 'Testovací prístup je aktívny. Žiadna platba neprebehla.'
              : 'Ste prihlásený/á. Vitajte v klube.'
        );
        setFeedRevision((value) => value + 1);
      } else if (nextPurpose === 'checkout') {
        setStatus('E-mail je overený. Otvárame bezpečnú platbu cez Stripe…');
        await redirectToCheckout();
      } else {
        setStatus('E-mail je overený. Členstvo zatiaľ nie je aktívne.');
      }
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const openBillingPortal = async () => {
    setBusy('billing');
    setStatus('');
    try {
      const result = await createMembershipBillingPortal();
      window.location.assign(result.portalUrl);
    } catch (error) {
      setStatus(errorMessage(error));
      setBusy('');
    }
  };

  const logout = async () => {
    setBusy('logout');
    try {
      await logoutMembership();
      setSession({ isAuthenticated: false });
      setFilters((current) => ({ ...current, saved: false }));
      setFeedRevision((value) => value + 1);
      setConfirmingPayment(false);
      setStatus('Odhlásenie prebehlo úspešne.');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const submitSearch = (event) => {
    event.preventDefault();
    setFilters((current) => ({ ...current, q: queryInput.trim() }));
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setBusy('more');
    try {
      const result = await loadMembershipPosts({
        ...filters,
        cursor: nextCursor,
      });
      setPosts((current) => [...current, ...result.posts]);
      setNextCursor(result.nextCursor);
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const toggleSaved = async (post) => {
    const saved = !post.isSaved;
    setSaveBusy(post.id);
    try {
      await setMembershipPostSaved({ postId: post.id, saved });
      setPosts((current) =>
        current
          .map((item) => (item.id === post.id ? { ...item, isSaved: saved } : item))
          .filter((item) => !(filters.saved && !item.isSaved))
      );
      setStatus(saved ? 'Príspevok je uložený.' : 'Príspevok bol odstránený z uložených.');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setSaveBusy(null);
    }
  };

  if (loading) {
    return (
      <main className="membership-page membership-page--loading" id="main-content">
        <div className="membership-loading" role="status">
          <LoaderCircle className="membership-spinner" size={20} aria-hidden="true" />
          Načítavam Zajkológia klub…
        </div>
      </main>
    );
  }

  const subscription = session?.subscription;

  return (
    <main className="membership-page" id="main-content">
      {!isAuthenticated ? (
        <section className="membership-hero" aria-labelledby="membership-title">
          <div className="membership-hero__copy">
            <h1 id="membership-title">Istota v starostlivosti. Každý mesiac o kúsok viac.</h1>
            <p className="membership-hero__lead">
              Praktické príspevky, videá, audio nahrávky, PDF príručky a členské
              výhody na jednom bezpečnom mieste.
            </p>
            <ul className="membership-benefits">
              <li><Check size={17} aria-hidden="true" /> Nový a aktualizovaný obsah počas mesiaca</li>
              <li><Check size={17} aria-hidden="true" /> Komentáre a uložené príspevky pre členov</li>
              <li><Check size={17} aria-hidden="true" /> Členstvo môžete spravovať alebo zrušiť online</li>
            </ul>
          </div>

          <div className="membership-offer-card">
            <span className="membership-offer-card__label">Jedno jednoduché členstvo</span>
            <div className="membership-offer-card__price">
              <strong>{formatMoney(offer?.unitAmount, offer?.currency)}</strong>
              {typeof offer?.unitAmount === 'number' ? <span>/ mesiac</span> : null}
            </div>
            <p>Bez dlhodobej viazanosti. Platba a obnova prebiehajú bezpečne cez Stripe.</p>
            {!checkoutCodeRequested ? (
              <form onSubmit={beginCheckoutVerification} className="membership-form">
                <label htmlFor="membership-signup-email">E-mail pre členstvo</label>
                <input
                  id="membership-signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vas@email.sk"
                  required
                />
                <button
                  type="submit"
                  className="membership-button membership-button--primary membership-button--wide"
                  disabled={
                    busy === 'request-checkout-code' ||
                    (!offer?.available && !prelaunchTestAccessEnabled)
                  }
                >
                  {busy === 'request-checkout-code'
                    ? 'Posielam overovací kód…'
                    : prelaunchTestAccessEnabled
                      ? 'Otestovať členský prístup'
                      : 'Pokračovať k platbe'}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
                <p className="membership-offer-card__microcopy">
                  {prelaunchTestAccessEnabled
                    ? 'Pre povolený testovací e-mail. Platba sa nevytvorí.'
                    : 'Najprv overíme váš e-mail. Platba ešte neprebieha.'}
                </p>
              </form>
            ) : (
              <form onSubmit={verifyCode} className="membership-form membership-code-panel">
                <div className="membership-code-panel__intro">
                  <strong>Skontrolujte svoju schránku</strong>
                  <p>
                    6-miestny kód sme poslali na <b>{email}</b>.
                  </p>
                </div>
                <label htmlFor="membership-signup-code">6-miestny kód</label>
                <input
                  id="membership-signup-code"
                  name="signup-one-time-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  pattern="\d{6}"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="membership-button membership-button--primary membership-button--wide"
                  disabled={busy === 'verify-code' || busy === 'checkout'}
                >
                  {busy === 'verify-code' || busy === 'checkout'
                    ? 'Overujem…'
                    : prelaunchTestAccessEnabled
                      ? 'Overiť a otvoriť testovací prístup'
                      : 'Overiť a prejsť k platbe'}
                </button>
                <button
                  type="button"
                  className="membership-text-button membership-text-button--on-light"
                  onClick={() => {
                    setCodePurpose('');
                    setCode('');
                    setStatus('');
                  }}
                >
                  Zmeniť e-mail
                </button>
              </form>
            )}
            {!offer?.available ? (
              <p className="membership-offer-card__unavailable">
                {prelaunchTestAccessEnabled
                  ? 'Predaj zostáva zatvorený. Povolený tester môže skontrolovať klub bez platby.'
                  : 'Objednávanie členstva bude dostupné čoskoro.'}
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <header className="membership-club-header">
          <div className="membership-club-header__title">
            <h1>Zajkológia klub</h1>
            <div className="membership-member-chip">
              <span aria-hidden="true">
                {session.member?.email?.[0]?.toUpperCase() || 'Č'}
              </span>
              <div>
                <strong>{session.member?.email}</strong>
                <small>{hasAccess ? 'Aktívny člen' : 'Členstvo nie je aktívne'}</small>
              </div>
            </div>
          </div>
          <div className="membership-club-header__actions">
            {session.member?.hasStripeCustomer && !testAccess && !complimentaryAccess ? (
              <button
                type="button"
                className="membership-button membership-button--secondary"
                onClick={openBillingPortal}
                disabled={busy === 'billing'}
              >
                <CreditCard size={18} aria-hidden="true" />
                Spravovať členstvo
              </button>
            ) : null}
            <button
              type="button"
              className="membership-icon-button"
              onClick={logout}
              disabled={busy === 'logout'}
              aria-label="Odhlásiť sa z členskej zóny"
            >
              <LogOut size={20} aria-hidden="true" />
            </button>
          </div>
        </header>
      )}

      {checkoutState === 'success' && hasAccess ? (
        <div className="membership-checkout-message is-success" role="status">
          <Check size={19} aria-hidden="true" />
          Platba je potvrdená. Členský obsah je odomknutý.
        </div>
      ) : null}
      {checkoutState === 'cancelled' ? (
        <div className="membership-checkout-message" role="status">
          Platba nebola dokončená. Keď budete pripravený/á, môžete to skúsiť znova.
        </div>
      ) : null}
      <div className="membership-live-region" role="status" aria-live="polite">
        {status ? <div className="membership-status">{status}</div> : null}
      </div>

      {isAuthenticated ? (
        <section
          className={`membership-access-card ${
            hasAccess ? 'is-active' : paymentPending ? 'is-pending' : 'is-inactive'
          }`}
          aria-busy={paymentPending || undefined}
        >
          <div className="membership-access-card__icon" aria-hidden="true">
            {hasAccess ? (
              <Check size={22} />
            ) : paymentPending ? (
              <LoaderCircle className="membership-spinner" size={22} />
            ) : (
              <LockKeyhole size={22} />
            )}
          </div>
          <div>
            <strong>
              {complimentaryAccess
                ? 'Bezplatné členstvo je aktívne'
                : testAccess
                  ? 'Testovací prístup je aktívny'
                  : hasAccess
                    ? 'Členstvo je aktívne'
                  : paymentPending
                    ? 'Potvrdzujeme platbu'
                    : 'Členstvo nie je aktívne'}
            </strong>
            <p>
              {complimentaryAccess
                ? 'Máte trvalý prístup ku klubovému obsahu bez platby.'
                : testAccess
                  ? 'Môžete skontrolovať celý publikačný, mediálny a komunitný tok bez platby.'
                  : hasAccess
                    ? subscription?.cancelAtPeriodEnd
                      ? `Obsah zostáva dostupný do ${formatDate(subscription.currentPeriodEnd) || 'konca zaplateného obdobia'}.`
                      : `Ďalšie obdobie do ${formatDate(subscription?.currentPeriodEnd) || 'najbližšieho obnovenia'}.`
                  : paymentPending
                    ? 'Zvyčajne to trvá iba niekoľko sekúnd.'
                    : 'Aktivujte členstvo a otvoríte celé príspevky a chránené médiá.'}
            </p>
          </div>
          {!hasAccess && !paymentPending ? (
            <form onSubmit={startCheckout}>
              <button
                type="submit"
                className="membership-button membership-button--primary"
                disabled={busy === 'checkout' || !offer?.available}
              >
                Aktivovať členstvo
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="membership-feed-shell" aria-labelledby="membership-feed-title">
        <aside className="membership-feed-sidebar">
          <h2 id="membership-feed-title">Kategórie</h2>
          <button
            type="button"
            className={!filters.category ? 'is-active' : ''}
            onClick={() =>
              setFilters((current) => ({ ...current, category: '' }))
            }
          >
            <LayoutGrid size={18} aria-hidden="true" />
            Všetko
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={filters.category === category.slug ? 'is-active' : ''}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  category: category.slug,
                }))
              }
            >
              {category.name}
            </button>
          ))}
          {hasAccess ? (
            <button
              type="button"
              className={filters.saved ? 'is-active' : ''}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  saved: !current.saved,
                }))
              }
            >
              <Bookmark size={18} aria-hidden="true" />
              Uložené
            </button>
          ) : null}
        </aside>

        <div className="membership-feed">
          <div className="membership-feed__toolbar">
            <form onSubmit={submitSearch} role="search">
              <label className="membership-search">
                <span className="sr-only">Hľadať v klube</span>
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="Hľadať v klube"
                />
              </label>
            </form>
            <div className="membership-feed__filters" aria-label="Typ obsahu">
              {mediaFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.label}
                  className={filters.type === filter.key ? 'is-active' : ''}
                  onClick={() =>
                    setFilters((current) => ({ ...current, type: filter.key }))
                  }
                  aria-pressed={filters.type === filter.key}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {selectedCategory || filters.saved || filters.q ? (
            <div className="membership-feed__context">
              <span>
                {filters.saved
                  ? 'Uložené príspevky'
                  : selectedCategory?.name || `Výsledky pre „${filters.q}“`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setQueryInput('');
                  setFilters({ q: '', category: '', type: '', saved: false });
                }}
              >
                Zrušiť filtre
              </button>
            </div>
          ) : null}

          {feedLoading ? (
            <div className="membership-feed__loading" role="status">
              <LoaderCircle className="membership-spinner" size={20} aria-hidden="true" />
              Načítavam príspevky…
            </div>
          ) : posts.length ? (
            <div className="membership-feed__posts">
              {posts.map((post, index) => (
                <MembershipPostCard
                  post={post}
                  featured={index === 0}
                  key={post.id}
                  onSave={hasAccess ? toggleSaved : undefined}
                  saveBusy={saveBusy === post.id}
                />
              ))}
            </div>
          ) : (
            <div className="membership-empty">
              <Sparkles size={28} aria-hidden="true" />
              <h2>
                {filters.q || filters.category || filters.type || filters.saved
                  ? 'Žiadny príspevok nezodpovedá filtrom'
                  : 'Prvý klubový príspevok pripravujeme'}
              </h2>
              <p>
                {filters.q || filters.category || filters.type || filters.saved
                  ? 'Skúste zmeniť vyhľadávanie alebo zrušiť niektorý filter.'
                  : 'Hneď ako pribudne nový obsah, nájdete ho na tomto mieste.'}
              </p>
            </div>
          )}

          {nextCursor ? (
            <button
              type="button"
              className="membership-button membership-button--secondary membership-feed__more"
              onClick={loadMore}
              disabled={busy === 'more'}
            >
              {busy === 'more' ? 'Načítavam…' : 'Načítať ďalšie príspevky'}
            </button>
          ) : null}
        </div>
      </section>

      {!isAuthenticated ? (
        <section
          className="membership-login"
          id="prihlasenie"
          aria-labelledby="membership-login-title"
        >
          <div className="membership-login__intro">
            <div className="membership-login__icon" aria-hidden="true">
              <CircleUserRound size={26} />
            </div>
            <div>
              <h2 id="membership-login-title">Prihlásenie do členskej zóny</h2>
              <p>
                Zadajte e-mail použitý pri platbe alebo pridelený k členstvu.
                Pošleme vám jednorazový kód — heslo nepotrebujete.
              </p>
            </div>
          </div>

          {!loginCodeRequested ? (
            <form onSubmit={sendCode} className="membership-form membership-login__form">
              <label htmlFor="membership-login-email">Členský e-mail</label>
              <div className="membership-form__row">
                <input
                  id="membership-login-email"
                  name="login-email"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="vas@email.sk"
                  required
                />
                <button
                  type="submit"
                  className="membership-button membership-button--secondary"
                  disabled={busy === 'request-code'}
                >
                  {busy === 'request-code' ? 'Posielam…' : 'Poslať kód'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="membership-form membership-login__form">
              <label htmlFor="membership-login-code">6-miestny kód z e-mailu</label>
              <div className="membership-form__row">
                <input
                  id="membership-login-code"
                  name="one-time-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  pattern="\d{6}"
                  required
                  autoFocus
                />
                <button
                  type="submit"
                  className="membership-button membership-button--primary"
                  disabled={busy === 'verify-code'}
                >
                  {busy === 'verify-code' ? 'Overujem…' : 'Overiť a pokračovať'}
                </button>
              </div>
              <button
                type="button"
                className="membership-text-button"
                onClick={() => {
                  setCodePurpose('');
                  setCode('');
                  setStatus('');
                }}
              >
                Použiť iný e-mail alebo poslať nový kód
              </button>
            </form>
          )}
        </section>
      ) : null}
    </main>
  );
};

export default Membership;
