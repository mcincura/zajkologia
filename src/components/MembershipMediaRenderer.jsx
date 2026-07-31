import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  Image as ImageIcon,
  LoaderCircle,
  Play,
} from 'lucide-react';

import { membershipMediaUrl } from '../api/client';

const formatBytes = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
};

const MembershipMediaRenderer = ({
  postId,
  assets = [],
  onDownload,
  onMediaEvent,
  downloadBusy = null,
  onStatus,
}) => {
  const startedAssets = useRef(new Set());
  const [copiedAssetId, setCopiedAssetId] = useState(null);

  const recordStart = (asset) => {
    if (startedAssets.current.has(asset.id)) return;
    startedAssets.current.add(asset.id);
    onMediaEvent?.({
      postId,
      assetId: asset.id,
      eventType: 'media_start',
    });
  };

  const copyDiscount = async (asset) => {
    try {
      await navigator.clipboard.writeText(asset.discountCode);
      setCopiedAssetId(asset.id);
      onStatus?.(`Kód ${asset.discountCode} je skopírovaný.`);
      window.setTimeout(() => setCopiedAssetId(null), 1800);
    } catch {
      onStatus?.(`Zľavový kód: ${asset.discountCode}`);
    }
  };

  if (!assets.length) return null;

  return (
    <div className="membership-post-media" aria-label="Médiá a prílohy">
      {assets.map((asset) => {
        if (asset.assetType === 'image' && asset.streamUrl) {
          return (
            <figure className="membership-post-media__image" key={asset.id}>
              <img
                src={membershipMediaUrl(asset.streamUrl)}
                alt={asset.altText || ''}
                crossOrigin="use-credentials"
                loading="lazy"
              />
              {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
            </figure>
          );
        }

        if (asset.assetType === 'video' && asset.streamUrl) {
          return (
            <figure className="membership-post-media__video" key={asset.id}>
              <video
                controls
                preload="metadata"
                crossOrigin="use-credentials"
                onPlay={() => recordStart(asset)}
                onEnded={() =>
                  onMediaEvent?.({
                    postId,
                    assetId: asset.id,
                    eventType: 'media_complete',
                  })
                }
              >
                <source src={membershipMediaUrl(asset.streamUrl)} type={asset.mimeType} />
                Váš prehliadač nepodporuje prehrávanie videa.
              </video>
              {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
            </figure>
          );
        }

        if (asset.assetType === 'audio' && asset.streamUrl) {
          return (
            <section className="membership-post-media__audio" key={asset.id}>
              <div className="membership-post-media__icon" aria-hidden="true">
                <Headphones size={25} />
              </div>
              <div>
                <strong>{asset.caption || asset.filename || 'Audio nahrávka'}</strong>
                <audio
                  controls
                  preload="metadata"
                  crossOrigin="use-credentials"
                  onPlay={() => recordStart(asset)}
                  onEnded={() =>
                    onMediaEvent?.({
                      postId,
                      assetId: asset.id,
                      eventType: 'media_complete',
                    })
                  }
                >
                  <source src={membershipMediaUrl(asset.streamUrl)} type={asset.mimeType} />
                  Váš prehliadač nepodporuje prehrávanie audia.
                </audio>
              </div>
            </section>
          );
        }

        if (asset.assetType === 'discount') {
          return (
            <section className="membership-post-media__attachment" key={asset.id}>
              <div className="membership-post-media__icon" aria-hidden="true">
                {copiedAssetId === asset.id ? <Check size={23} /> : <Copy size={23} />}
              </div>
              <div>
                <strong>{asset.caption || 'Členský zľavový kód'}</strong>
                <span className="membership-post-media__code">{asset.discountCode}</span>
              </div>
              <button type="button" onClick={() => copyDiscount(asset)}>
                <Copy size={17} aria-hidden="true" />
                Kopírovať
              </button>
            </section>
          );
        }

        if (asset.externalUrl) {
          const Icon =
            asset.assetType === 'video'
              ? Play
              : asset.assetType === 'audio'
                ? Headphones
                : ExternalLink;
          return (
            <section className="membership-post-media__attachment" key={asset.id}>
              <div className="membership-post-media__icon" aria-hidden="true">
                <Icon size={23} />
              </div>
              <div>
                <strong>{asset.caption || asset.filename || 'Členský odkaz'}</strong>
                <span>Otvorí sa v novom okne.</span>
              </div>
              <a href={asset.externalUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={17} aria-hidden="true" />
                Otvoriť
              </a>
            </section>
          );
        }

        const Icon =
          asset.assetType === 'document'
            ? FileText
            : asset.assetType === 'image'
              ? ImageIcon
              : Download;
        return (
          <section className="membership-post-media__attachment" key={asset.id}>
            <div className="membership-post-media__icon" aria-hidden="true">
              <Icon size={23} />
            </div>
            <div>
              <strong>{asset.caption || asset.filename || 'Členský súbor'}</strong>
              <span>
                {[asset.filename, formatBytes(asset.fileSize)].filter(Boolean).join(' · ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onDownload?.(asset)}
              disabled={downloadBusy === asset.id}
            >
              {downloadBusy === asset.id ? (
                <LoaderCircle className="membership-spinner" size={17} aria-hidden="true" />
              ) : (
                <Download size={17} aria-hidden="true" />
              )}
              {downloadBusy === asset.id ? 'Sťahujem…' : 'Stiahnuť'}
            </button>
          </section>
        );
      })}
    </div>
  );
};

export default MembershipMediaRenderer;
