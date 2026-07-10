import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Download, FileText, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  downloadDigitalDeliveryFile,
  loadDigitalDeliveryClaim,
  sendDigitalDeliveryCode,
  verifyDigitalDeliveryCode,
} from '../api/client';

const statusCopy = {
  invalid_token: 'Odkaz nie je platný alebo bol nahradený novším odkazom.',
  delivery_expired: 'Platnosť odkazu vypršala.',
  expired: 'Platnosť odkazu vypršala.',
  delivery_revoked: 'Tento odkaz bol zrušený.',
  revoked: 'Tento odkaz bol zrušený.',
  delivery_over_limit: 'Limit stiahnutí bol vyčerpaný.',
  over_limit: 'Limit stiahnutí bol vyčerpaný.',
  order_not_paid: 'Objednávka ešte nie je označená ako zaplatená.',
  order_refunded: 'Prístup k tejto objednávke bol po refundácii uzavretý.',
  missing_file: 'Súbor momentálne nie je dostupný. Kontaktujte nás, prosím.',
  delivery_file_missing: 'Súbor momentálne nie je dostupný. Kontaktujte nás, prosím.',
  verification_code_invalid: 'Kód nesedí. Skontrolujte číslice a skúste to znova.',
  verification_code_expired: 'Kód vypršal. Požiadajte o nový kód.',
  verification_attempts_exceeded: 'Počet pokusov bol vyčerpaný. Požiadajte o nový kód neskôr.',
  otp_rate_limited: 'Kód bol vyžiadaný príliš často. Skúste to neskôr.',
  session_expired: 'Overenie vypršalo. Zadajte nový kód.',
  download_rate_limited: 'Stiahnutie bolo dočasne obmedzené. Skúste to neskôr.',
};

const getStatusMessage = (code) => statusCopy[code] || 'Stiahnutie momentálne nie je dostupné.';

const pageStyles = {
  shell: {
    padding: '3rem 0 4rem',
    maxWidth: '920px',
  },
  header: {
    display: 'grid',
    gap: '0.75rem',
    marginBottom: '1.25rem',
  },
  panel: {
    background: '#fffdf9',
    border: '1px solid #eadfd5',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: 'var(--shadow)',
  },
  muted: {
    color: '#6f5c50',
    lineHeight: 1.65,
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    justifyContent: 'center',
    borderRadius: '8px',
    padding: '0.65rem 0.9rem',
    fontWeight: 900,
    background: '#341320',
    color: '#fff8ed',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    justifyContent: 'center',
    borderRadius: '8px',
    padding: '0.65rem 0.9rem',
    fontWeight: 900,
    background: '#f8fafc',
    color: '#334155',
    border: '1px solid #cbd5e1',
  },
  danger: {
    color: '#8a1c2b',
    background: '#fff0f3',
    border: '1px solid #f3c5cd',
  },
};

const DigitalDownloads = () => {
  const { token } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [codeStatus, setCodeStatus] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [code, setCode] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [downloadStates, setDownloadStates] = useState({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!token) {
        setLoadError('invalid_token');
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');
      try {
        const data = await loadDigitalDeliveryClaim(token);
        if (cancelled) return;
        setSummary(data);
      } catch (err) {
        if (!cancelled) setLoadError(err?.data?.error || err.message || 'invalid_token');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const accessStatus = summary?.accessStatus || '';
  const links = useMemo(() => summary?.links || [], [summary?.links]);
  const canVerify = summary && accessStatus === 'available';
  const verified = Boolean(sessionToken);

  const requestCode = async () => {
    setCodeBusy(true);
    setCodeStatus('');
    try {
      const data = await sendDigitalDeliveryCode(token);
      setCodeStatus(`Kód sme poslali na ${data?.maskedEmail || summary?.maskedEmail || 'nákupný e-mail'}.`);
    } catch (err) {
      setCodeStatus(getStatusMessage(err?.data?.error || err.message));
    } finally {
      setCodeBusy(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (!normalizedCode) {
      setCodeStatus('Zadajte overovací kód z e-mailu.');
      return;
    }

    setVerifyBusy(true);
    setCodeStatus('');
    try {
      const data = await verifyDigitalDeliveryCode(token, normalizedCode);
      setSessionToken(data.sessionToken);
      setCode('');
      setCodeStatus(`Overenie je aktívne približne ${data.ttlMinutes || summary?.verifiedSessionTtlMinutes || 30} minút.`);
    } catch (err) {
      setCodeStatus(getStatusMessage(err?.data?.error || err.message));
    } finally {
      setVerifyBusy(false);
    }
  };

  const downloadFile = async (link) => {
    if (!sessionToken) {
      setCodeStatus('Najprv overte e-mail pomocou kódu.');
      return;
    }

    setDownloadStates((prev) => ({ ...prev, [link.id]: { status: 'loading', message: '' } }));
    try {
      await downloadDigitalDeliveryFile({
        deliveryLinkId: link.id,
        sessionToken,
        filename: link.filename,
      });
      setDownloadStates((prev) => ({ ...prev, [link.id]: { status: 'done', message: 'Stiahnutie sa začalo.' } }));
    } catch (err) {
      const error = err?.data?.error || err.message;
      setDownloadStates((prev) => ({ ...prev, [link.id]: { status: 'error', message: getStatusMessage(error) } }));
      if (error === 'session_expired' || error === 'invalid_session') {
        setSessionToken('');
      }
    }
  };

  if (loading) {
    return <div className="container" style={pageStyles.shell}>Načítavam stiahnutie…</div>;
  }

  if (loadError) {
    return (
      <div className="container" style={pageStyles.shell}>
        <div style={{ ...pageStyles.panel, ...pageStyles.danger }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={24} />
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>Stiahnutie nie je dostupné</h1>
          </div>
          <p style={{ margin: 0 }}>{getStatusMessage(loadError)}</p>
        </div>
        <Link to="/" style={{ display: 'inline-flex', marginTop: '1.25rem', color: '#341320', fontWeight: 900, textDecoration: 'underline' }}>
          Späť na Zajkológiu
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={pageStyles.shell}>
      <header style={pageStyles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ShieldCheck size={34} color="#2f6f5b" />
          <h1 style={{ margin: 0, fontSize: '2rem' }}>Bezpečné stiahnutie PDF</h1>
        </div>
        <p style={{ ...pageStyles.muted, margin: 0 }}>
          Objednávka <strong>{summary?.order?.id}</strong> · Overenie pre {summary?.maskedEmail || 'nákupný e-mail'}
        </p>
      </header>

      {accessStatus !== 'available' ? (
        <div style={{ ...pageStyles.panel, ...pageStyles.danger, marginBottom: '1rem' }}>
          <strong>Prístup nie je aktívny.</strong>
          <div style={{ marginTop: '0.35rem' }}>{getStatusMessage(accessStatus)}</div>
        </div>
      ) : null}

      <section style={{ ...pageStyles.panel, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <Mail size={22} color="#341320" />
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Overenie e-mailu</h2>
        </div>
        <p style={{ ...pageStyles.muted, margin: '0 0 0.9rem' }}>
          Pošleme kód na e-mail z objednávky. Po overení môžete sťahovať dostupné súbory.
        </p>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={requestCode}
            disabled={!canVerify || codeBusy}
            style={pageStyles.secondaryButton}
          >
            <RefreshCw size={17} />
            {codeBusy ? 'Posielam…' : 'Poslať kód'}
          </button>
          <form onSubmit={verifyCode} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-miestny kód"
              disabled={!canVerify || verifyBusy}
              style={{ width: '150px', padding: '0.65rem 0.75rem', border: '1px solid #d8c7ba', borderRadius: '8px', fontWeight: 800 }}
            />
            <button
              type="submit"
              disabled={!canVerify || verifyBusy}
              style={pageStyles.actionButton}
            >
              <ShieldCheck size={17} />
              {verifyBusy ? 'Overujem…' : 'Overiť'}
            </button>
          </form>
        </div>
        {codeStatus ? (
          <div style={{ marginTop: '0.75rem', color: verified ? '#166534' : '#6f5c50', fontWeight: 800 }}>
            {verified ? <CheckCircle2 size={17} style={{ verticalAlign: '-3px', marginRight: '0.25rem' }} /> : null}
            {codeStatus}
          </div>
        ) : null}
      </section>

      <section style={pageStyles.panel}>
        <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Súbory v objednávke</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {links.map((link) => {
            const state = downloadStates[link.id] || {};
            const available = link.status === 'available' || link.status === 'pending_email';
            return (
              <article
                key={link.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '0.75rem',
                  alignItems: 'center',
                  border: '1px solid #eadfd5',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  background: '#fff',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontWeight: 900 }}>
                    <FileText size={18} />
                    <span style={{ overflowWrap: 'anywhere' }}>{link.productName}</span>
                  </div>
                  <div style={{ color: '#6f5c50', fontSize: '0.9rem', marginTop: '0.25rem', overflowWrap: 'anywhere' }}>
                    {link.filename}
                  </div>
                  <div style={{ color: '#6f5c50', fontSize: '0.82rem', marginTop: '0.25rem' }}>
                    {link.maxDownloads == null
                      ? `${link.downloadCount} stiahnutí · bez limitu · trvalý prístup`
                      : `${link.downloadCount}/${link.maxDownloads} stiahnutí`}
                  </div>
                  {!available ? (
                    <div style={{ color: '#8a1c2b', fontWeight: 800, marginTop: '0.35rem' }}>
                      {getStatusMessage(link.status)}
                    </div>
                  ) : null}
                  {state.message ? (
                    <div style={{ color: state.status === 'error' ? '#8a1c2b' : '#166534', fontWeight: 800, marginTop: '0.35rem' }}>
                      {state.message}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => downloadFile(link)}
                  disabled={!verified || !available || state.status === 'loading'}
                  style={available && verified ? pageStyles.actionButton : pageStyles.secondaryButton}
                >
                  <Download size={17} />
                  {state.status === 'loading' ? 'Sťahujem…' : 'Stiahnuť'}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default DigitalDownloads;
