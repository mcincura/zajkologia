import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Copy,
  Eye,
  FolderTree,
  LoaderCircle,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react';

import { apiFetch } from '../../api/client';
import MembershipPostEditor from './MembershipPostEditor';
import '../../styles/admin-membership.css';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Europe/Bratislava',
    }).format(new Date(value));
  } catch {
    return String(value);
  }
};

const formatMoney = (unitAmount, currency = 'eur') => {
  if (typeof unitAmount !== 'number') return 'Cena nie je nastavená';
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: String(currency).toUpperCase(),
  }).format(unitAmount / 100);
};

const statusLabel = {
  published: 'Publikovaný',
  scheduled: 'Naplánovaný',
  draft: 'Koncept',
  archived: 'Archivovaný',
};

const tabs = [
  { key: 'posts', label: 'Príspevky', icon: BookOpen },
  { key: 'categories', label: 'Kategórie', icon: FolderTree },
  { key: 'comments', label: 'Komentáre', icon: MessageSquare },
  { key: 'analytics', label: 'Prehľad', icon: BarChart3 },
  { key: 'members', label: 'Členovia', icon: UsersRound },
];

const MembershipAdminSection = () => {
  const [overview, setOverview] = useState({
    members: [],
    content: [],
    totals: {},
    offer: null,
  });
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [comments, setComments] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [activeTab, setActiveTab] = useState('posts');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryForm, setCategoryForm] = useState({
    id: null,
    name: '',
    slug: '',
    sortOrder: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const [overviewData, postsData, commentsData, analyticsData] =
        await Promise.all([
          apiFetch('/api/membership/admin/overview'),
          apiFetch('/api/membership/admin/posts'),
          apiFetch('/api/membership/admin/comments'),
          apiFetch('/api/membership/admin/analytics'),
        ]);
      setOverview({
        members: overviewData?.members || [],
        content: overviewData?.content || [],
        totals: overviewData?.totals || {},
        offer: overviewData?.offer || null,
      });
      setPosts(postsData?.posts || []);
      setCategories(postsData?.categories || []);
      setComments(commentsData?.comments || []);
      setAnalytics(analyticsData?.posts || []);
      setSelectedPost((current) =>
        current
          ? (postsData?.posts || []).find((post) => post.id === current.id) || null
          : current
      );
    } catch (error) {
      setStatus(`Načítanie klubu zlyhalo: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const next = { published: 0, scheduled: 0, draft: 0, archived: 0 };
    posts.forEach((post) => {
      next[post.status] = (next[post.status] || 0) + 1;
    });
    return next;
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('sk');
    return posts.filter((post) => {
      if (statusFilter && post.status !== statusFilter) return false;
      if (!normalizedQuery) return true;
      return `${post.title} ${post.excerpt} ${post.slug}`
        .toLocaleLowerCase('sk')
        .includes(normalizedQuery);
    });
  }, [posts, query, statusFilter]);

  const onPostSaved = (post) => {
    setPosts((current) => {
      const exists = current.some((item) => item.id === post.id);
      return exists
        ? current.map((item) => (item.id === post.id ? post : item))
        : [post, ...current];
    });
    setSelectedPost(post);
    setEditorOpen(true);
  };

  const onPostDeleted = (postId) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setSelectedPost(null);
    setEditorOpen(false);
  };

  const duplicatePost = async (post) => {
    setBusy(`duplicate-${post.id}`);
    try {
      const data = await apiFetch(
        `/api/membership/admin/posts/${post.id}/duplicate`,
        { method: 'POST' }
      );
      setPosts((current) => [data.post, ...current]);
      setSelectedPost(data.post);
      setEditorOpen(true);
      setStatus('Kópia príspevku je pripravená ako koncept.');
    } catch (error) {
      setStatus(`Duplikovanie zlyhalo: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const sendNotifications = async (post) => {
    if (
      !window.confirm(
        `Zaradiť a hneď odoslať e-mail o príspevku „${post.title}“ aktívnym členom?`
      )
    ) {
      return;
    }
    setBusy(`notify-${post.id}`);
    try {
      const queued = await apiFetch(
        `/api/membership/admin/posts/${post.id}/notifications/queue`,
        { method: 'POST' }
      );
      const delivered = await apiFetch(
        `/api/membership/admin/posts/${post.id}/notifications/send`,
        { method: 'POST' }
      );
      setStatus(
        `Notifikácie: ${queued.queued} nových vo fronte, ${delivered.sent} odoslaných, ${delivered.failed} zlyhalo.`
      );
    } catch (error) {
      setStatus(`Odosielanie notifikácií zlyhalo: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const saveCategory = async (event) => {
    event.preventDefault();
    setBusy('category');
    try {
      const path = categoryForm.id
        ? `/api/membership/admin/categories/${categoryForm.id}`
        : '/api/membership/admin/categories';
      const data = await apiFetch(path, {
        method: categoryForm.id ? 'PUT' : 'POST',
        body: JSON.stringify(categoryForm),
      });
      const category = data.category;
      setCategories((current) => {
        const exists = current.some((item) => item.id === category.id);
        return exists
          ? current.map((item) => (item.id === category.id ? category : item))
          : [...current, category].sort(
              (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'sk')
            );
      });
      setCategoryForm({ id: null, name: '', slug: '', sortOrder: 0 });
      setStatus(categoryForm.id ? 'Kategória je upravená.' : 'Kategória je vytvorená.');
    } catch (error) {
      setStatus(`Uloženie kategórie zlyhalo: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const removeCategory = async (category) => {
    if (!window.confirm(`Odstrániť kategóriu „${category.name}“?`)) return;
    setBusy(`category-${category.id}`);
    try {
      await apiFetch(`/api/membership/admin/categories/${category.id}`, {
        method: 'DELETE',
      });
      setCategories((current) =>
        current.filter((item) => item.id !== category.id)
      );
      setStatus('Kategória bola odstránená. Príspevky zostali zachované.');
    } catch (error) {
      setStatus(`Odstránenie kategórie zlyhalo: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const moderateComment = async (comment, nextStatus) => {
    setBusy(`comment-${comment.id}`);
    try {
      await apiFetch(`/api/membership/admin/comments/${comment.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      setComments((current) =>
        current.map((item) =>
          item.id === comment.id ? { ...item, status: nextStatus } : item
        )
      );
      setStatus(
        nextStatus === 'visible'
          ? 'Komentár je viditeľný.'
          : 'Komentár je skrytý pred členmi.'
      );
    } catch (error) {
      setStatus(`Moderovanie zlyhalo: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  if (loading) {
    return (
      <div className="admin-membership-loading" role="status">
        <LoaderCircle className="membership-spinner" size={20} aria-hidden="true" />
        Načítavam Creator Studio…
      </div>
    );
  }

  return (
    <div className="admin-membership">
      <header className="admin-membership__header">
        <div>
          <h2>Klub – príspevky</h2>
          <p>
            Publikujte články, videá, audio, PDF, súbory a členské výhody v jednej zóne.
          </p>
        </div>
        <div className="admin-membership__header-actions">
          <button
            type="button"
            className="admin-membership__secondary"
            onClick={() => load()}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Obnoviť
          </button>
          <button
            type="button"
            className="admin-membership__primary"
            onClick={() => {
              setSelectedPost(null);
              setEditorOpen(true);
              setActiveTab('posts');
            }}
          >
            <Plus size={17} aria-hidden="true" />
            Nový príspevok
          </button>
        </div>
      </header>

      <div className="admin-membership__status-live" role="status" aria-live="polite">
        {status ? <div className="admin-membership__status">{status}</div> : null}
      </div>

      <section
        className={`admin-membership__launch-state ${
          overview.offer?.salesEnabled ? 'is-live' : 'is-staging'
        }`}
        aria-label="Stav spustenia členstva"
      >
        <div>
          <span>{overview.offer?.salesEnabled ? 'Predaj otvorený' : 'Súkromná príprava'}</span>
          <strong>
            {overview.offer?.salesEnabled
              ? 'Zákazníci si môžu aktivovať predplatné'
              : overview.offer?.testAccessEnabled
                ? 'Platba je vypnutá · testovací prístup je aktívny'
                : 'Platba je vypnutá počas prípravy obsahu'}
          </strong>
        </div>
        <p>
          {formatMoney(overview.offer?.unitAmount, overview.offer?.currency)} / mesiac
          {' · '}
          {overview.offer?.configured ? 'Stripe pripravený' : 'Stripe cena chýba'}
          {' · '}
          {overview.offer?.billingPortalConfigured
            ? 'Správa členstva pripravená'
            : 'Správa členstva chýba'}
        </p>
      </section>

      <div className="admin-membership__stats">
        <div><span>Publikované</span><strong>{counts.published}</strong></div>
        <div><span>Naplánované</span><strong>{counts.scheduled}</strong></div>
        <div><span>Koncepty</span><strong>{counts.draft}</strong></div>
        <div><span>Aktívni členovia</span><strong>{overview.totals.active || 0}</strong></div>
        <div><span>Komentáre</span><strong>{comments.filter((comment) => comment.status === 'visible').length}</strong></div>
      </div>

      <nav className="admin-membership__tabs" aria-label="Správa klubu">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.key}
              className={activeTab === tab.key ? 'is-active' : ''}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key !== 'posts') setEditorOpen(false);
              }}
            >
              <Icon size={17} aria-hidden="true" />
              {tab.label}
              {tab.key === 'comments' && comments.some((comment) => comment.status !== 'visible') ? (
                <span aria-label="Komentáre čakajú na kontrolu">
                  {comments.filter((comment) => comment.status !== 'visible').length}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {activeTab === 'posts' ? (
        editorOpen ? (
          <MembershipPostEditor
            key={selectedPost?.id || 'new'}
            initialPost={selectedPost}
            categories={categories}
            onSaved={onPostSaved}
            onDeleted={onPostDeleted}
            onCancel={() => {
              setEditorOpen(false);
              setSelectedPost(null);
            }}
            onStatus={setStatus}
          />
        ) : (
          <section className="creator-post-library">
            <div className="creator-post-library__toolbar">
              <label>
                <span className="sr-only">Hľadať príspevky</span>
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Hľadať príspevky…"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filtrovať podľa stavu"
              >
                <option value="">Všetky stavy</option>
                <option value="published">Publikované</option>
                <option value="scheduled">Naplánované</option>
                <option value="draft">Koncepty</option>
                <option value="archived">Archivované</option>
              </select>
            </div>
            <div className="creator-post-list">
              {filteredPosts.length ? (
                filteredPosts.map((post) => (
                  <article key={post.id}>
                    <div className="creator-post-list__cover">
                      {post.cover ? <Eye size={20} aria-hidden="true" /> : <BookOpen size={20} aria-hidden="true" />}
                    </div>
                    <div className="creator-post-list__copy">
                      <div>
                        <span className={`is-${post.status}`}>
                          {statusLabel[post.status] || post.status}
                          {post.publishedAt ? ` · ${formatDate(post.publishedAt)}` : ''}
                        </span>
                        <h3>{post.title}</h3>
                        <p>
                          {post.assets.length} médií · {post.commentCount} komentárov
                          {post.isPinned ? ' · pripnuté' : ''}
                        </p>
                      </div>
                      <div className="creator-post-list__actions">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPost(post);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil size={16} aria-hidden="true" />
                          Upraviť
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicatePost(post)}
                          disabled={busy === `duplicate-${post.id}`}
                        >
                          <Copy size={16} aria-hidden="true" />
                          Duplikovať
                        </button>
                        {post.status === 'published' ? (
                          <button
                            type="button"
                            onClick={() => sendNotifications(post)}
                            disabled={busy === `notify-${post.id}`}
                          >
                            <Bell size={16} aria-hidden="true" />
                            {busy === `notify-${post.id}` ? 'Odosielam…' : 'E-mail členom'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="creator-post-library__empty">
                  <BookOpen size={26} aria-hidden="true" />
                  <h3>Zatiaľ tu nie je žiadny príspevok</h3>
                  <p>Vytvorte prvý koncept a nahrajte doň obsah.</p>
                  <button
                    type="button"
                    className="admin-membership__primary"
                    onClick={() => setEditorOpen(true)}
                  >
                    <Plus size={17} aria-hidden="true" />
                    Nový príspevok
                  </button>
                </div>
              )}
            </div>
          </section>
        )
      ) : null}

      {activeTab === 'categories' ? (
        <section className="admin-membership__section creator-category-manager">
          <div>
            <h3>Kategórie príspevkov</h3>
            <p>Pomáhajú členom filtrovať a nájsť starší obsah.</p>
            <div className="creator-category-list">
              {categories.map((category) => (
                <article key={category.id}>
                  <div>
                    <strong>{category.name}</strong>
                    <span>/{category.slug} · poradie {category.sortOrder}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryForm({
                        id: category.id,
                        name: category.name,
                        slug: category.slug,
                        sortOrder: category.sortOrder,
                      })
                    }
                    aria-label={`Upraviť kategóriu ${category.name}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCategory(category)}
                    disabled={busy === `category-${category.id}`}
                    aria-label={`Odstrániť kategóriu ${category.name}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          </div>
          <form onSubmit={saveCategory}>
            <h3>{categoryForm.id ? 'Upraviť kategóriu' : 'Nová kategória'}</h3>
            <label>
              <span>Názov</span>
              <input
                value={categoryForm.name}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label>
              <span>URL skratka (voliteľná)</span>
              <input
                value={categoryForm.slug}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Poradie</span>
              <input
                type="number"
                value={categoryForm.sortOrder}
                onChange={(event) =>
                  setCategoryForm((current) => ({
                    ...current,
                    sortOrder: event.target.value,
                  }))
                }
              />
            </label>
            <div>
              <button
                type="submit"
                className="admin-membership__primary"
                disabled={busy === 'category'}
              >
                {categoryForm.id ? 'Uložiť zmeny' : 'Vytvoriť kategóriu'}
              </button>
              {categoryForm.id ? (
                <button
                  type="button"
                  className="admin-membership__secondary"
                  onClick={() =>
                    setCategoryForm({
                      id: null,
                      name: '',
                      slug: '',
                      sortOrder: 0,
                    })
                  }
                >
                  Zrušiť
                </button>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      {activeTab === 'comments' ? (
        <section className="admin-membership__section">
          <h3>Moderovanie komentárov</h3>
          <div className="creator-comment-moderation">
            {comments.length ? (
              comments.map((comment) => {
                const post = posts.find((item) => item.id === comment.postId);
                return (
                  <article key={comment.id}>
                    <div>
                      <strong>{comment.author?.name || 'Člen'}</strong>
                      <span>
                        {post?.title || `Príspevok #${comment.postId}`} ·{' '}
                        {formatDate(comment.createdAt)}
                      </span>
                      <p>{comment.body}</p>
                    </div>
                    <div>
                      <span className={`is-${comment.status}`}>
                        {comment.status === 'visible' ? 'Viditeľný' : 'Skrytý'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          moderateComment(
                            comment,
                            comment.status === 'visible' ? 'hidden' : 'visible'
                          )
                        }
                        disabled={busy === `comment-${comment.id}`}
                      >
                        {comment.status === 'visible' ? 'Skryť' : 'Zverejniť'}
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <p>Zatiaľ nebol pridaný žiadny komentár.</p>
            )}
          </div>
        </section>
      ) : null}

      {activeTab === 'analytics' ? (
        <section className="admin-membership__section">
          <h3>Základný prehľad zapojenia</h3>
          <p className="admin-membership__section-note">
            Počty sa zbierajú pri otvorení príspevku, prehratí médií, stiahnutí,
            uložení a komentovaní.
          </p>
          <div className="admin-membership-table-wrap">
            <table className="admin-membership-table">
              <thead>
                <tr>
                  <th>Príspevok</th>
                  <th>Stav</th>
                  <th>Otvorenia</th>
                  <th>Prehratia</th>
                  <th>Stiahnutia</th>
                  <th>Uloženia</th>
                  <th>Komentáre</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((post) => (
                  <tr key={post.id}>
                    <td>{post.title}</td>
                    <td>{statusLabel[post.status] || post.status}</td>
                    <td>{post.views}</td>
                    <td>{post.mediaStarts}</td>
                    <td>{post.downloads}</td>
                    <td>{post.saves}</td>
                    <td>{post.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === 'members' ? (
        <section className="admin-membership__section">
          <h3>Členovia</h3>
          <div className="admin-membership-table-wrap">
            <table className="admin-membership-table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Stav</th>
                  <th>Prístup</th>
                  <th>Koniec obdobia</th>
                  <th>Posledné prihlásenie</th>
                </tr>
              </thead>
              <tbody>
                {overview.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.email}</td>
                    <td>
                      {member.testAccess
                        ? 'QA tester'
                        : member.subscription?.status || 'bez predplatného'}
                    </td>
                    <td>
                      {member.testAccess
                        ? 'testovací'
                        : member.hasAccess
                          ? member.subscription?.cancelAtPeriodEnd
                            ? 'do konca obdobia'
                            : 'aktívny'
                          : 'zablokovaný'}
                    </td>
                    <td>{formatDate(member.subscription?.currentPeriodEnd)}</td>
                    <td>{formatDate(member.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {overview.content.length ? (
            <p className="admin-membership__legacy-note">
              Staršia knižnica obsahuje {overview.content.length} položiek. Zostáva
              dostupná počas prechodu, nové materiály už publikujte ako príspevky.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
};

export default MembershipAdminSection;
