import React, { useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, FileUp, Pencil, Plus, RefreshCw, Trash2, UsersRound, X } from 'lucide-react';

import { apiFetch, apiUrl } from '../../api/client';
import MembershipContentCard from '../../components/MembershipContentCard';
import '../../styles/admin-membership.css';

const EMPTY_FORM = {
  title: '',
  description: '',
  contentType: 'pdf',
  externalUrl: '',
  discountCode: '',
  sortOrder: 0,
  isActive: false,
  publishedAt: '',
};

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

const getResponseError = async (response) => {
  const text = await response.text();
  try {
    const data = text ? JSON.parse(text) : null;
    return data?.error || `http_${response.status}`;
  } catch {
    return `http_${response.status}`;
  }
};

const formatMoney = (unitAmount, currency = 'eur') => {
  if (typeof unitAmount !== 'number') return 'Price not configured';
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: String(currency).toUpperCase(),
  }).format(unitAmount / 100);
};

const getContentState = (item) => {
  if (!item.isActive) return { key: 'draft', label: 'Draft' };
  if (item.publishedAt && new Date(item.publishedAt).getTime() > Date.now()) {
    return { key: 'scheduled', label: 'Scheduled' };
  }
  return { key: 'ready', label: 'Ready now' };
};

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const MembershipAdminSection = () => {
  const [overview, setOverview] = useState({
    members: [],
    content: [],
    totals: {},
    offer: null,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [status, setStatus] = useState('');
  const contentCounts = useMemo(() => {
    const counts = { ready: 0, scheduled: 0, draft: 0 };
    for (const item of overview.content) {
      counts[getContentState(item).key] += 1;
    }
    return counts;
  }, [overview.content]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/membership/admin/overview');
      setOverview({
        members: data?.members || [],
        content: data?.content || [],
        totals: data?.totals || {},
        offer: data?.offer || null,
      });
    } catch (error) {
      setStatus(`Membership load failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFile(null);
    setEditingId(null);
  };

  const beginEdit = (item) => {
    setEditingId(item.id);
    setFile(null);
    setForm({
      title: item.title,
      description: item.description || '',
      contentType: item.contentType,
      externalUrl: item.externalUrl || '',
      discountCode: item.discountCode || '',
      sortOrder: item.sortOrder || 0,
      isActive: item.isActive,
      publishedAt: toDateTimeLocal(item.publishedAt),
    });
    const formElement = document.getElementById('membership-content-form');
    if (typeof formElement?.scrollIntoView === 'function') {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const saveContent = async (event) => {
    event.preventDefault();
    setBusy('save');
    setStatus('');
    try {
      const payload = {
        ...form,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
      };
      if (editingId) {
        await apiFetch(`/api/membership/admin/content/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (file && ['pdf', 'file'].includes(form.contentType)) {
          const replacementBody = new FormData();
          replacementBody.append('file', file);
          const replacementResponse = await fetch(
            apiUrl(`/api/membership/admin/content/${editingId}/file`),
            {
              method: 'POST',
              body: replacementBody,
              credentials: 'include',
            }
          );
          if (!replacementResponse.ok) {
            throw new Error(await getResponseError(replacementResponse));
          }
        }
      } else if (['pdf', 'file'].includes(form.contentType)) {
        if (!file) throw new Error('Choose a file to upload.');
        const body = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (value != null) body.append(key, String(value));
        });
        body.append('file', file);
        const response = await fetch(apiUrl('/api/membership/admin/content/file'), {
          method: 'POST',
          body,
          credentials: 'include',
        });
        if (!response.ok) throw new Error(await getResponseError(response));
      } else {
        await apiFetch('/api/membership/admin/content', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setStatus(editingId ? 'Membership content updated.' : 'Membership content created.');
      resetForm();
      await load();
    } catch (error) {
      setStatus(`${editingId ? 'Update' : 'Create'} failed: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const toggleContent = async (item) => {
    setBusy(`toggle-${item.id}`);
    setStatus('');
    try {
      await apiFetch(`/api/membership/admin/content/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      setStatus(item.isActive ? 'Content hidden from members.' : 'Content published.');
      await load();
    } catch (error) {
      setStatus(`Update failed: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const deleteContent = async (item) => {
    if (!window.confirm(`Delete "${item.title}"? Uploaded files will also be removed.`)) return;
    setBusy(`delete-${item.id}`);
    setStatus('');
    try {
      await apiFetch(`/api/membership/admin/content/${item.id}`, { method: 'DELETE' });
      setStatus('Membership content deleted.');
      await load();
    } catch (error) {
      setStatus(`Delete failed: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const downloadFile = async (item) => {
    setBusy(`download-${item.id}`);
    setStatus('');
    try {
      const response = await fetch(
        apiUrl(`/api/membership/admin/content/${item.id}/download`),
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error(await getResponseError(response));
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = item.filename || 'zajkologia-file';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setStatus('Admin file check started.');
    } catch (error) {
      setStatus(`Download failed: ${error.message}`);
    } finally {
      setBusy('');
    }
  };

  const copyDiscount = async (item) => {
    try {
      await navigator.clipboard.writeText(item.discountCode);
      setStatus(`Discount code ${item.discountCode} copied.`);
    } catch {
      setStatus(`Discount code: ${item.discountCode}`);
    }
  };

  if (loading) {
    return <div className="admin-membership-loading">Loading membership…</div>;
  }

  return (
    <div className="admin-membership">
      <header className="admin-membership__header">
        <div>
          <h2>Membership</h2>
          <p>Manage protected content and review subscriber access synchronized from Stripe.</p>
        </div>
        <button type="button" className="admin-membership__secondary" onClick={load}>
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {status ? <div className="admin-membership__status" role="status">{status}</div> : null}
      {overview.offer?.readinessError ? (
        <div className="admin-membership__status" role="status">
          Stripe readiness is temporarily unavailable. Content management remains operational.
        </div>
      ) : null}

      <section
        className={`admin-membership__launch-state ${
          overview.offer?.salesEnabled ? 'is-live' : 'is-staging'
        }`}
        aria-label="Membership launch state"
      >
        <div>
          <span>{overview.offer?.salesEnabled ? 'Sales open' : 'Private staging'}</span>
          <strong>
            {overview.offer?.salesEnabled
              ? 'Customers can start subscriptions'
              : 'Checkout is disabled while content is being prepared'}
          </strong>
        </div>
        <p>
          {formatMoney(overview.offer?.unitAmount, overview.offer?.currency)} / month
          {' · '}
          {overview.offer?.configured ? 'Stripe Price ready' : 'Stripe Price missing'}
          {' · '}
          {overview.offer?.billingPortalConfigured
            ? 'Billing Portal ready'
            : 'Billing Portal missing'}
        </p>
      </section>

      <div className="admin-membership__stats">
        <div><span>Total members</span><strong>{overview.totals.members || 0}</strong></div>
        <div><span>Active access</span><strong>{overview.totals.active || 0}</strong></div>
        <div>
          <span>Ready content</span>
          <strong>{contentCounts.ready}</strong>
        </div>
        <div>
          <span>Scheduled</span>
          <strong>{contentCounts.scheduled}</strong>
        </div>
        <div>
          <span>Drafts</span>
          <strong>{contentCounts.draft}</strong>
        </div>
        <div><span>All content</span><strong>{overview.content.length}</strong></div>
      </div>

      <section className="admin-membership__section" id="membership-content-form">
        <div className="admin-membership__section-heading">
          {editingId ? <Pencil size={19} aria-hidden="true" /> : <Plus size={19} aria-hidden="true" />}
          <h3>{editingId ? 'Edit member content' : 'Add member content'}</h3>
        </div>
        <form className="admin-membership-form" onSubmit={saveContent}>
          <label>
            <span>Title *</span>
            <input
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Type *</span>
            <select
              value={form.contentType}
              disabled={Boolean(editingId)}
              onChange={(event) => {
                updateForm({ contentType: event.target.value });
                setFile(null);
              }}
            >
              <option value="pdf">PDF</option>
              <option value="file">Other file</option>
              <option value="video">Video link</option>
              <option value="podcast">Podcast link</option>
              <option value="discount">Discount code</option>
              <option value="link">Member link</option>
            </select>
          </label>
          <label className="is-wide">
            <span>Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
            />
          </label>

          {['pdf', 'file'].includes(form.contentType) ? (
            <label className="is-wide admin-membership-form__file">
              <span>
                {editingId ? 'Replace private file (optional)' : 'Private file *'} (max 32 MB)
              </span>
              <input
                type="file"
                accept={form.contentType === 'pdf' ? '.pdf,application/pdf' : undefined}
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                required={!editingId}
              />
            </label>
          ) : null}

          {['video', 'podcast', 'link'].includes(form.contentType) ? (
            <label className="is-wide">
              <span>Hosted URL *</span>
              <input
                type="url"
                value={form.externalUrl}
                onChange={(event) => updateForm({ externalUrl: event.target.value })}
                placeholder="https://"
                required
              />
            </label>
          ) : null}

          {form.contentType === 'discount' ? (
            <label className="is-wide">
              <span>Discount code *</span>
              <input
                value={form.discountCode}
                onChange={(event) => updateForm({ discountCode: event.target.value })}
                required
              />
            </label>
          ) : null}

          <label>
            <span>Sort order</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => updateForm({ sortOrder: event.target.value })}
            />
          </label>
          <label>
            <span>Publish at (optional)</span>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(event) => updateForm({ publishedAt: event.target.value })}
            />
          </label>
          <label className="admin-membership-form__checkbox">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateForm({ isActive: event.target.checked })}
            />
            <span>Mark ready for active members</span>
          </label>
          <button type="submit" className="admin-membership__primary" disabled={busy === 'save'}>
            <FileUp size={17} aria-hidden="true" />
            {busy === 'save'
              ? 'Saving…'
              : editingId
                ? 'Save changes'
                : 'Create draft'}
          </button>
          {editingId ? (
            <button type="button" className="admin-membership__secondary" onClick={resetForm}>
              <X size={17} aria-hidden="true" />
              Cancel editing
            </button>
          ) : null}
        </form>
      </section>

      <section className="admin-membership__section">
        <div className="admin-membership__section-heading">
          <UsersRound size={19} aria-hidden="true" />
          <h3>Member-facing preview</h3>
        </div>
        <p className="admin-membership__preview-note">
          This uses the same cards members see. Draft and scheduled items remain unavailable
          to ordinary members until they are ready.
        </p>
        <div className="membership-content-grid admin-membership__preview-grid">
          {overview.content.length ? overview.content.map((item) => {
            const contentState = getContentState(item);
            return (
              <div className="admin-membership__preview-item" key={item.id}>
                <span className={`admin-membership-content__status is-${contentState.key}`}>
                  {contentState.label}
                </span>
                <MembershipContentCard
                  item={item}
                  onDownload={downloadFile}
                  downloadBusy={busy === `download-${item.id}` ? item.id : null}
                  onCopy={copyDiscount}
                />
              </div>
            );
          }) : <p>No content to preview yet.</p>}
        </div>
      </section>

      <section className="admin-membership__section">
        <div className="admin-membership__section-heading">
          <FileUp size={19} aria-hidden="true" />
          <h3>Content library</h3>
        </div>
        <div className="admin-membership-content">
          {overview.content.length ? overview.content.map((item) => {
            const contentState = getContentState(item);
            return (
              <article key={item.id}>
                <div>
                  <span className={`admin-membership-content__status is-${contentState.key}`}>
                    {contentState.label}
                    {contentState.key === 'scheduled' ? ` · ${formatDate(item.publishedAt)}` : ''}
                  </span>
                  <h4>{item.title}</h4>
                  <p>{item.contentType} · order {item.sortOrder} · {item.filename || item.externalUrl || item.discountCode || 'no attachment'}</p>
                </div>
                <div className="admin-membership-content__actions">
                  {item.hasFile ? (
                    <button
                      type="button"
                      onClick={() => downloadFile(item)}
                      disabled={busy === `download-${item.id}`}
                      aria-label={`Download ${item.title} as admin`}
                    >
                      <Download size={17} aria-hidden="true" />
                    </button>
                  ) : null}
                  {item.externalUrl ? (
                    <a href={item.externalUrl} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`}>
                      <ExternalLink size={17} aria-hidden="true" />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => beginEdit(item)}
                    aria-label={`Edit ${item.title}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleContent(item)}
                    disabled={busy === `toggle-${item.id}`}
                  >
                    {item.isActive ? 'Move to draft' : 'Mark ready'}
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => deleteContent(item)}
                    disabled={busy === `delete-${item.id}`}
                    aria-label={`Delete ${item.title}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          }) : <p>No membership content yet.</p>}
        </div>
      </section>

      <section className="admin-membership__section">
        <div className="admin-membership__section-heading">
          <UsersRound size={19} aria-hidden="true" />
          <h3>Members</h3>
        </div>
        <div className="admin-membership-table-wrap">
          <table className="admin-membership-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Access</th>
                <th>Period end</th>
                <th>Last login</th>
              </tr>
            </thead>
            <tbody>
              {overview.members.map((member) => (
                <tr key={member.id}>
                  <td>{member.email}</td>
                  <td>{member.subscription?.status || 'none'}</td>
                  <td>{member.hasAccess ? (member.subscription?.cancelAtPeriodEnd ? 'until period end' : 'active') : 'blocked'}</td>
                  <td>{formatDate(member.subscription?.currentPeriodEnd)}</td>
                  <td>{formatDate(member.lastLoginAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default MembershipAdminSection;
