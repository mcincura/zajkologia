import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  UsersRound,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import {
  createMembershipBillingPortal,
  createMembershipCheckout,
  loadMembershipCategories,
  loadMembershipOffer,
  loadMembershipMemberCount,
  loadMembershipPosts,
  loadMembershipSession,
  logoutMembership,
  requestMembershipCode,
  setMembershipPostSaved,
  verifyMembershipCode,
} from '../api/client';
import MembershipPostCard from '../components/MembershipPostCard';
import { parseMembershipLoginHandoff } from '../utils/membershipLoginHandoff';
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
    membership_checkout_active_elsewhere: 'Pre tento e-mail je už otvorená bezpečná platba. Dokončite ju v pôvodnom okne alebo počkajte na jej vypršanie.',
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

const membershipResendCooldownSeconds = 30;

const Membership = ({ loginOnly = false }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [memberCount, setMemberCount] = useState(null);
  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
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
  const [resendSecondsRemaining, setResendSecondsRemaining] = useState(0);
  const codeInputRef = useRef(null);

  const checkoutState = searchParams.get('checkout');
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const hasAccess = Boolean(session?.hasAccess);
  // `/api/membership/me` is the entitlement source of truth. The network
  // preview gate only decides whether the club route can be opened at all.
  const canDiscoverContent = hasAccess;
  const testAccess = Boolean(session?.testAccess);
  const complimentaryAccess = Boolean(session?.complimentaryAccess);
  const prelaunchTestAccessEnabled = Boolean(
    offer?.testAccessEnabled && !offer?.available
  );
  const checkoutCodeRequested = codePurpose === 'checkout';
  const loginCodeRequested = codePurpose === 'login';
  const paymentPending = confirmingPayment && isAuthenticated && !hasAccess;

  const beginResendCooldown = (seconds = membershipResendCooldownSeconds) => {
    const parsedSeconds = Number(seconds);
    setResendSecondsRemaining(
      Math.max(
        0,
        Number.isFinite(parsedSeconds) ? parsedSeconds : membershipResendCooldownSeconds
      )
    );
  };

  useEffect(() => {
    if (!resendSecondsRemaining) return undefined;
    const timerId = window.setInterval(() => {
      setResendSecondsRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [resendSecondsRemaining]);

  useEffect(() => {
    const handoff = parseMembershipLoginHandoff(window.location.hash);
    if (!handoff) return;

    setLoginEmail(handoff.email);
    setCode(handoff.code);
    setCodePurpose('login');
    setStatus('Kód z e-mailu sme predvyplnili. Potvrďte prihlásenie.');
    // Keep the secret out of the address bar after the trusted page has read it.
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, []);

  useEffect(() => {
    if (codePurpose && !code) codeInputRef.current?.focus();
  }, [codePurpose, code]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const nextSession = await loadMembershipSession();
        const [nextOffer, nextCategories] = loginOnly
          ? [null, []]
          : await Promise.all([
              loadMembershipOffer().catch(() => null),
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
  }, [loginOnly]);

  useEffect(() => {
    if (loginOnly) return undefined;
    let cancelled = false;
    loadMembershipMemberCount().then((value) => { if (!cancelled) setMemberCount(value); }).catch(() => { if (!cancelled) setMemberCount(-1); });
    return () => { cancelled = true; };
  }, [loginOnly]);

  useEffect(() => {
    if (loginOnly) {
      setFeedLoading(false);
      return undefined;
    }
    let cancelled = false;
    const loadFeed = async () => {
      setFeedLoading(true);
      setFeedError('');
      // A changed query/filter is a new result set: never retain the prior
      // cursor or cards while the first page is being resolved.
      setNextCursor(null);
      try {
        const result = await loadMembershipPosts(filters);
        if (!cancelled) {
          setPosts(result.posts);
          setNextCursor(result.nextCursor);
        }
      } catch (error) {
        if (!cancelled) {
          setPosts([]);
          setFeedError(errorMessage(error));
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    };
    loadFeed();
    return () => {
      cancelled = true;
    };
  }, [feedRevision, filters, loginOnly]);

  useEffect(() => {
    if (loginOnly && session?.hasAccess) {
      navigate('/klub', { replace: true });
    }
  }, [loginOnly, navigate, session?.hasAccess]);

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
      window.location.assign(result.checkoutPageUrl || result.checkoutUrl);
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
    await requestCode({ purpose: 'checkout', requestedEmail: email, busyState: 'request-checkout-code' });
  };

  const sendCode = async (event) => {
    event.preventDefault();
    await requestCode({ purpose: 'login', requestedEmail: loginEmail, busyState: 'request-code' });
  };

  const requestCode = async ({ purpose, requestedEmail, busyState, isResend = false }) => {
    const normalizedEmail = String(requestedEmail || '').trim().toLowerCase();
    setBusy(busyState);
    setStatus('');
    try {
      const result = await requestMembershipCode(normalizedEmail);
      setCode('');
      setCodePurpose(purpose);
      if (purpose === 'login') setLoginEmail(normalizedEmail);
      else setEmail(normalizedEmail);
      beginResendCooldown(result?.resendCooldownSeconds);
      setStatus(
        isResend
          ? 'Poslali sme nový 6-miestny kód. Predchádzajúce kódy už neplatia.'
          : 'Ak k tomuto e-mailu patrí členstvo, poslali sme naň 6-miestny kód.'
      );
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const resendCode = async () => {
    const purpose = codePurpose;
    if (!purpose || resendSecondsRemaining > 0) return;
    await requestCode({
      purpose,
      requestedEmail: purpose === 'login' ? loginEmail : email,
      busyState: 'resend-code',
      isResend: true,
    });
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
      setQueryInput('');
      setFilters({ q: '', category: '', type: '', saved: false });
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
    const q = queryInput.trim();
    setFilters((current) => (current.q === q ? current : { ...current, q }));
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setBusy('more');
    try {
      const result = await loadMembershipPosts({
        ...filters,
        cursor: nextCursor,
      });
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...result.posts.filter((post) => !seen.has(post.id))];
      });
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

  if (loginOnly) {
    return (
      <main className="membership-page" id="main-content">
        <div className="membership-live-region" role="status" aria-live="polite">
          {status ? <div className="membership-status">{status}</div> : null}
        </div>
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
                <h1 id="membership-login-title">Prihlásenie do členskej zóny</h1>
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
                    ref={codeInputRef}
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
                  onClick={resendCode}
                  disabled={busy === 'resend-code' || resendSecondsRemaining > 0}
                  aria-describedby="membership-login-resend-help"
                >
                  {busy === 'resend-code'
                    ? 'Posielam nový kód…'
                    : resendSecondsRemaining > 0
                      ? `Poslať kód znova (${resendSecondsRemaining} s)`
                      : 'Poslať kód znova'}
                </button>
                <span id="membership-login-resend-help" className="sr-only">
                  Nové odoslanie zneplatní predchádzajúci kód.
                </span>
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
        ) : hasAccess ? (
          <div className="membership-loading" role="status">Overujem váš prístup…</div>
        ) : (
          <section className="membership-login" aria-labelledby="membership-inactive-title">
            <div className="membership-login__intro">
              <div>
                <h1 id="membership-inactive-title">Členstvo nie je aktívne</h1>
                <p>
                  Tento e-mail je overený, ale nemá aktívne platené ani bezplatné členstvo.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="membership-button membership-button--secondary"
              onClick={logout}
              disabled={busy === 'logout'}
            >
              {busy === 'logout' ? 'Odhlasujem…' : 'Použiť iný e-mail'}
            </button>
          </section>
        )}
      </main>
    );
  }

  const subscription = session?.subscription;
  const hasVisibleMemberCount = memberCount > 0;
  const memberProofText = memberCount === null
    ? 'Overujeme počet členov klubu…'
    : memberCount < 0
      ? 'Počet členov sa teraz nepodarilo načítať.'
      : memberCount === 0
        ? 'Klub sa práve otvára pre prvých členov.'
        : `${memberCount} ${memberCount === 1 ? 'člen je' : memberCount < 5 ? 'členovia sú' : 'členov je'} už v klube.`;
  const memberProofLabel = hasVisibleMemberCount
    ? `${memberCount === 1 ? 'člen je' : memberCount < 5 ? 'členovia sú' : 'členov je'} už v klube.`
    : memberProofText;

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
            <div
              className={`membership-member-proof${memberCount < 0 ? ' is-unavailable' : ''}`}
              role="status"
              aria-live="polite"
              aria-label={memberProofText}
            >
              <span className="membership-member-proof__icon" aria-hidden="true">
                <UsersRound size={22} strokeWidth={2} />
              </span>
              <span className="membership-member-proof__copy">
                {hasVisibleMemberCount ? <strong>{memberCount}</strong> : null}
                <span>{memberProofLabel}</span>
              </span>
            </div>
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
            <p>
              Zaplatíte prvý mesiac a druhý získate zadarmo. Potom platíte
              2,99 € mesačne. Bez dlhodobej viazanosti.
            </p>
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
                  ref={codeInputRef}
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
                  onClick={resendCode}
                  disabled={busy === 'resend-code' || resendSecondsRemaining > 0}
                  aria-describedby="membership-signup-resend-help"
                >
                  {busy === 'resend-code'
                    ? 'Posielam nový kód…'
                    : resendSecondsRemaining > 0
                      ? `Poslať kód znova (${resendSecondsRemaining} s)`
                      : 'Poslať kód znova'}
                </button>
                <span id="membership-signup-resend-help" className="sr-only">
                  Nové odoslanie zneplatní predchádzajúci kód.
                </span>
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
            {(complimentaryAccess || testAccess) ? <span className="membership-billing-note">Tento prístup nemá platbu v Stripe.</span> : null}
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

      <section
        className={`membership-feed-shell ${
          canDiscoverContent ? '' : 'membership-feed-shell--preview'
        }`}
        aria-label={canDiscoverContent ? undefined : 'Ukážky klubu'}
        aria-labelledby={canDiscoverContent ? 'membership-feed-title' : undefined}
      >
        {canDiscoverContent ? (
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
          </aside>
        ) : null}

        <div className="membership-feed">
          {canDiscoverContent ? (
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
                    className={`membership-feed__filter ${
                      filters.type === filter.key ? 'is-active' : ''
                    }`}
                    onClick={() =>
                      setFilters((current) => ({ ...current, type: filter.key }))
                    }
                    aria-pressed={filters.type === filter.key}
                  >
                    {filter.label}
                  </button>
                ))}
                <Link
                  className="membership-feed__filter"
                  to="/klub/diskusia"
                >
                  Diskusia
                </Link>
              </div>
            </div>
          ) : null}

          {canDiscoverContent && (selectedCategory || filters.saved || filters.q) ? (
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
          ) : feedError ? (
            <div className="membership-empty membership-empty--error" role="alert">
              <h2>Príspevky sa nepodarilo načítať</h2>
              <p>{feedError}</p>
              <button
                type="button"
                className="membership-button membership-button--secondary"
                onClick={() => setFeedRevision((value) => value + 1)}
              >
                Skúsiť znova
              </button>
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
                  ref={codeInputRef}
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
                onClick={resendCode}
                disabled={busy === 'resend-code' || resendSecondsRemaining > 0}
                aria-describedby="membership-login-resend-help"
              >
                {busy === 'resend-code'
                  ? 'Posielam nový kód…'
                  : resendSecondsRemaining > 0
                    ? `Poslať kód znova (${resendSecondsRemaining} s)`
                    : 'Poslať kód znova'}
              </button>
              <span id="membership-login-resend-help" className="sr-only">
                Nové odoslanie zneplatní predchádzajúci kód.
              </span>
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
