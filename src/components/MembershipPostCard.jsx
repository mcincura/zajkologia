import React from 'react';
import {
  Bookmark,
  BookOpen,
  CalendarDays,
  FileText,
  Headphones,
  Image,
  LockKeyhole,
  MessageCircle,
  Pin,
  Play,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { membershipMediaUrl } from '../api/client';

const TYPE_META = {
  video: { label: 'Video', icon: Play },
  audio: { label: 'Audio', icon: Headphones },
  document: { label: 'PDF', icon: FileText },
  file: { label: 'Súbor', icon: BookOpen },
  image: { label: 'Obrázky', icon: Image },
  link: { label: 'Odkaz', icon: BookOpen },
  discount: { label: 'Výhoda', icon: BookOpen },
};

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

const PostMeta = ({ post }) => (
  <div className="membership-post-card__meta">
    <span>
      <CalendarDays size={15} aria-hidden="true" />
      {formatDate(post.publishedAt)}
    </span>
    {post.assetTypes?.slice(0, 2).map((type) => {
      const meta = TYPE_META[type] || TYPE_META.file;
      const Icon = meta.icon;
      return (
        <span key={type}>
          <Icon size={15} aria-hidden="true" />
          {meta.label}
        </span>
      );
    })}
    <span>
      <MessageCircle size={15} aria-hidden="true" />
      {post.commentCount || 0}
    </span>
  </div>
);

const MembershipPostCard = ({
  post,
  featured = false,
  onSave,
  saveBusy = false,
}) => (
  <article
    className={`membership-post-card ${
      featured ? 'membership-post-card--featured' : ''
    } ${post.locked ? 'is-locked' : ''}`}
  >
    {post.isPinned ? (
      <div className="membership-post-card__pinned">
        <Pin size={15} aria-hidden="true" />
        Pripnuté
      </div>
    ) : null}
    <Link
      to={`/klub/${encodeURIComponent(post.slug)}`}
      className="membership-post-card__main"
      aria-label={`${post.title}${post.locked ? ' – ukážka pre návštevníkov' : ''}`}
    >
      {post.cover?.url ? (
        <div className="membership-post-card__cover">
          <img
            src={membershipMediaUrl(post.cover.url)}
            alt={post.cover.altText || ''}
            loading={featured ? 'eager' : 'lazy'}
          />
        </div>
      ) : (
        <div className="membership-post-card__cover membership-post-card__cover--empty" aria-hidden="true">
          {post.locked ? <LockKeyhole size={30} /> : <BookOpen size={30} />}
        </div>
      )}
      <div className="membership-post-card__copy">
        <div>
          <h2>{post.title}</h2>
          {post.excerpt ? <p>{post.excerpt}</p> : null}
        </div>
        <PostMeta post={post} />
        <span className="membership-post-card__open">
          {post.locked ? (
            <>
              <LockKeyhole size={16} aria-hidden="true" />
              Zobraziť ukážku
            </>
          ) : (
            'Otvoriť príspevok'
          )}
        </span>
      </div>
    </Link>
    {!post.locked && onSave ? (
      <button
        type="button"
        className={`membership-post-card__save ${post.isSaved ? 'is-saved' : ''}`}
        onClick={() => onSave(post)}
        disabled={saveBusy}
        aria-pressed={Boolean(post.isSaved)}
        aria-label={post.isSaved ? `Odstrániť ${post.title} z uložených` : `Uložiť ${post.title}`}
      >
        <Bookmark size={18} fill={post.isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
        {post.isSaved ? 'Uložené' : 'Uložiť'}
      </button>
    ) : null}
  </article>
);

export default MembershipPostCard;
