import React, { useRef, useState, useCallback, useEffect } from 'react';
import { readFile } from '@tauri-apps/plugin-fs';
import './MediaViewer.css';

interface VideoPlayerProps {
  /** Either an already-resolved URL (blob:, asset://, http://) or a raw
   *  file-system path starting with "/".  When a raw path is given the
   *  component creates a blob: URL internally and revokes it on unmount,
   *  keeping memory usage bounded to a single video at a time.            */
  src: string;
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Determines if `src` is a raw filesystem path (needs blob conversion). */
function isFilePath(src: string) {
  return src.startsWith('/') || src.startsWith('\\');
}

/**
 * Outer shell — re-mounts inner player whenever src changes so we never
 * reuse a stale <video> element.
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => (
  <VideoPlayerInner key={src} src={src} />
);

const VideoPlayerInner: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const [blobUrl,   setBlobUrl]   = useState<string | null>(null);
  const [isReady,   setIsReady]   = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [volume,    setVolume]    = useState(1);
  const [isMuted,   setIsMuted]   = useState(false);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const [isLoadingBlob, setIsLoadingBlob] = useState(false);

  // ── Create blob URL when src is a raw path ───────────────────────────────
  useEffect(() => {
    if (!isFilePath(src)) {
      // Already a playable URL — use directly.
      setBlobUrl(src);
      return;
    }

    let revoked = false;
    let objectUrl = '';
    setIsLoadingBlob(true);
    setErrorMsg(null);

    (async () => {
      try {
        const bytes = await readFile(src);
        if (revoked) return;

        // Detect MIME from extension.
        const ext = src.split('.').pop()?.toLowerCase() ?? 'mp4';
        const mime = ext === 'webm' ? 'video/webm'
                   : ext === 'ogg'  ? 'video/ogg'
                   : ext === 'mov'  ? 'video/quicktime'
                   : 'video/mp4';

        const blob = new Blob([bytes as BlobPart], { type: mime });
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) {
          setBlobUrl(objectUrl);
          setIsLoadingBlob(false);
        }
      } catch (e) {
        if (!revoked) {
          console.error('[VideoPlayer] readFile failed:', e);
          setErrorMsg('No se pudo leer el archivo de video');
          setIsLoadingBlob(false);
        }
      }
    })();

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || errorMsg) return;
    if (vid.paused) vid.play().catch(() => {});
    else vid.pause();
  }, [errorMsg]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (videoRef.current && isFinite(val)) {
      videoRef.current.currentTime = val;
      setProgress(val);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // ── Video events ──────────────────────────────────────────────────────────
  const handleCanPlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setIsReady(true);
    if (isFinite(vid.duration) && vid.duration > 0) setDuration(vid.duration);
    vid.play().catch(() => {});
  };

  const handleDurationChange = () => {
    const vid = videoRef.current;
    if (vid && isFinite(vid.duration) && vid.duration > 0) setDuration(vid.duration);
  };

  const handleError = () => {
    const vid = videoRef.current;
    const code = vid?.error?.code ?? -1;
    const names: Record<number, string> = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK',
      3: 'MEDIA_ERR_DECODE — codec no soportado',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
    };
    const label = names[code] ?? `error ${code}`;
    console.error(`[VideoPlayer] ${label}\nsrc: ${blobUrl ?? src}`);
    setErrorMsg(label);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const sliderMax = isFinite(duration) && duration > 0 ? duration : 0;
  const pct = sliderMax > 0 ? (progress / sliderMax) * 100 : 0;

  const isBuffering = isLoadingBlob && !errorMsg;
  const effectiveSrc = blobUrl;   // null while loading

  return (
    <div className="video-container" onClick={togglePlay}>
      {effectiveSrc && (
        <video
          ref={videoRef}
          src={effectiveSrc}
          className="video-element"
          playsInline
          loop
          preload="metadata"
          onCanPlay={handleCanPlay}
          onDurationChange={handleDurationChange}
          onTimeUpdate={() => videoRef.current && setProgress(videoRef.current.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={handleError}
        />
      )}

      {/* Error overlay */}
      {errorMsg && (
        <div className="video-error" onClick={e => e.stopPropagation()}>
          <span>⚠️</span>
          <p>No se pudo reproducir el video</p>
          <p className="video-error-hint">
            {errorMsg}
            {errorMsg.includes('DECODE') && (
              <>
                <br />Instala los codecs GStreamer:<br />
                <code>sudo pacman -S gst-libav gst-plugins-bad gst-plugins-ugly</code>
                <br /><small>Luego reinicia la sesión.</small>
              </>
            )}
          </p>
        </div>
      )}

      {/* Controls */}
      {!errorMsg && (
        <div className="video-controls glass" onClick={e => e.stopPropagation()}>
          <button className="control-btn" onClick={togglePlay}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <span className="time-display">
            {formatTime(progress)} / {formatTime(duration)}
          </span>

          <input
            type="range"
            className="progress-slider"
            style={{ '--progress-pct': `${pct}%` } as React.CSSProperties}
            min={0}
            max={sliderMax || 100}
            step={0.1}
            value={progress}
            onChange={handleSeek}
          />

          <div className="volume-container">
            <button className="control-btn" onClick={toggleMute}>
              {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <input
              type="range"
              className="volume-slider"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolume}
            />
          </div>
        </div>
      )}

      {/* Big play overlay */}
      {!isPlaying && isReady && !errorMsg && (
        <div className="video-play-overlay">
          <div className="video-play-icon">▶</div>
        </div>
      )}

      {/* Loading spinner — shown while reading file or waiting for codec */}
      {(isBuffering || (!isReady && !errorMsg && effectiveSrc)) && (
        <div className="video-loading">
          <div className="media-viewer-spinner" />
        </div>
      )}
    </div>
  );
};
