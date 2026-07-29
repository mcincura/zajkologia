import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleUserRound,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import {
  createMembershipBillingPortal,
  createMembershipCheckout,
  downloadMembershipFile,
  loadMembershipContent,
  loadMembershipOffer,
  loadMembershipSession,
  logoutMembership,
  requestMembershipCode,
  verifyMembershipCode,
} from '../api/client';
import MembershipContentCard from '../components/MembershipContentCard';
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
    billing_portal_not_configured: 'Správa platieb sa pripravuje. Skúste to, prosím, neskôr.',
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
    return new Intl.DateTimeFormat('sk-SK', { dateStyle: 'long' }).format(new Date(value));
  } catch {
    return '';
  }
};

const Membership = () => {
  const [searchParams] = useSearchParams();
  const [offer, setOffer] = useState(null);
  const [session, setSession] = useState(null);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [code, setCode] = useState('');
  const [codePurpose, setCodePurpose] = useState('');
  const [confirmingPayment, setConfirmingPayment] = useState(
    searchParams.get('checkout') === 'success'
  );
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const [downloadBusy, setDownloadBusy] = useState(null);

  const checkoutState = searchParams.get('checkout');
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const hasAccess = Boolean(session?.hasAccess);
  const checkoutCodeRequested = codePurpose === 'checkout';
  const loginCodeRequested = codePurpose === 'login';
  const paymentPending = confirmingPayment && isAuthenticated && !hasAccess;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [nextOffer, nextSession] = await Promise.all([
          loadMembershipOffer().catch(() => null),
          loadMembershipSession(),
        ]);
        if (cancelled) return;
        setOffer(nextOffer);
        setSession(nextSession);
        if (nextSession?.member?.email) {
          setEmail(nextSession.member.email);
          setLoginEmail(nextSession.member.email);
        }
        if (nextSession?.isAuthenticated && nextSession?.hasAccess) {
          const nextContent = await loadMembershipContent();
          if (!cancelled) setContent(nextContent);
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
          setContent(await loadMembershipContent());
          if (!cancelled) {
            setConfirmingPayment(false);
            setStatus(
              checkoutState === 'success'
                ? ''
                : 'Platba je potvrdená. Vitajte v Zajkológia klube.'
            );
          }
          return;
        }
      } catch {
        // The next attempt handles short-lived webhook or network delays.
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

    setStatus(
      checkoutState === 'success'
        ? ''
        : 'Platba bola prijatá. Potvrdzujeme prístup do členskej zóny…'
    );
    timerId = window.setTimeout(pollForAccess, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [checkoutState, confirmingPayment, hasAccess, isAuthenticated]);

  const groupedContent = useMemo(() => {
    const downloads = content.filter((item) => ['pdf', 'file'].includes(item.contentType));
    const media = content.filter((item) => ['video', 'podcast'].includes(item.contentType));
    const extras = content.filter((item) => ['discount', 'link'].includes(item.contentType));
    return [
      { key: 'downloads', title: 'Materiály na stiahnutie', items: downloads },
      { key: 'media', title: 'Videá a podcasty', items: media },
      { key: 'extras', title: 'Členské výhody', items: extras },
    ].filter((group) => group.items.length);
  }, [content]);

  const redirectToCheckout = async () => {
    setBusy('checkout');
    setStatus('');
    try {
      const result = await createMembershipCheckout(email);
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      const errorCode = error?.data?.error || error?.message;
      if (errorCode === 'membership_checkout_processing') {
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
      setStatus('');
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
      const nextSession = await verifyMembershipCode({ email: verificationEmail, code });
      setSession(nextSession);
      if (nextSession?.member?.email) setEmail(nextSession.member.email);
      setCode('');
      setCodePurpose('');
      if (nextSession.hasAccess) {
        setStatus('Ste prihlásený/á. Vitajte v klube.');
        setContent(await loadMembershipContent());
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
      setContent([]);
      setConfirmingPayment(false);
      setStatus('Odhlásenie prebehlo úspešne.');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const downloadFile = async (item) => {
    setDownloadBusy(item.id);
    setStatus('');
    try {
      await downloadMembershipFile({ contentId: item.id, filename: item.filename });
      setStatus('Sťahovanie sa začalo.');
    } catch (error) {
      setStatus(errorMessage(error));
    } finally {
      setDownloadBusy(null);
    }
  };

  const copyDiscount = async (item) => {
    try {
      await navigator.clipboard.writeText(item.discountCode);
      setStatus(`Kód ${item.discountCode} je skopírovaný.`);
    } catch {
      setStatus(`Zľavový kód: ${item.discountCode}`);
    }
  };

  if (loading) {
    return (
      <div className="membership-page membership-page--loading" id="main-content">
        <div className="membership-loading" role="status">Načítavam Zajkológia klub…</div>
      </div>
    );
  }

  if (isAuthenticated) {
    const subscription = session.subscription;
    return (
      <div className="membership-page" id="main-content">
        <div className="membership-portal">
          <header className="membership-portal__header">
            <div>
              <span className="membership-eyebrow">Členská zóna</span>
              <h1>Vitajte v Zajkológia klube</h1>
              <p>{session.member.email}</p>
            </div>
            <div className="membership-portal__controls">
              {session.member.hasStripeCustomer ? (
                <button
                  type="button"
                  className="membership-button membership-button--secondary"
                  onClick={openBillingPortal}
                  disabled={busy === 'billing'}
                >
                  <CreditCard size={18} aria-hidden="true" />
                  {busy === 'billing' ? 'Otváram…' : 'Platby a členstvo'}
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

          {checkoutState === 'success' && hasAccess ? (
            <div className="membership-checkout-message is-success" role="status">
              <Check size={19} aria-hidden="true" />
              Platba je potvrdená. Členský obsah je odomknutý.
            </div>
          ) : null}
          {status ? <div className="membership-status" role="status">{status}</div> : null}

          <section
            className={`membership-access-card ${
              hasAccess ? 'is-active' : paymentPending ? 'is-pending' : 'is-inactive'
            }`}
            role={paymentPending ? 'status' : undefined}
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
                {hasAccess
                  ? 'Členstvo je aktívne'
                  : paymentPending
                    ? 'Potvrdzujeme platbu'
                    : 'Členstvo nie je aktívne'}
              </strong>
              <p>
                {hasAccess
                  ? subscription?.cancelAtPeriodEnd
                    ? `Obsah zostáva dostupný do ${formatDate(subscription.currentPeriodEnd) || 'konca zaplateného obdobia'}.`
                    : `Ďalšie obdobie do ${formatDate(subscription?.currentPeriodEnd) || 'najbližšieho obnovenia'}.`
                  : paymentPending
                    ? 'Zvyčajne to trvá iba niekoľko sekúnd. Túto stránku nemusíte obnovovať.'
                    : 'Aktivujte alebo obnovte členstvo, aby ste mali prístup k členskému obsahu.'}
              </p>
            </div>
            {!hasAccess && !paymentPending ? (
              <form onSubmit={startCheckout}>
                <button
                  type="submit"
                  className="membership-button membership-button--primary"
                  disabled={busy === 'checkout' || !offer?.available}
                >
                  {busy === 'checkout' ? 'Otváram platbu…' : 'Aktivovať členstvo'}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              </form>
            ) : null}
          </section>

          {hasAccess ? (
            groupedContent.length ? (
              groupedContent.map((group) => (
                <section className="membership-library" key={group.key} aria-labelledby={`membership-${group.key}`}>
                  <div className="membership-library__heading">
                    <span>{String(group.items.length).padStart(2, '0')}</span>
                    <h2 id={`membership-${group.key}`}>{group.title}</h2>
                  </div>
                  <div className="membership-content-grid">
                    {group.items.map((item) => (
                      <MembershipContentCard
                        key={item.id}
                        item={item}
                        onDownload={downloadFile}
                        downloadBusy={downloadBusy}
                        onCopy={copyDiscount}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <section className="membership-empty">
                <Sparkles size={28} aria-hidden="true" />
                <h2>Prvý členský obsah pripravujeme</h2>
                <p>Hneď ako pribudnú nové materiály, nájdete ich na tomto mieste.</p>
              </section>
            )
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="membership-page" id="main-content">
      <section className="membership-hero">
        <div className="membership-hero__copy">
          <span className="membership-eyebrow">Zajkológia klub</span>
          <h1>Istota v starostlivosti. Každý mesiac o kúsok viac.</h1>
          <p className="membership-hero__lead">
            Praktické materiály pre spokojnejší život s králikom — PDF príručky, videá,
            podcasty a členské výhody na jednom bezpečnom mieste.
          </p>
          <ul className="membership-benefits">
            <li><Check size={17} aria-hidden="true" /> Nový a aktualizovaný obsah v členskej zóne</li>
            <li><Check size={17} aria-hidden="true" /> Súkromný prístup cez kód poslaný e-mailom</li>
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
                disabled={busy === 'request-checkout-code' || !offer?.available}
              >
                {busy === 'request-checkout-code' ? 'Posielam overovací kód…' : 'Pokračovať k platbe'}
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <p className="membership-offer-card__microcopy">
                Najprv overíme váš e-mail. Platba ešte neprebieha.
              </p>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="membership-form membership-code-panel">
              <div className="membership-code-panel__intro">
                <span>Overenie e-mailu</span>
                <strong>Skontrolujte svoju schránku</strong>
                <p>
                  6-miestny kód sme poslali na <b>{email}</b>. Po overení pokračujete priamo na Stripe.
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
                onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
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
                  ? 'Pripravujem platbu…'
                  : 'Overiť a prejsť k platbe'}
                <ArrowRight size={18} aria-hidden="true" />
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
            <p className="membership-offer-card__unavailable">Objednávanie členstva bude dostupné čoskoro.</p>
          ) : null}
        </div>
      </section>

      {checkoutState === 'success' ? (
        <div className="membership-checkout-message is-success" role="status">
          <Check size={19} aria-hidden="true" />
          Platba prebehla. Hneď ako ju Stripe potvrdí, prihláste sa nižšie e-mailom použitým pri platbe.
        </div>
      ) : null}
      {checkoutState === 'cancelled' ? (
        <div className="membership-checkout-message" role="status">
          Platba nebola dokončená. Keď budete pripravený/á, môžete to skúsiť znova.
        </div>
      ) : null}
      {status ? <div className="membership-status" role="status">{status}</div> : null}

      <section className="membership-login" aria-labelledby="membership-login-title">
        <div className="membership-login__intro">
          <div className="membership-login__icon" aria-hidden="true">
            <CircleUserRound size={26} />
          </div>
          <div>
            <span className="membership-eyebrow">Už ste členom?</span>
            <h2 id="membership-login-title">Prihlásenie do členskej zóny</h2>
            <p>Zadajte e-mail použitý pri platbe. Prihlásenie je bez hesla — pošleme vám jednorazový kód.</p>
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
                onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
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
    </div>
  );
};

export default Membership;
