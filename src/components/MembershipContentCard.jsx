import React from 'react';
import {
  BookOpen,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  Link as LinkIcon,
  Play,
  Tag,
} from 'lucide-react';

import '../styles/membership.css';

const CONTENT_ICONS = {
  pdf: FileText,
  file: Download,
  video: Play,
  podcast: Headphones,
  discount: Tag,
  link: LinkIcon,
};

const CONTENT_LABELS = {
  pdf: 'PDF na stiahnutie',
  file: 'Súbor na stiahnutie',
  video: 'Video',
  podcast: 'Podcast',
  discount: 'Členská zľava',
  link: 'Členský odkaz',
};

const MembershipContentCard = ({ item, onDownload, downloadBusy, onCopy }) => {
  const Icon = CONTENT_ICONS[item.contentType] || BookOpen;
  const isExternal = ['video', 'podcast', 'link'].includes(item.contentType);

  return (
    <article className="membership-content-card">
      <div className="membership-content-card__icon" aria-hidden="true">
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="membership-content-card__body">
        <span className="membership-content-card__type">
          {CONTENT_LABELS[item.contentType] || 'Členský obsah'}
        </span>
        <h3>{item.title}</h3>
        {item.description ? <p>{item.description}</p> : null}
        {item.filename ? (
          <span className="membership-content-card__filename">{item.filename}</span>
        ) : null}
      </div>
      <div className="membership-content-card__action">
        {item.hasFile ? (
          <button
            type="button"
            className="membership-button membership-button--secondary"
            onClick={() => onDownload(item)}
            disabled={downloadBusy === item.id}
          >
            <Download size={17} aria-hidden="true" />
            {downloadBusy === item.id ? 'Sťahujem…' : 'Stiahnuť'}
          </button>
        ) : null}
        {isExternal && item.externalUrl ? (
          <a
            className="membership-button membership-button--secondary"
            href={item.externalUrl}
            target="_blank"
            rel="noreferrer"
          >
            {item.contentType === 'video'
              ? 'Pozrieť'
              : item.contentType === 'podcast'
                ? 'Vypočuť'
                : 'Otvoriť'}
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : null}
        {item.contentType === 'discount' && item.discountCode ? (
          <button
            type="button"
            className="membership-discount-code"
            onClick={() => onCopy(item)}
            aria-label={`Kopírovať zľavový kód ${item.discountCode}`}
          >
            <span>{item.discountCode}</span>
            <Copy size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </article>
  );
};

export default MembershipContentCard;
