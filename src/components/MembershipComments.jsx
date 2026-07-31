import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle, MessageCircle, Send, Trash2 } from 'lucide-react';

import {
  createMembershipComment,
  deleteMembershipComment,
  loadMembershipComments,
} from '../api/client';

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

const MembershipComments = ({
  postId,
  allowComments,
  initialCount = 0,
  onCountChange,
  onStatus,
}) => {
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const nextComments = await loadMembershipComments(postId);
        if (!cancelled) {
          setComments(nextComments);
          onCountChange?.(nextComments.length);
        }
      } catch {
        if (!cancelled) setError('Komentáre sa nepodarilo načítať.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [onCountChange, postId]);

  const submit = async (event) => {
    event.preventDefault();
    const nextBody = body.trim();
    if (!nextBody) {
      setError('Napíšte komentár pred odoslaním.');
      textareaRef.current?.focus();
      return;
    }
    setBusy('create');
    setError('');
    try {
      const comment = await createMembershipComment({ postId, body: nextBody });
      const nextComments = [...comments, comment];
      setComments(nextComments);
      setBody('');
      onCountChange?.(nextComments.length);
      onStatus?.('Komentár bol pridaný.');
    } catch {
      setError('Komentár sa nepodarilo pridať. Skúste to znova.');
    } finally {
      setBusy('');
    }
  };

  const remove = async (comment) => {
    setBusy(`delete-${comment.id}`);
    setError('');
    try {
      await deleteMembershipComment(comment.id);
      const nextComments = comments.filter((item) => item.id !== comment.id);
      setComments(nextComments);
      onCountChange?.(nextComments.length);
      onStatus?.('Komentár bol odstránený.');
    } catch {
      setError('Komentár sa nepodarilo odstrániť.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="membership-comments" aria-labelledby="membership-comments-title">
      <div className="membership-comments__heading">
        <MessageCircle size={21} aria-hidden="true" />
        <h2 id="membership-comments-title">
          Komentáre ({loading ? initialCount : comments.length})
        </h2>
      </div>

      {allowComments ? (
        <form className="membership-comments__form" onSubmit={submit}>
          <label htmlFor="membership-comment-body">Pridajte komentár</label>
          <textarea
            ref={textareaRef}
            id="membership-comment-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            maxLength={5000}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'membership-comment-error' : undefined}
            placeholder="Napíšte svoj komentár…"
          />
          <div className="membership-comments__form-footer">
            <span>{body.length}/5000</span>
            <button type="submit" disabled={busy === 'create'}>
              {busy === 'create' ? (
                <LoaderCircle className="membership-spinner" size={17} aria-hidden="true" />
              ) : (
                <Send size={17} aria-hidden="true" />
              )}
              {busy === 'create' ? 'Odosielam…' : 'Pridať komentár'}
            </button>
          </div>
        </form>
      ) : (
        <p className="membership-comments__disabled">
          Komentáre sú pri tomto príspevku vypnuté.
        </p>
      )}

      <div className="membership-comments__live" role="status" aria-live="polite">
        {error ? <span id="membership-comment-error">{error}</span> : null}
      </div>

      {loading ? (
        <div className="membership-comments__loading" role="status">
          <LoaderCircle className="membership-spinner" size={18} aria-hidden="true" />
          Načítavam komentáre…
        </div>
      ) : comments.length ? (
        <div className="membership-comments__list">
          {comments.map((comment) => (
            <article className="membership-comment" key={comment.id}>
              <div className="membership-comment__avatar" aria-hidden="true">
                {comment.author?.initials || '?'}
              </div>
              <div className="membership-comment__body">
                <div className="membership-comment__author">
                  <strong>{comment.author?.name || 'Člen'}</strong>
                  <time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time>
                </div>
                <p>{comment.body}</p>
              </div>
              {comment.canDelete ? (
                <button
                  type="button"
                  className="membership-comment__delete"
                  onClick={() => remove(comment)}
                  disabled={busy === `delete-${comment.id}`}
                  aria-label="Odstrániť váš komentár"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="membership-comments__empty">
          Zatiaľ bez komentárov. Môžete byť prvý/á.
        </p>
      )}
    </section>
  );
};

export default MembershipComments;
