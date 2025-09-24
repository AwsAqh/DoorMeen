import React, { useRef, useState, useEffect, Children, cloneElement } from "react";
import type { ReactElement, ReactNode } from "react";

  
  type CarouselProps = {
    children: ReactNode;
    autoPlay?: boolean;
    interval?: number;
    onNextImage?: (index: number) => void;
  };
  
  export default function Carousel({
    children,
    autoPlay = true,
    interval = 4000,
    onNextImage
  }: CarouselProps) {
    // ✅ Type the ref
    const viewportRef = useRef<HTMLDivElement | null>(null);
  
    const [index, setIndex] = useState(0);
    const count = Children.count(children);
  
    const onScroll = () => {
      const el = viewportRef.current;
      if (!el) return;
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(i);
      onNextImage?.(i)
    };
  
    const scrollToIndex = (i: number) => {
      const el = viewportRef.current;
      if (!el) return;
      el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" })
      onNextImage?.(i);
    };
  
    const prev = () => scrollToIndex((index - 1 + count) % count);
    const next = () => scrollToIndex((index + 1) % count);
  
    useEffect(() => {
      if (!autoPlay || count <= 1) return;
      const el = viewportRef.current;
      if (!el) return;
  
      let paused = false;
      const pause = () => { paused = true; };
      const resume = () => { paused = false; };
  
      el.addEventListener("mouseenter", pause);
      el.addEventListener("mouseleave", resume);
      el.addEventListener("focusin", pause);
      el.addEventListener("focusout", resume);
  
      const id = window.setInterval(() => {
        if (!paused) next();
      }, interval);
  
      return () => {
        window.clearInterval(id);
        el.removeEventListener("mouseenter", pause);
        el.removeEventListener("mouseleave", resume);
        el.removeEventListener("focusin", pause);
        el.removeEventListener("focusout", resume);
      };
    }, [autoPlay, count, interval, next]);
  
    useEffect(() => {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight") next();
        if (e.key === "ArrowLeft") prev();
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [next, prev]);
  
    return (
      <div className="relative" role="region" aria-label="Carousel">
        <div
          ref={viewportRef}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full rounded-lg"
          aria-live="polite"
        >
          {Children.map(children, (child, i) => (
            <div
              key={i}
              className="w-full flex-shrink-0 snap-center"
              aria-hidden={index !== i}
            >
              {/* If child might not be an element, render as-is; else clone */}
              {React.isValidElement(child)
                ? cloneElement(child as ReactElement)
                : child}
            </div>
          ))}
        </div>
  
        <button
          onClick={prev}
          aria-label="Previous slide"
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2 hover:bg-black/70 focus:outline-none focus:ring"
        >
          ‹
        </button>
        <button
          onClick={next}
          aria-label="Next slide"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 text-white p-2 hover:bg-black/70 focus:outline-none focus:ring"
        >
          ›
        </button>
  
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={index === i}
              className={`h-2 w-2 rounded-full ${index === i ? "bg-white" : "bg-white/50"} focus:outline-none focus:ring`}
            />
          ))}
        </div>
      </div>
    );
  }
  
  /* Add once in your global CSS:
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scro*/
