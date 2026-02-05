// components/backgrounds/MorphingBlobs.tsx
import React from "react";

export default function MorphingBlobs({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-[100svh]"
      style={{
        background: 'linear-gradient(135deg, var(--dm-bg-primary) 0%, var(--dm-bg-secondary) 50%, var(--dm-bg-tertiary) 100%)',
      }}
    >
      {/* Subtle background blobs for dark theme */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="blob absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: 'rgba(20, 184, 166, 0.08)',
            animationDelay: '0s',
          }}
        />
        <div
          className="blob absolute top-1/3 -right-24 h-[30rem] w-[30rem] rounded-full blur-3xl"
          style={{
            background: 'rgba(56, 189, 248, 0.06)',
            animationDelay: '2s',
          }}
        />
        <div
          className="blob absolute bottom-0 left-1/3 h-96 w-96 rounded-full blur-3xl"
          style={{
            background: 'rgba(139, 92, 246, 0.06)',
            animationDelay: '4s',
          }}
        />

        {/* Gradient overlay for depth */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, var(--dm-bg-primary) 70%)',
          }}
        />
      </div>

      {/* Page content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
