import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import MembershipMediaRenderer from './MembershipMediaRenderer';

const audioAsset = {
  id: 22,
  assetType: 'audio',
  caption: 'Pokojný podcast',
  filename: 'pokojny-podcast.mp3',
  mimeType: 'audio/mpeg',
  streamUrl: '/api/membership/posts/9/assets/22',
};

const originalMediaSession = navigator.mediaSession;
const originalMediaMetadata = window.MediaMetadata;

afterEach(() => {
  Object.defineProperty(navigator, 'mediaSession', {
    configurable: true,
    value: originalMediaSession,
  });
  Object.defineProperty(window, 'MediaMetadata', {
    configurable: true,
    value: originalMediaMetadata,
  });
});

describe('MembershipMediaRenderer audio playback', () => {
  it('uses native metadata-only audio controls and reports its loaded duration', () => {
    const onAudioDurationChange = vi.fn();
    const { container } = render(
      <MembershipMediaRenderer
        assets={[audioAsset]}
        onAudioDurationChange={onAudioDurationChange}
        postId={9}
      />
    );
    const audio = container.querySelector('audio');
    Object.defineProperty(audio, 'duration', { configurable: true, value: 374 });

    expect(audio).toHaveAttribute('controls');
    expect(audio).toHaveAttribute('preload', 'metadata');
    expect(screen.getByText('Pokojný podcast')).toBeInTheDocument();

    fireEvent.loadedMetadata(audio);
    expect(onAudioDurationChange).toHaveBeenCalledWith(374);
  });

  it('sets and cleans up Media Session metadata and handlers only when supported', () => {
    const setActionHandler = vi.fn();
    const session = { setActionHandler, metadata: null, playbackState: 'none' };
    const MediaMetadata = vi.fn(function MediaMetadata(metadata) {
      Object.assign(this, metadata);
    });
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: session });
    Object.defineProperty(window, 'MediaMetadata', { configurable: true, value: MediaMetadata });

    const { container, unmount } = render(
      <MembershipMediaRenderer
        assets={[audioAsset]}
        artworkUrl="https://example.com/cover.jpg"
        postId={9}
      />
    );
    const audio = container.querySelector('audio');
    fireEvent.play(audio);

    expect(MediaMetadata).toHaveBeenCalledWith({
      title: 'Pokojný podcast',
      artist: 'Zajkológia',
      album: 'Zajkológia klub',
      artwork: [{ src: 'https://example.com/cover.jpg' }],
    });
    expect(setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith('seekto', expect.any(Function));

    unmount();
    expect(session.metadata).toBeNull();
    expect(setActionHandler).toHaveBeenCalledWith('pause', null);
  });
});
