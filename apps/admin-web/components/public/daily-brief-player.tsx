'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { GhantiIcon } from '@/components/ui/ghanti-icon';

interface DailyBriefPlayerProps {
  /** MP3 audio URL (always present) */
  audioUrl: string;
  /** MP4 video URL from D-ID (optional — if absent, falls back to audio-only) */
  videoUrl?: string | null;
  durationSeconds?: number;
  storyCount?: number;
  /** Called with index of the story that should be highlighted (0-based), or -1 when not playing */
  onStoryHighlight?: (index: number) => void;
  /** Hide the header label (when parent provides its own label) */
  hideHeader?: boolean;
  /** Inline label shown before the play button (e.g. "EN" or "ने") */
  inlineLabel?: string;
  /** Color class for inline label */
  inlineLabelColor?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DailyBriefPlayer({
  audioUrl,
  videoUrl,
  durationSeconds,
  storyCount = 0,
  onStoryHighlight,
  hideHeader = false,
  inlineLabel,
  inlineLabelColor,
}: DailyBriefPlayerProps) {
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [isLoaded, setIsLoaded] = useState(false);

  const hasVideo = !!videoUrl;

  // Stable ref for onStoryHighlight to avoid re-creating audio on parent re-renders
  const onStoryHighlightRef = useRef(onStoryHighlight);
  useEffect(() => { onStoryHighlightRef.current = onStoryHighlight; }, [onStoryHighlight]);

  // Bind media events — no dependencies on callbacks to prevent re-render teardown
  const bindMedia = useCallback(
    (el: HTMLVideoElement | HTMLAudioElement | null) => {
      if (!el) return;
      mediaRef.current = el;

      const onMeta = () => {
        setDuration(el.duration);
        setIsLoaded(true);
      };
      const onTime = () => setCurrentTime(el.currentTime);
      const onEnd = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onStoryHighlightRef.current?.(-1);
      };
      const onErr = (e: Event) => {
        console.warn('[AudioPlayer] Error:', (e as ErrorEvent).message || 'playback error');
        setIsLoaded(false);
      };
      const onStalled = () => {
        console.warn('[AudioPlayer] Stalled — attempting to resume');
        // Try to resume if stalled (network issue)
        if (!el.paused && el.readyState < 3) {
          el.load();
        }
      };

      el.addEventListener('loadedmetadata', onMeta);
      el.addEventListener('timeupdate', onTime);
      el.addEventListener('ended', onEnd);
      el.addEventListener('error', onErr);
      el.addEventListener('stalled', onStalled);

      return () => {
        el.removeEventListener('loadedmetadata', onMeta);
        el.removeEventListener('timeupdate', onTime);
        el.removeEventListener('ended', onEnd);
        el.removeEventListener('error', onErr);
        el.removeEventListener('stalled', onStalled);
      };
    },
    [], // stable — no deps, uses refs for callbacks
  );

  // For audio-only mode, create hidden Audio element
  // Only re-creates when audioUrl changes, NOT on parent re-renders
  useEffect(() => {
    if (hasVideo) return; // Video element handles itself via ref

    const audio = new Audio(audioUrl);
    audio.preload = 'auto'; // download full file to prevent mid-play stops
    audio.crossOrigin = 'anonymous'; // allow CORS for Supabase storage
    const cleanup = bindMedia(audio);

    return () => {
      audio.pause();
      audio.src = '';
      mediaRef.current = null;
      cleanup?.();
    };
  }, [audioUrl, hasVideo, bindMedia]);

  // Story highlight sync
  useEffect(() => {
    if (!isPlaying || !duration || storyCount === 0) return;
    const introEnd = duration * 0.15;
    const storyDuration = (duration * 0.7) / storyCount;

    if (currentTime < introEnd) {
      onStoryHighlightRef.current?.(-1);
    } else {
      const storyIndex = Math.min(
        Math.floor((currentTime - introEnd) / storyDuration),
        storyCount - 1,
      );
      onStoryHighlightRef.current?.(storyIndex);
    }
  }, [currentTime, duration, storyCount, isPlaying]);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
      onStoryHighlight?.(-1);
    } else {
      media.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [isPlaying, onStoryHighlight]);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const media = mediaRef.current;
      if (!media || !duration) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      media.currentTime = ratio * duration;
      setCurrentTime(media.currentTime);
    },
    [duration],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className={`mb-2 overflow-hidden rounded-lg border border-white/[0.08] bg-gradient-to-r from-[#D9A441]/[0.06] to-[#003893]/[0.06] transition-all ${
        isExpanded ? 'p-0' : 'px-3 py-2'
      }`}
    >
      {/* Video element (when available) */}
      {hasVideo && (
        <div
          ref={videoContainerRef}
          className={`relative ${isExpanded ? 'aspect-video w-full' : 'mb-2 aspect-video w-full max-h-48 overflow-hidden rounded-lg'}`}
        >
          <video
            ref={(el) => {
              if (el) bindMedia(el);
            }}
            src={videoUrl!}
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
            poster=""
          />

          {/* Play overlay on video */}
          {!isPlaying && isLoaded && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity hover:bg-black/40"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#D9A441] shadow-lg shadow-[#D9A441]/30">
                <Play className="ml-1 h-6 w-6 text-black" />
              </div>
            </button>
          )}

          {/* Expand/minimize button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="absolute right-2 top-2 rounded-md bg-black/50 p-1.5 text-white/60 transition-colors hover:text-white"
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Controls bar */}
      <div className={hasVideo && isExpanded ? 'p-3' : hasVideo ? '' : ''}>
        {/* Header (audio-only mode) */}
        {!hasVideo && !hideHeader && (
          <div className="mb-2 flex items-center gap-2">
            <GhantiIcon color="gold" size="xs" />
            <span className="text-[11px] font-medium text-[#D9A441]/80">
              Listen to today&apos;s brief
            </span>
          </div>
        )}

        {/* Player controls */}
        <div className="flex items-center gap-2">
          {/* Inline label (e.g. "EN" or "ने") */}
          {inlineLabel && (
            <span className={`text-[9px] font-bold uppercase tracking-wider shrink-0 ${inlineLabelColor || 'text-gray-400'}`}>
              {inlineLabel}
            </span>
          )}
          {/* Play/Pause button (audio mode or collapsed video) */}
          {(!hasVideo || isExpanded) && (
            <button
              onClick={togglePlay}
              disabled={!isLoaded}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all ${
                isPlaying
                  ? 'bg-[#D9A441] text-black shadow-lg shadow-[#D9A441]/20'
                  : isLoaded
                    ? 'bg-[#D9A441]/20 text-[#D9A441] hover:bg-[#D9A441]/30'
                    : 'bg-white/[0.06] text-white/20'
              }`}
            >
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="ml-0.5 h-3 w-3" />}
            </button>
          )}

          {/* Progress bar + time */}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div
              className="group relative h-1.5 cursor-pointer rounded-full bg-white/[0.08]"
              onClick={handleSeek}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#003893] transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[#D9A441] opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/30">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Mute button */}
          <button
            onClick={toggleMute}
            className="shrink-0 text-white/30 transition-colors hover:text-white/60"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
