import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  Share2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link, useParams } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

import {
  createMembershipBillingPortal,
  downloadMembershipPostAsset,
  loadMembershipPost,
  loadMembershipPosts,
  loadMembershipSession,
  membershipMediaUrl,
  recordMembershipPostEvent,
  setMembershipPostSaved,
} from '../api/client';
import MembershipComments from '../components/MembershipComments';
import MembershipMediaRenderer from '../components/MembershipMediaRenderer';
import MembershipPostCard from '../components/MembershipPostCard';
import '../styles/membership.css';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(value));
  } catch {
    return '';
  }
};

const MembershipPost = () => {
  const { slug = '' } = useParams();
  const [post, setPost] = useState(null);
  const [session, setSession] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [downloadBusy, setDownloadBusy] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [postResult, nextSession, feedResult] = await Promise.all([
          loadMembershipPost(slug),
          loadMembershipSession().catch(() => ({ isAuthenticated: false })),
          loadMembershipPosts({ limit: 4 }).catch(() => ({ posts: [] })),
        ]);
        if (cancelled) return;
        setPost(postResult.post);
        setSession(nextSession);
        setRelated(
          (feedResult.posts || [])
            .filter((item) => item.slug !== slug)
            .slice(0, 2)
        );
        if (postResult.post?.access === 'full') {
          void recordMembershipPostEvent({
            postId: postResult.post.id,
            eventType: 'view',
          }).catch(() => {});
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError?.status === 404
              ? 'Tento príspevok nie je dostupný.'
              : 'Príspevok sa nepodarilo načítať.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const contentAssets = useMemo(() => {
    if (!post?.assets) return [];
    return post.assets.filter(
      (asset) => !(asset.assetType === 'image' && asset.streamUrl === post.cover?.url)
    );
  }, [post]);

  const primaryVideo = useMemo(
    () => contentAssets.find((asset) => asset.assetType === 'video') || null,
    [contentAssets]
  );
  const remainingAssets = useMemo(
    () => contentAssets.filter((asset) => asset.id !== primaryVideo?.id),
    [contentAssets, primaryVideo]
  );

  const toggleSaved = async () => {
    if (!post || post.locked) return;
    const nextSaved = !post.isSaved;
    setBusy('save');
    setStatus('');
    try {
      await setMembershipPostSaved({ postId: post.id, saved: nextSaved });
      setPost((current) => ({ ...current, isSaved: nextSaved }));
      setStatus(nextSaved ? 'Príspevok je uložený.' : 'Príspevok bol odstránený z uložených.');
    } catch {
      setStatus('Uloženie sa nepodarilo. Skúste to znova.');
    } finally {
      setBusy('');
    }
  };

  const share = async () => {
    const shareData = {
      title: post?.title || 'Zajkológia klub',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setStatus('Odkaz na príspevok je skopírovaný.');
      }
    } catch (shareError) {
      if (shareError?.name !== 'AbortError') {
        setStatus('Odkaz sa nepodarilo zdieľať.');
      }
    }
  };

  const download = async (asset) => {
    setDownloadBusy(asset.id);
    setStatus('');
    try {
      await downloadMembershipPostAsset({
        url: asset.downloadUrl,
        filename: asset.filename,
      });
      setStatus('Sťahovanie sa začalo.');
    } catch {
      setStatus('Súbor sa nepodarilo stiahnuť.');
    } finally {
      setDownloadBusy(null);
    }
  };

  const mediaEvent = (event) => {
    void recordMembershipPostEvent(event).catch(() => {});
  };

  const updateCommentCount = useCallback((commentCount) => {
    setPost((current) => (current ? { ...current, commentCount } : current));
  }, []);

  const openBilling = async () => {
    setBusy('billing');
    setStatus('');
    try {
      const result = await createMembershipBillingPortal();
      window.location.assign(result.portalUrl);
    } catch {
      setStatus('Správu členstva sa nepodarilo otvoriť.');
      setBusy('');
    }
  };

  if (loading) {
    return (
      <main className="membership-page membership-page--loading" id="main-content">
        <div className="membership-loading" role="status">
          <LoaderCircle className="membership-spinner" size={20} aria-hidden="true" />
          Načítavam príspevok…
        </div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="membership-page membership-page--loading" id="main-content">
        <div className="membership-post-error">
          <h1>{error || 'Príspevok sa nenašiel.'}</h1>
          <Link to="/klub">
            <ArrowLeft size={17} aria-hidden="true" />
            Späť do klubu
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="membership-page membership-post-page" id="main-content">
      <div className="membership-post-shell">
        <header className="membership-post-topbar">
          <Link to="/klub" className="membership-post-topbar__brand">
            Zajkológia klub
          </Link>
          {session?.isAuthenticated ? (
            <div className="membership-post-topbar__member">
              <span>{session.member?.email}</span>
              {session.member?.hasStripeCustomer &&
              !session.testAccess &&
              !session.complimentaryAccess ? (
                <button
                  type="button"
                  onClick={openBilling}
                  disabled={busy === 'billing'}
                >
                  <CreditCard size={17} aria-hidden="true" />
                  Spravovať členstvo
                </button>
              ) : null}
            </div>
          ) : (
            <Link to="/klub#prihlasenie">Prihlásiť sa</Link>
          )}
        </header>

        <Link to="/klub" className="membership-post-back">
          <ArrowLeft size={17} aria-hidden="true" />
          Späť na všetky príspevky
        </Link>

        <div className="membership-post-layout">
          <article className="membership-post-article">
            <header className="membership-post-article__header">
              <h1>{post.title}</h1>
              <div className="membership-post-article__meta">
                <span>
                  <CalendarDays size={16} aria-hidden="true" />
                  {formatDate(post.publishedAt)}
                </span>
                {post.categories?.map((category) => (
                  <span key={category.id}>{category.name}</span>
                ))}
              </div>
              {!post.locked ? (
                <div className="membership-post-article__actions">
                  <button
                    type="button"
                    onClick={toggleSaved}
                    disabled={busy === 'save'}
                    aria-pressed={Boolean(post.isSaved)}
                  >
                    <Bookmark
                      size={18}
                      fill={post.isSaved ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                    {post.isSaved ? 'Uložené' : 'Uložiť'}
                  </button>
                  <button type="button" onClick={share}>
                    <Share2 size={18} aria-hidden="true" />
                    Zdieľať
                  </button>
                </div>
              ) : null}
            </header>

            {primaryVideo ? (
              <MembershipMediaRenderer
                postId={post.id}
                assets={[primaryVideo]}
                onDownload={download}
                onMediaEvent={mediaEvent}
                downloadBusy={downloadBusy}
                onStatus={setStatus}
              />
            ) : post.cover?.url ? (
              <figure className="membership-post-article__cover">
                <img
                  src={membershipMediaUrl(post.cover.url)}
                  alt={post.cover.altText || ''}
                  crossOrigin={post.locked ? undefined : 'use-credentials'}
                />
              </figure>
            ) : null}

            {status ? (
              <div className="membership-status" role="status" aria-live="polite">
                {status}
              </div>
            ) : null}

            {post.locked ? (
              <section className="membership-post-lock" aria-labelledby="membership-post-lock-title">
                <LockKeyhole size={28} aria-hidden="true" />
                <h2 id="membership-post-lock-title">Celý príspevok je pre členov klubu</h2>
                <p>{post.excerpt || 'Prihláste sa alebo si aktivujte členstvo a otvoríte celý obsah.'}</p>
                <Link to="/klub#prihlasenie">Prihlásiť sa alebo aktivovať členstvo</Link>
              </section>
            ) : (
              <>
                {post.excerpt ? <p className="membership-post-lead">{post.excerpt}</p> : null}
                <div className="membership-post-markdown">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noreferrer">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {post.bodyMd || ''}
                  </ReactMarkdown>
                </div>
                <MembershipMediaRenderer
                  postId={post.id}
                  assets={remainingAssets}
                  onDownload={download}
                  onMediaEvent={mediaEvent}
                  downloadBusy={downloadBusy}
                  onStatus={setStatus}
                />
                <MembershipComments
                  postId={post.id}
                  allowComments={post.allowComments}
                  initialCount={post.commentCount}
                  onCountChange={updateCommentCount}
                  onStatus={setStatus}
                />
              </>
            )}
          </article>

          {related.length ? (
            <aside className="membership-related" aria-labelledby="membership-related-title">
              <h2 id="membership-related-title">Mohlo by sa vám páčiť</h2>
              <div>
                {related.map((item) => (
                  <MembershipPostCard post={item} key={item.id} />
                ))}
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  );
};

export default MembershipPost;
