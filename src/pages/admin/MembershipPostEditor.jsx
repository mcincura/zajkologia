import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Bold,
  BookOpen,
  CalendarClock,
  Eye,
  File,
  FileText,
  Heading2,
  Image,
  Italic,
  Link as LinkIcon,
  List,
  LoaderCircle,
  MessageSquare,
  Music,
  Pin,
  Plus,
  Quote,
  Save,
  Send,
  Star,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { apiFetch, apiUrl } from '../../api/client';

const EMPTY_FORM = {
  title: '',
  slug: '',
  excerpt: '',
  bodyMd: '',
  status: 'draft',
  isPinned: false,
  allowComments: true,
  publishedAt: '',
  categoryIds: [],
};

const slugify = (value) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
};

const formFromPost = (post) =>
  post
    ? {
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        bodyMd: post.bodyMd || '',
        status: post.status || 'draft',
        isPinned: Boolean(post.isPinned),
        allowComments: Boolean(post.allowComments),
        publishedAt: toDateTimeLocal(post.publishedAt),
        categoryIds: post.categories?.map((category) => category.id) || [],
      }
    : EMPTY_FORM;

const assetIcon = {
  image: Image,
  video: Video,
  audio: Music,
  document: FileText,
  file: File,
  link: LinkIcon,
  discount: Star,
};

const formatBytes = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
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

const creatorErrorMessages = {
  missing_membership_post_title: 'Najprv zadajte názov príspevku.',
  invalid_membership_post_slug:
    'Z názvu sa nepodarilo vytvoriť URL adresu. Doplňte aspoň písmená alebo čísla.',
  membership_post_slug_exists:
    'Táto URL adresa už existuje. Zmeňte ju alebo použite iný názov.',
  invalid_membership_post_date: 'Dátum publikovania nie je platný.',
  membership_post_schedule_must_be_future:
    'Naplánovaný dátum musí byť v budúcnosti.',
  membership_post_file_too_large: 'Súbor je príliš veľký.',
  unsupported_membership_post_file_type: 'Tento typ súboru nie je podporovaný.',
  membership_post_file_type_mismatch:
    'Prípona súboru nezodpovedá jeho skutočnému typu.',
  invalid_membership_post_file_signature:
    'Súbor sa nepodarilo bezpečne overiť. Skúste ho exportovať znova.',
  unauthorized: 'Prihlásenie do administrácie vypršalo. Prihláste sa znova.',
};

const getCreatorErrorMessage = (error) =>
  creatorErrorMessages[error?.message] ||
  error?.message ||
  'Nastala neočakávaná chyba.';

const MembershipPostEditor = ({
  initialPost,
  categories,
  onSaved,
  onDeleted,
  onCancel,
  onStatus,
}) => {
  const [currentPost, setCurrentPost] = useState(initialPost);
  const [form, setForm] = useState(() => formFromPost(initialPost));
  const [slugTouched, setSlugTouched] = useState(Boolean(initialPost));
  const [editorMode, setEditorMode] = useState('write');
  const [busy, setBusy] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [notifyMembers, setNotifyMembers] = useState(false);
  const [external, setExternal] = useState({
    assetType: 'link',
    externalUrl: '',
    discountCode: '',
    caption: '',
  });
  const currentPostRef = useRef(initialPost);
  const draftCreationPromiseRef = useRef(null);
  const uploadPromiseRef = useRef(null);
  const titleInputRef = useRef(null);
  const slugInputRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const activePostId = currentPostRef.current?.id || null;
    const nextPostId = initialPost?.id || null;
    if (activePostId && activePostId === nextPostId) {
      currentPostRef.current = initialPost;
      setCurrentPost(initialPost);
      return;
    }

    currentPostRef.current = initialPost;
    setCurrentPost(initialPost);
    setForm(formFromPost(initialPost));
    setSlugTouched(Boolean(initialPost));
    setEditorMode('write');
    setValidationMessage('');
    setNotifyMembers(false);
  }, [initialPost]);

  const updateForm = (patch) =>
    setForm((current) => ({ ...current, ...patch }));

  const applyPost = (post, { syncForm = true } = {}) => {
    currentPostRef.current = post;
    setCurrentPost(post);
    if (syncForm) setForm(formFromPost(post));
    onSaved?.(post);
  };

  const validatePostIdentity = () => {
    const title = form.title.trim();
    if (!title) {
      const message =
        'Najprv zadajte názov príspevku. Potom automaticky vytvoríme koncept a nahráme súbor.';
      setValidationMessage(message);
      onStatus?.(message);
      titleInputRef.current?.focus();
      return false;
    }

    if (!slugify(form.slug || title)) {
      const message =
        'Doplňte platnú URL adresu príspevku – musí obsahovať aspoň písmeno alebo číslo.';
      setValidationMessage(message);
      onStatus?.(message);
      slugInputRef.current?.focus();
      return false;
    }

    setValidationMessage('');
    return true;
  };

  const persist = async ({ statusOverride, quiet = false } = {}) => {
    const persistedPost = currentPostRef.current;
    const status = statusOverride || form.status;
    const payload = {
      ...form,
      status,
      autoSlug: !persistedPost && !slugTouched,
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : null,
    };
    const saveRequest = async () => {
      const data = persistedPost
        ? await apiFetch(`/api/membership/admin/posts/${persistedPost.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiFetch('/api/membership/admin/posts', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      const post = data?.post;
      if (persistedPost) {
        applyPost(post);
      } else {
        applyPost(post, { syncForm: false });
        setForm((current) =>
          current.slug === payload.slug
            ? { ...current, slug: post.slug }
            : current
        );
      }
      setSlugTouched(true);
      if (!quiet) {
        onStatus?.(
          persistedPost ? 'Príspevok je uložený.' : 'Koncept bol vytvorený.'
        );
      }
      return post;
    };

    if (persistedPost) return saveRequest();
    if (draftCreationPromiseRef.current) {
      return draftCreationPromiseRef.current;
    }

    const creationPromise = saveRequest();
    draftCreationPromiseRef.current = creationPromise;
    try {
      return await creationPromise;
    } finally {
      if (draftCreationPromiseRef.current === creationPromise) {
        draftCreationPromiseRef.current = null;
      }
    }
  };

  const save = async (event) => {
    event?.preventDefault();
    if (!validatePostIdentity()) return;
    setBusy('save');
    try {
      await persist();
    } catch (error) {
      onStatus?.(`Uloženie zlyhalo: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const publish = async () => {
    if (!validatePostIdentity()) return;
    setBusy('publish');
    try {
      const savedPost = await persist({
        statusOverride: currentPost?.status === 'published' ? 'published' : 'draft',
        quiet: true,
      });
      const data = await apiFetch(
        `/api/membership/admin/posts/${savedPost.id}/publish`,
        {
          method: 'POST',
          body: JSON.stringify({ notifyMembers }),
        }
      );
      applyPost(data.post);
      onStatus?.(
        `Príspevok je publikovaný.${
          data.notificationsQueued
            ? ` Do fronty bolo pridaných ${data.notificationsQueued} e-mailov.`
            : ''
        }`
      );
    } catch (error) {
      onStatus?.(`Publikovanie zlyhalo: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const schedule = async () => {
    if (!validatePostIdentity()) return;
    if (!form.publishedAt) {
      onStatus?.('Vyberte dátum a čas naplánovaného publikovania.');
      return;
    }
    setBusy('schedule');
    try {
      const savedPost = await persist({ statusOverride: 'draft', quiet: true });
      const data = await apiFetch(
        `/api/membership/admin/posts/${savedPost.id}/schedule`,
        {
          method: 'POST',
          body: JSON.stringify({
            publishedAt: new Date(form.publishedAt).toISOString(),
          }),
        }
      );
      applyPost(data.post);
      onStatus?.('Príspevok je naplánovaný.');
    } catch (error) {
      onStatus?.(`Naplánovanie zlyhalo: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const archive = async () => {
    if (!currentPost) return;
    setBusy('archive');
    try {
      const data = await apiFetch(
        `/api/membership/admin/posts/${currentPost.id}/archive`,
        { method: 'POST' }
      );
      applyPost(data.post);
      onStatus?.('Príspevok je archivovaný a nie je dostupný členom.');
    } catch (error) {
      onStatus?.(`Archivovanie zlyhalo: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const removePost = async () => {
    if (!currentPost) {
      onCancel?.();
      return;
    }
    if (!window.confirm(`Odstrániť príspevok „${currentPost.title}“ aj so súbormi?`)) {
      return;
    }
    setBusy('delete');
    try {
      await apiFetch(`/api/membership/admin/posts/${currentPost.id}`, {
        method: 'DELETE',
      });
      onDeleted?.(currentPost.id);
      onStatus?.('Príspevok bol odstránený.');
    } catch (error) {
      onStatus?.(`Odstránenie zlyhalo: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const ensurePost = async () => {
    if (currentPostRef.current) return currentPostRef.current;
    return persist({ statusOverride: 'draft', quiet: true });
  };

  const uploadFiles = async (files) => {
    const uploadList = Array.from(files || []);
    if (!uploadList.length) return;
    if (!validatePostIdentity()) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (uploadPromiseRef.current) {
      onStatus?.('Nahrávanie už prebieha. Počkajte na jeho dokončenie.');
      return uploadPromiseRef.current;
    }

    const uploadPromise = (async () => {
      setBusy('upload');
      try {
        let post = await ensurePost();
        for (const [index, file] of uploadList.entries()) {
          onStatus?.(`Nahrávam ${index + 1}/${uploadList.length}: ${file.name}`);
          const body = new FormData();
          body.append('file', file);
          const isFirstCover =
            !post.coverAssetId && file.type.startsWith('image/');
          if (isFirstCover) body.append('makeCover', 'true');
          const response = await fetch(
            apiUrl(`/api/membership/admin/posts/${post.id}/assets`),
            {
              method: 'POST',
              body,
              credentials: 'include',
            }
          );
          if (!response.ok) throw new Error(await getResponseError(response));
          const data = await response.json();
          post = data.post;
          applyPost(post, { syncForm: false });
        }
        onStatus?.(
          uploadList.length === 1
            ? 'Súbor je nahraný.'
            : `${uploadList.length} súborov je nahraných.`
        );
      } catch (error) {
        onStatus?.(`Nahrávanie zlyhalo: ${getCreatorErrorMessage(error)}`);
      } finally {
        setBusy('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    })();

    uploadPromiseRef.current = uploadPromise;
    try {
      return await uploadPromise;
    } finally {
      if (uploadPromiseRef.current === uploadPromise) {
        uploadPromiseRef.current = null;
      }
    }
  };

  const openFilePicker = () => {
    if (!validatePostIdentity()) return;
    fileInputRef.current?.click();
  };

  const addExternal = async (event) => {
    event.preventDefault();
    if (!validatePostIdentity()) return;
    setBusy('external');
    try {
      const post = await ensurePost();
      const data = await apiFetch(
        `/api/membership/admin/posts/${post.id}/assets/external`,
        {
          method: 'POST',
          body: JSON.stringify(external),
        }
      );
      applyPost(data.post, { syncForm: false });
      setExternal({
        assetType: 'link',
        externalUrl: '',
        discountCode: '',
        caption: '',
      });
      onStatus?.('Externý obsah bol pridaný.');
    } catch (error) {
      onStatus?.(`Pridanie zlyhalo: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const updateAsset = async (asset, patch) => {
    setBusy(`asset-${asset.id}`);
    try {
      const data = await apiFetch(
        `/api/membership/admin/posts/${currentPost.id}/assets/${asset.id}`,
        {
          method: 'PUT',
          body: JSON.stringify(patch),
        }
      );
      applyPost(data.post, { syncForm: false });
      onStatus?.('Popis súboru je uložený.');
    } catch (error) {
      onStatus?.(`Úprava súboru zlyhala: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const removeAsset = async (asset) => {
    if (!window.confirm(`Odstrániť súbor „${asset.filename || asset.caption || asset.assetType}“?`)) {
      return;
    }
    setBusy(`asset-${asset.id}`);
    try {
      const data = await apiFetch(
        `/api/membership/admin/posts/${currentPost.id}/assets/${asset.id}`,
        { method: 'DELETE' }
      );
      applyPost(data.post, { syncForm: false });
      onStatus?.('Súbor bol odstránený.');
    } catch (error) {
      onStatus?.(`Odstránenie súboru zlyhalo: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const reorderAsset = async (asset, direction) => {
    const assets = currentPost.assets || [];
    const index = assets.findIndex((item) => item.id === asset.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= assets.length) return;
    const ordered = assets.map((item) => item.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setBusy(`asset-${asset.id}`);
    try {
      const data = await apiFetch(
        `/api/membership/admin/posts/${currentPost.id}/assets/order`,
        {
          method: 'PUT',
          body: JSON.stringify({ assetIds: ordered }),
        }
      );
      applyPost(data.post, { syncForm: false });
    } catch (error) {
      onStatus?.(`Zmena poradia zlyhala: ${getCreatorErrorMessage(error)}`);
    } finally {
      setBusy('');
    }
  };

  const setCover = async (asset) => {
    setBusy(`asset-${asset.id}`);
    try {
      const data = await apiFetch(
        `/api/membership/admin/posts/${currentPost.id}/cover`,
        {
          method: 'PUT',
          body: JSON.stringify({ assetId: asset.id }),
        }
      );
      applyPost(data.post, { syncForm: false });
      onStatus?.('Titulný obrázok je nastavený.');
    } catch (error) {
      onStatus?.(
        `Titulný obrázok sa nepodarilo nastaviť: ${getCreatorErrorMessage(error)}`
      );
    } finally {
      setBusy('');
    }
  };

  const insertMarkdown = (before, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = form.bodyMd.slice(start, end);
    const nextValue = `${form.bodyMd.slice(0, start)}${before}${selected}${after}${form.bodyMd.slice(end)}`;
    updateForm({ bodyMd: nextValue });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    });
  };

  const categorySet = useMemo(
    () => new Set(form.categoryIds),
    [form.categoryIds]
  );

  return (
    <section className="creator-editor" aria-label="Editor klubového príspevku">
      <form className="creator-editor__main" onSubmit={save}>
        <div className="creator-editor__heading">
          <div>
            <h3>{currentPost ? 'Upraviť príspevok' : 'Nový príspevok'}</h3>
            <p>
              {currentPost
                ? `Naposledy upravené ${new Date(currentPost.updatedAt).toLocaleString('sk-SK')}`
                : 'Zadajte názov. Pri prvom nahratí súboru automaticky vytvoríme koncept.'}
            </p>
          </div>
          <button type="button" className="admin-membership__secondary" onClick={onCancel}>
            <X size={17} aria-hidden="true" />
            Zavrieť editor
          </button>
        </div>

        <div className="creator-editor__fields">
          <label>
            <span>Názov *</span>
            <input
              ref={titleInputRef}
              value={form.title}
              onChange={(event) => {
                const title = event.target.value;
                if (title.trim()) setValidationMessage('');
                updateForm({
                  title,
                  ...(!slugTouched ? { slug: slugify(title) } : {}),
                });
              }}
              aria-invalid={Boolean(validationMessage && !form.title.trim())}
              required
              maxLength={255}
            />
          </label>
          <label>
            <span>URL adresa *</span>
            <input
              ref={slugInputRef}
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                setValidationMessage('');
                updateForm({ slug: slugify(event.target.value) });
              }}
              required
              maxLength={191}
            />
          </label>
          {validationMessage ? (
            <p className="creator-editor__validation" role="alert">
              {validationMessage}
            </p>
          ) : null}
          <label className="is-wide">
            <span>Krátky úvod</span>
            <textarea
              rows={3}
              value={form.excerpt}
              onChange={(event) => updateForm({ excerpt: event.target.value })}
              maxLength={4000}
            />
          </label>
        </div>

        <div className="creator-editor__body">
          <div className="creator-editor__body-header">
            <span>Obsah</span>
            <div role="tablist" aria-label="Režim editora">
              <button
                type="button"
                role="tab"
                aria-selected={editorMode === 'write'}
                onClick={() => setEditorMode('write')}
              >
                Písať
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={editorMode === 'preview'}
                onClick={() => setEditorMode('preview')}
              >
                Náhľad
              </button>
            </div>
          </div>
          {editorMode === 'write' ? (
            <>
              <div className="creator-editor__toolbar" aria-label="Formátovanie">
                <button type="button" onClick={() => insertMarkdown('## ')}>
                  <Heading2 size={17} aria-hidden="true" />
                  <span className="sr-only">Nadpis</span>
                </button>
                <button type="button" onClick={() => insertMarkdown('**', '**')}>
                  <Bold size={17} aria-hidden="true" />
                  <span className="sr-only">Tučné písmo</span>
                </button>
                <button type="button" onClick={() => insertMarkdown('*', '*')}>
                  <Italic size={17} aria-hidden="true" />
                  <span className="sr-only">Kurzíva</span>
                </button>
                <button type="button" onClick={() => insertMarkdown('[', '](https://)')}>
                  <LinkIcon size={17} aria-hidden="true" />
                  <span className="sr-only">Odkaz</span>
                </button>
                <button type="button" onClick={() => insertMarkdown('> ')}>
                  <Quote size={17} aria-hidden="true" />
                  <span className="sr-only">Citát</span>
                </button>
                <button type="button" onClick={() => insertMarkdown('- ')}>
                  <List size={17} aria-hidden="true" />
                  <span className="sr-only">Zoznam</span>
                </button>
              </div>
              <textarea
                ref={textareaRef}
                className="creator-editor__markdown"
                value={form.bodyMd}
                onChange={(event) => updateForm({ bodyMd: event.target.value })}
                placeholder="Napíšte obsah príspevku v Markdown formáte…"
                aria-label="Obsah príspevku"
              />
            </>
          ) : (
            <div className="creator-editor__preview">
              {form.bodyMd ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {form.bodyMd}
                </ReactMarkdown>
              ) : (
                <p>Náhľad sa zobrazí po napísaní obsahu.</p>
              )}
            </div>
          )}
          <div className="creator-editor__counter">
            {form.bodyMd.trim() ? form.bodyMd.trim().split(/\s+/).length : 0} slov ·{' '}
            {form.bodyMd.length} znakov
          </div>
        </div>

        <fieldset className="creator-editor__categories">
          <legend>Kategórie</legend>
          {categories.length ? (
            <div>
              {categories.map((category) => (
                <label key={category.id}>
                  <input
                    type="checkbox"
                    checked={categorySet.has(category.id)}
                    onChange={(event) =>
                      updateForm({
                        categoryIds: event.target.checked
                          ? [...form.categoryIds, category.id]
                          : form.categoryIds.filter((id) => id !== category.id),
                      })
                    }
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p>Najprv vytvorte kategóriu v časti Kategórie.</p>
          )}
        </fieldset>

        <div className="creator-editor__toggles">
          <label>
            <input
              type="checkbox"
              checked={form.allowComments}
              onChange={(event) =>
                updateForm({ allowComments: event.target.checked })
              }
            />
            <MessageSquare size={17} aria-hidden="true" />
            Povoliť komentáre
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(event) =>
                updateForm({ isPinned: event.target.checked })
              }
            />
            <Pin size={17} aria-hidden="true" />
            Pripnúť príspevok
          </label>
        </div>
      </form>

      <aside className="creator-editor__inspector">
        <section className="creator-publish-panel">
          <h4>Publikovanie</h4>
          <label>
            <span>Stav</span>
            <select
              value={form.status}
              onChange={(event) => updateForm({ status: event.target.value })}
            >
              <option value="draft">Koncept</option>
              <option value="scheduled">Naplánovaný</option>
              <option value="published">Publikovaný</option>
              <option value="archived">Archivovaný</option>
            </select>
          </label>
          <label>
            <span>Dátum a čas publikovania</span>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(event) =>
                updateForm({ publishedAt: event.target.value })
              }
            />
          </label>
          <label className="creator-publish-panel__notify">
            <input
              type="checkbox"
              checked={notifyMembers}
              onChange={(event) => setNotifyMembers(event.target.checked)}
            />
            <span>Pripraviť e-mail pri okamžitom publikovaní</span>
          </label>
          <div className="creator-publish-panel__actions">
            <button
              type="button"
              className="admin-membership__secondary"
              onClick={save}
              disabled={Boolean(busy)}
            >
              <Save size={17} aria-hidden="true" />
              {busy === 'save' ? 'Ukladám…' : 'Uložiť koncept'}
            </button>
            <button
              type="button"
              className="admin-membership__secondary"
              onClick={() => setEditorMode('preview')}
            >
              <Eye size={17} aria-hidden="true" />
              Náhľad
            </button>
            <button
              type="button"
              className="admin-membership__secondary"
              onClick={schedule}
              disabled={Boolean(busy)}
            >
              <CalendarClock size={17} aria-hidden="true" />
              Naplánovať
            </button>
            <button
              type="button"
              className="admin-membership__primary"
              onClick={publish}
              disabled={Boolean(busy)}
            >
              {busy === 'publish' ? (
                <LoaderCircle className="membership-spinner" size={17} aria-hidden="true" />
              ) : (
                <Send size={17} aria-hidden="true" />
              )}
              {busy === 'publish' ? 'Publikujem…' : 'Publikovať'}
            </button>
          </div>
          {currentPost ? (
            <div className="creator-publish-panel__danger">
              <button type="button" onClick={archive} disabled={Boolean(busy)}>
                <Archive size={16} aria-hidden="true" />
                Archivovať
              </button>
              <button type="button" onClick={removePost} disabled={Boolean(busy)}>
                <Trash2 size={16} aria-hidden="true" />
                Odstrániť
              </button>
            </div>
          ) : null}
        </section>

        <section className="creator-assets">
          <h4>Médiá a prílohy</h4>
          <div
            className={`creator-assets__dropzone ${dragActive ? 'is-active' : ''}`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              void uploadFiles(event.dataTransfer.files);
            }}
          >
            <UploadCloud size={28} aria-hidden="true" />
            <strong>Pretiahnite súbory alebo vyberte z počítača</strong>
            <span>Obrázky, video, audio, PDF a ďalšie súbory</span>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={busy === 'upload'}
            >
              <Plus size={16} aria-hidden="true" />
              {busy === 'upload' ? 'Nahrávam…' : 'Vybrať súbory'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/wav,audio/ogg,application/pdf,.zip,.docx,.xlsx,.pptx,.txt,.csv"
              onChange={(event) => void uploadFiles(event.target.files)}
            />
          </div>

          <div className="creator-assets__list">
            {currentPost?.assets?.map((asset, index) => {
              const Icon = assetIcon[asset.assetType] || File;
              const isCover = currentPost.coverAssetId === asset.id;
              return (
                <article className="creator-asset" key={asset.id}>
                  <div className="creator-asset__top">
                    <div className="creator-asset__icon">
                      {asset.assetType === 'image' && asset.storageProvider === 'local' ? (
                        <img
                          src={apiUrl(
                            `/api/membership/admin/posts/${currentPost.id}/assets/${asset.id}`
                          )}
                          alt=""
                          crossOrigin="use-credentials"
                        />
                      ) : (
                        <Icon size={19} aria-hidden="true" />
                      )}
                    </div>
                    <div>
                      <strong>{asset.filename || asset.caption || asset.assetType}</strong>
                      <span>
                        {asset.assetType} {formatBytes(asset.fileSize) ? `· ${formatBytes(asset.fileSize)}` : ''}
                        {' · '}
                        {asset.processingStatus === 'ready' ? 'Pripravené' : asset.processingStatus}
                      </span>
                    </div>
                    <div className="creator-asset__actions">
                      <button
                        type="button"
                        onClick={() => reorderAsset(asset, -1)}
                        disabled={index === 0 || busy === `asset-${asset.id}`}
                        aria-label="Posunúť súbor vyššie"
                      >
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderAsset(asset, 1)}
                        disabled={
                          index === currentPost.assets.length - 1 ||
                          busy === `asset-${asset.id}`
                        }
                        aria-label="Posunúť súbor nižšie"
                      >
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                      {asset.assetType === 'image' ? (
                        <button
                          type="button"
                          className={isCover ? 'is-cover' : ''}
                          onClick={() => setCover(asset)}
                          disabled={busy === `asset-${asset.id}`}
                          aria-label={
                            isCover
                              ? 'Toto je titulný obrázok'
                              : 'Nastaviť ako titulný obrázok'
                          }
                        >
                          <Star
                            size={15}
                            fill={isCover ? 'currentColor' : 'none'}
                            aria-hidden="true"
                          />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeAsset(asset)}
                        disabled={busy === `asset-${asset.id}`}
                        aria-label="Odstrániť súbor"
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <label>
                    <span>Popis</span>
                    <input
                      defaultValue={asset.caption}
                      onBlur={(event) => {
                        if (event.target.value !== asset.caption) {
                          void updateAsset(asset, { caption: event.target.value });
                        }
                      }}
                    />
                  </label>
                  {asset.assetType === 'image' ? (
                    <label>
                      <span>Alternatívny text</span>
                      <input
                        defaultValue={asset.altText}
                        onBlur={(event) => {
                          if (event.target.value !== asset.altText) {
                            void updateAsset(asset, { altText: event.target.value });
                          }
                        }}
                      />
                    </label>
                  ) : null}
                </article>
              );
            })}
          </div>

          <form className="creator-assets__external" onSubmit={addExternal}>
            <h5>Externý odkaz alebo zľavový kód</h5>
            <select
              value={external.assetType}
              onChange={(event) =>
                setExternal((current) => ({
                  ...current,
                  assetType: event.target.value,
                }))
              }
            >
              <option value="link">Členský odkaz</option>
              <option value="video">Externé video</option>
              <option value="audio">Externé audio</option>
              <option value="discount">Zľavový kód</option>
            </select>
            <input
              value={external.caption}
              onChange={(event) =>
                setExternal((current) => ({
                  ...current,
                  caption: event.target.value,
                }))
              }
              placeholder="Popis"
            />
            {external.assetType === 'discount' ? (
              <input
                value={external.discountCode}
                onChange={(event) =>
                  setExternal((current) => ({
                    ...current,
                    discountCode: event.target.value,
                  }))
                }
                placeholder="Zľavový kód"
                required
              />
            ) : (
              <input
                type="url"
                value={external.externalUrl}
                onChange={(event) =>
                  setExternal((current) => ({
                    ...current,
                    externalUrl: event.target.value,
                  }))
                }
                placeholder="https://"
                required
              />
            )}
            <button type="submit" disabled={busy === 'external'}>
              <Plus size={16} aria-hidden="true" />
              Pridať
            </button>
          </form>
        </section>
      </aside>
    </section>
  );
};

export default MembershipPostEditor;
