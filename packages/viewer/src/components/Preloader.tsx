import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';

interface PreloaderProps {
  onComplete?: () => void;
  message?: string;
  minDuration?: number; // default ~1400ms
}

export const Preloader: React.FC<PreloaderProps> = ({
  onComplete,
  message = 'Together in real-time',
  minDuration = 1400,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ring1Ref = useRef<HTMLDivElement | null>(null);
  const ring2Ref = useRef<HTMLDivElement | null>(null);
  const emblemRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 1. Orbital Ring & Core continuous animations with Anime.js
    try {
      if (ring1Ref.current) {
        animate(ring1Ref.current, {
          rotate: [0, 360],
          duration: 3600,
          ease: 'linear',
          loop: true,
        });
      }
      if (ring2Ref.current) {
        animate(ring2Ref.current, {
          rotate: [360, 0],
          duration: 5200,
          ease: 'linear',
          loop: true,
        });
      }
      if (emblemRef.current) {
        animate(emblemRef.current, {
          scale: [0.95, 1.03, 0.95],
          translateY: [0, -3, 0],
          duration: 2200,
          ease: 'inOut(2)',
          loop: true,
        });
      }
    } catch (_) {}

    // 2. Smooth simulated loading progress up to 100%
    const startTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDuration) * 100));
      setProgress(pct);

      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${pct}%`;
      }

      if (elapsed < minDuration) {
        frameId = requestAnimationFrame(tick);
      } else {
        // Complete! Exit animation
        try {
          if (containerRef.current) {
            animate(containerRef.current, {
              opacity: [1, 0],
              scale: [1, 1.04],
              duration: 420,
              ease: 'out(3)',
              onComplete: () => {
                if (onComplete) onComplete();
              },
            });
          } else if (onComplete) {
            onComplete();
          }
        } catch (_) {
          if (onComplete) onComplete();
        }
      }
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [minDuration, onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] bg-[#07080d] flex flex-col items-center justify-center select-none overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Background radial warmth & volumetric glow */}
      <div 
        className="absolute w-[360px] sm:w-[520px] h-[360px] sm:h-[520px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.16) 0%, rgba(234, 88, 12, 0.08) 38%, transparent 70%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Center Hero Animated Logo Assembly */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Emblem Stage with Orbiting Light Rings */}
        <div className="relative flex items-center justify-center w-40 h-40 sm:w-44 sm:h-44 mb-4">
          {/* Outer Orbital Ring with Specular Travelling Spark */}
          <div
            ref={ring1Ref}
            className="absolute inset-[-12px] sm:inset-[-16px] rounded-full border border-amber-500/25 border-t-amber-400 border-r-transparent pointer-events-none"
            style={{ boxShadow: '0 0 28px rgba(245, 158, 11, 0.18)' }}
          >
            <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#f59e0b,0_0_24px_#f59e0b]" />
          </div>

          {/* Counter Orbital Ring with Secondary Glint */}
          <div
            ref={ring2Ref}
            className="absolute inset-[-4px] rounded-full border border-orange-500/20 border-b-orange-400 border-l-transparent pointer-events-none"
          >
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_#fb923c]" />
          </div>

          {/* 3D Golden 'B' Emblem with Sync Arrows and Swoosh */}
          <div 
            ref={emblemRef}
            className="relative z-10 w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center"
            style={{ animation: 'emblemGlowPulse 3.5s infinite ease-in-out' }}
          >
            <img
              src="/logos/brosync-emblem.png"
              alt="BroSync Emblem"
              className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_8px_30px_rgba(245,158,11,0.4)]"
            />
          </div>
        </div>

        {/* The BROSYNC Wordmark with Shimmer Light Sweep */}
        <div className="relative flex flex-col items-center">
          <div className="relative overflow-hidden px-4 py-1.5 rounded-lg">
            <img
              src="/logos/brosync-text.png"
              alt="BROSYNC"
              className="h-8 sm:h-9 object-contain select-none pointer-events-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
            />
            {/* Specular Light Sweep animation across the wordmark */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
                animation: 'shimmerSweep 2.4s infinite cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          <p className="text-xs sm:text-sm font-medium tracking-wide text-white/50 mt-1.5">
            {message}
          </p>
        </div>

        {/* Minimal Progress Capsule */}
        <div className="mt-7 w-48 sm:w-56 flex flex-col items-center gap-2">
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden p-[1px]">
            <div
              ref={progressBarRef}
              className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(245,158,11,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-white/30 tracking-widest">
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
};
