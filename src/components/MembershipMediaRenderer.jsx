import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const mediaSessionActions = ['play', 'pause', 'seekbackward', 'seekforward', 'seekto'];

const setMediaSessionAction = (session, action, handler) => {
  try {
    session.setActionHandler(action, handler);
  } catch {
    // Older browsers may expose Media Session without every action.
  }
};

const updateMediaSessionPlaybackState = (state) => {
  try {
    if (navigator.mediaSession) navigator.mediaSession.playbackState = state;
  } catch {
    // Some partial Media Session implementations reject playback-state updates.
  }
};

const AudioPostPlayer = ({
  asset,
  postId,
  onMediaEvent,
  onDurationChange,
  artworkUrl,
  recordStart,
}) => {
  const audioRef = useRef(null);

  const clearMediaSession = useCallback(() => {
    const session = navigator.mediaSession;
    if (!session) return;
    try {
      session.metadata = null;
      session.playbackState = 'none';
    } catch {
      // Media Session is optional browser enhancement.
    }
    mediaSessionActions.forEach((action) => setMediaSessionAction(session, action, null));
  }, []);

  const configureMediaSession = useCallback(() => {
    const session = navigator.mediaSession;
    if (!session) return;
    const title = asset.caption || asset.filename || 'Podcast Zajkológia';
    try {
      if (typeof window.MediaMetadata === 'function') {
        session.metadata = new window.MediaMetadata({
          title,
          artist: 'Zajkológia',
          album: 'Zajkológia klub',
          ...(artworkUrl ? { artwork: [{ src: artworkUrl }] } : {}),
        });
      }
      session.playbackState = audioRef.current?.paused ? 'paused' : 'playing';
    } catch {
      // Keep native controls working when metadata cannot be configured.
    }
    setMediaSessionAction(session, 'play', () => {
      const playResult = audioRef.current?.play();
      if (playResult?.catch) playResult.catch(() => {});
    });
    setMediaSessionAction(session, 'pause', () => audioRef.current?.pause());
    setMediaSessionAction(session, 'seekbackward', (details = {}) => {
      const audio = audioRef.current;
      if (audio) audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
    });
    setMediaSessionAction(session, 'seekforward', (details = {}) => {
      const audio = audioRef.current;
      if (audio && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + (details.seekOffset || 10));
      }
    });
    setMediaSessionAction(session, 'seekto', (details = {}) => {
      const audio = audioRef.current;
      if (audio && Number.isFinite(details.seekTime)) audio.currentTime = details.seekTime;
    });
  }, [artworkUrl, asset.caption, asset.filename]);

  useEffect(() => clearMediaSession, [asset.id, clearMediaSession]);

  const syncPosition = () => {
    const session = navigator.mediaSession;
    const audio = audioRef.current;
    if (!session?.setPositionState || !audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    try {
      session.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(audio.currentTime, audio.duration),
      });
    } catch {
      // Position state is not available on all Media Session implementations.
    }
  };

  return (
    <section className="membership-post-media__audio" data-primary-audio={onDurationChange ? 'true' : undefined}>
      <div className="membership-post-media__icon" aria-hidden="true">
        <Headphones size={25} />
      </div>
      <div>
        <strong>{asset.caption || asset.filename || 'Audio nahrávka'}</strong>
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          crossOrigin="use-credentials"
          onLoadedMetadata={(event) => {
            onDurationChange?.(event.currentTarget.duration);
            syncPosition();
          }}
          onPlay={() => {
            recordStart(asset);
            configureMediaSession();
            syncPosition();
          }}
          onPause={() => {
            updateMediaSessionPlaybackState('paused');
            syncPosition();
          }}
          onTimeUpdate={syncPosition}
          onEnded={() => {
            updateMediaSessionPlaybackState('none');
            onMediaEvent?.({ postId, assetId: asset.id, eventType: 'media_complete' });
          }}
        >
          <source src={membershipMediaUrl(asset.streamUrl)} type={asset.mimeType} />
          Váš prehliadač nepodporuje prehrávanie audia.
        </audio>
      </div>
    </section>
  );
};

const MembershipMediaRenderer = ({
  postId,
  assets = [],
  onDownload,
  onMediaEvent,
  downloadBusy = null,
  onStatus,
  onAudioDurationChange,
  artworkUrl = '',
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
            <AudioPostPlayer
              asset={asset}
              artworkUrl={artworkUrl}
              key={asset.id}
              onDurationChange={onAudioDurationChange}
              onMediaEvent={onMediaEvent}
              postId={postId}
              recordStart={recordStart}
            />
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
