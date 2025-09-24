// components/backgrounds/MorphingBlobs.tsx
import React from "react";

export default function MorphingBlobs({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100svh]">
      {/* FULL-SCREEN background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="blob absolute -top-24 -left-24 h-80 w-80 rounded-full bg-violet-300/50 blur-3xl" />
        <div className="blob absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-sky-300/50 blur-3xl" style={{ animationDelay: "2s" }} />
        <div className="blob absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-rose-300/50 blur-3xl" style={{ animationDelay: "4s" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/70 dark:from-slate-900/30 dark:to-slate-900/60" />
      </div>

      {/* page content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
