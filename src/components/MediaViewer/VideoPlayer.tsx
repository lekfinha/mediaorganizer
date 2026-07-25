import React, { useRef, useState, useCallback } from 'react';
import './MediaViewer.css';

interface VideoPlayerProps {
  src: string;
}

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * VideoPlayer — mounts a fresh <video> element for each new src via key=
 * so React never reuses a stale element. All state is local to each mount.
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  return <VideoPlayerInner key={src} src={src} />;
};

const VideoPlayerInner: React.FC<VideoPlayerProps> = ({ src }) => {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [volume,    setVolume]    = useState(1);
  const [isMuted,   setIsMuted]   = useState(false);
  const [isReady,   setIsReady]   = useState(false);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);

  // ── Play / Pause ─────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || errorMsg) return;
    if (vid.paused) {
      vid.play().catch(e => console.warn('play() rejected:', e));
    } else {
      vid.pause();
    }
  }, [errorMsg]);

  // ── Seek ──────────────────────────────────────────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (videoRef.current && isFinite(val)) {
      videoRef.current.currentTime = val;
      setProgress(val);
    }
  };

  // ── Volume ────────────────────────────────────────────────────────────────
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
    const next = !isMuted;
    vid.muted = next;
    setIsMuted(next);
  };

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleCanPlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    setIsReady(true);
    if (isFinite(vid.duration) && vid.duration > 0) {
      setDuration(vid.duration);
    }
    vid.play().catch(() => { /* user hasn't interacted yet, that's fine */ });
  };

  const handleDurationChange = () => {
    const vid = videoRef.current;
    if (vid && isFinite(vid.duration) && vid.duration > 0) {
      setDuration(vid.duration);
    }
  };

  const handleError = () => {
    const vid = videoRef.current;
    const code = vid?.error?.code ?? -1;
    const msg  = vid?.error?.message ?? 'unknown';
    // MediaError codes: 1=ABORTED 2=NETWORK 3=DECODE 4=SRC_NOT_SUPPORTED
    const codeNames: Record<number, string> = {
      1: 'MEDIA_ERR_ABORTED',
      2: 'MEDIA_ERR_NETWORK',
      3: 'MEDIA_ERR_DECODE — codec no soportado',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
    };
    const label = codeNames[code] ?? `error ${code}`;
    console.error(`[VideoPlayer] ${label}: ${msg}\nsrc: ${src}`);
    setErrorMsg(label);
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const sliderMax = isFinite(duration) && duration > 0 ? duration : 0;
  const pct = sliderMax > 0 ? (progress / sliderMax) * 100 : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="video-container" onClick={togglePlay}>
      {/*
        src is in JSX (not useEffect) — React sets it before paint.
        crossOrigin="" is needed by some WebKit builds for asset:// sources.
        preload="metadata" avoids loading the full file before playback.
      */}
      <video
        ref={videoRef}
        src={src}
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

      {/* Controls — always visible unless there's an error */}
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

      {/* Big play overlay (paused + ready, no error) */}
      {!isPlaying && isReady && !errorMsg && (
        <div className="video-play-overlay">
          <div className="video-play-icon">▶</div>
        </div>
      )}

      {/* Loading spinner */}
      {!isReady && !errorMsg && (
        <div className="video-loading">
          <div className="media-viewer-spinner" />
        </div>
      )}
    </div>
  );
};
