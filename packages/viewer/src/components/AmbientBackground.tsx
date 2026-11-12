import React, { useEffect, useRef } from 'react';

export const AmbientBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const x = e.clientX;
      const y = e.clientY;
      containerRef.current.style.setProperty('--mouse-x', `${x}px`);
      containerRef.current.style.setProperty('--mouse-y', `${y}px`);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[100dvh] w-full bg-[#08090e] text-[#F3F4F6] selection:bg-amber-500/25 selection:text-amber-200 overflow-x-clip flex flex-col"
      style={{
        ['--mouse-x' as any]: '50vw',
        ['--mouse-y' as any]: '30vh',
      }}
    >
      {/* Warm Golden Hour & Trust Indigo Ambient Light Field */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 opacity-70"
        style={{
          background: `
            radial-gradient(750px circle at var(--mouse-x) var(--mouse-y), rgba(251, 146, 60, 0.08), transparent 70%),
            radial-gradient(1100px circle at 85% 15%, rgba(99, 102, 241, 0.07), transparent 60%),
            radial-gradient(1000px circle at 15% 85%, rgba(245, 158, 11, 0.06), transparent 65%)
          `,
        }}
      />

      {/* Subtle Warm Specular Grid */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Content Layer */}
      <div className="relative z-10 flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};
