// src/components/Carousel.tsx
import  {
  Children,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type CarouselProps = {
  children: ReactNode;
 
  autoPlay?: boolean;
  
  interval?: number;

  onNextImage?: (index: number) => void;
  
  className?: string;
 
  showArrows?: boolean;

  showDots?: boolean;

  pauseOnHover?: boolean;

  viewportClassName?: string;
};


export default function Carousel({
  children,
  autoPlay = true,
  interval = 4000,
  onNextImage,

  showArrows = true,
  showDots = true,
  pauseOnHover = true,
  className = "w-full",                
   
}: CarouselProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  const count = Children.count(children);

  const setActiveIndex = useCallback(
    (i: number) => {
      setIndex(i);
      onNextImage?.(i);
    },
    [onNextImage]
  );

  const onScroll = () => {
    const el = viewportRef.current;
    if (!el) return;
    const isRTL = document.documentElement.dir === 'rtl';
    
    // In RTL, scrollLeft can be negative or work differently
    // We calculate based on scroll position relative to scrollWidth
    let scrollPosition: number;
    if (isRTL) {
      // For RTL, scrollLeft is typically negative or calculated from the right
      const maxScroll = el.scrollWidth - el.clientWidth;
      scrollPosition = maxScroll + el.scrollLeft; // scrollLeft is negative in RTL
    } else {
      scrollPosition = el.scrollLeft;
    }
    
    const i = Math.round(scrollPosition / el.clientWidth);
    setActiveIndex(Math.max(0, Math.min(i, count - 1)));
  };

  const scrollToIndex = (i: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const isRTL = document.documentElement.dir === 'rtl';
    const maxScroll = el.scrollWidth - el.clientWidth;
    
    let targetScroll: number;
    if (isRTL) {
      // In RTL, scroll to negative value or calculate from right
      targetScroll = -(maxScroll - (i * el.clientWidth));
    } else {
      targetScroll = i * el.clientWidth;
    }
    
    el.scrollTo({ left: targetScroll, behavior: "smooth" });
    setActiveIndex(i);
  };

  const prev = useCallback(
    () => scrollToIndex((index - 1 + count) % count),
    [index, count]
  );
  const next = useCallback(
    () => scrollToIndex((index + 1) % count),
    [index, count]
  );

  // Autoplay
  useEffect(() => {
    if (!autoPlay || count <= 1) return;
    const el = viewportRef.current;
    if (!el) return;

    let paused = false;
    const pause = () => (paused = true);
    const resume = () => (paused = false);

    if (pauseOnHover) {
      el.addEventListener("mouseenter", pause);
      el.addEventListener("mouseleave", resume);
      el.addEventListener("focusin", pause);
      el.addEventListener("focusout", resume);
    }

    const id = window.setInterval(() => {
      if (!paused) next();
    }, interval);

    return () => {
      window.clearInterval(id);
      if (pauseOnHover) {
        el.removeEventListener("mouseenter", pause);
        el.removeEventListener("mouseleave", resume);
        el.removeEventListener("focusin", pause);
        el.removeEventListener("focusout", resume);
      }
    };
  }, [autoPlay, count, interval, pauseOnHover, next]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  return (
    <div
      className={`relative ${className}`}
      role="region"
      aria-label="Carousel"
    >
      <div
        ref={viewportRef}
        onScroll={onScroll}
        className="
          flex h-full w-full overflow-x-auto snap-x snap-mandatory
          no-scrollbar rounded-xl
        "
        style={{ direction: 'ltr' }} // Force LTR for scroll calculations
        aria-live="polite"
      >
        {Children.map(children, (child, i) => (
          <div key={i} className="w-full h-full flex-shrink-0 snap-center overflow-hidden rounded-xl">
            <div className="w-full h-full [&>img]:w-full [&>img]:h-full [&>img]:object-cover">
              {child}
            </div>
          </div>
        ))}
      </div>

      {showArrows && count > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="
              absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2
              rounded-full bg-black/50 text-white p-3 md:p-4 text-2xl
              hover:bg-black/70 focus:outline-none focus:ring
            "
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="
              absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2
              rounded-full bg-black/50 text-white p-3 md:p-4 text-2xl
              hover:bg-black/70 focus:outline-none focus:ring
            "
          >
            ›
          </button>
        </>
      )}

      {showDots && count > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={index === i}
              className={`h-2.5 w-2.5 rounded-full transition
                ${index === i ? "bg-white" : "bg-white/50"}
                focus:outline-none focus:ring
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}
