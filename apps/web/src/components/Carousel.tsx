// src/components/Carousel.tsx
import {
  Children,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { AnimatePresence, motion, Variants } from "framer-motion";

type CarouselProps = {
  children: ReactNode;
  autoPlay?: boolean;
  interval?: number;
  onNextImage?: (index: number) => void;
  className?: string;
  showArrows?: boolean;
  showDots?: boolean;
  pauseOnHover?: boolean;
};

// Slide animation variants for flowing effect
const slideVariants: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.3 },
      scale: { duration: 0.3 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
    transition: {
      x: { type: "spring", stiffness: 300, damping: 30 },
      opacity: { duration: 0.2 },
      scale: { duration: 0.2 },
    },
  }),
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
  const [[page, direction], setPage] = useState([0, 0]);
  const [isPaused, setIsPaused] = useState(false);
  const childArray = Children.toArray(children);
  const count = childArray.length;

  // Wrap index for infinite loop effect
  const index = ((page % count) + count) % count;

  const paginate = useCallback((newDirection: number) => {
    const newPage = page + newDirection;
    setPage([newPage, newDirection]);
    onNextImage?.(((newPage % count) + count) % count);
  }, [page, count, onNextImage]);

  const goToSlide = useCallback((targetIndex: number) => {
    const currentIndex = ((page % count) + count) % count;
    const direction = targetIndex > currentIndex ? 1 : -1;
    // Calculate shortest path
    const diff = targetIndex - currentIndex;
    setPage([page + diff, direction]);
    onNextImage?.(targetIndex);
  }, [page, count, onNextImage]);

  // Autoplay
  useEffect(() => {
    if (!autoPlay || count <= 1 || isPaused) return;

    const timer = setInterval(() => {
      paginate(1);
    }, interval);

    return () => clearInterval(timer);
  }, [autoPlay, count, interval, isPaused, paginate]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") paginate(1);
      if (e.key === "ArrowLeft") paginate(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paginate]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      role="region"
      aria-label="Carousel"
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 w-full h-full"
          >
            <div className="w-full h-full [&>img]:w-full [&>img]:h-full [&>img]:object-cover rounded-xl overflow-hidden">
              {childArray[index]}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Arrows */}
      {showArrows && count > 1 && (
        <>
          <motion.button
            onClick={() => paginate(-1)}
            aria-label="Previous slide"
            className="
              absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 z-10
              rounded-full p-3 text-2xl
              transition-all duration-200
            "
            style={{
              background: 'var(--dm-surface)',
              color: 'var(--dm-text-primary)',
              backdropFilter: 'blur(8px)',
            }}
            whileHover={{ scale: 1.1, background: 'var(--dm-accent)' }}
            whileTap={{ scale: 0.95 }}
          >
            ‹
          </motion.button>
          <motion.button
            onClick={() => paginate(1)}
            aria-label="Next slide"
            className="
              absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 z-10
              rounded-full p-3 text-2xl
              transition-all duration-200
            "
            style={{
              background: 'var(--dm-surface)',
              color: 'var(--dm-text-primary)',
              backdropFilter: 'blur(8px)',
            }}
            whileHover={{ scale: 1.1, background: 'var(--dm-accent)' }}
            whileTap={{ scale: 0.95 }}
          >
            ›
          </motion.button>
        </>
      )}

      {/* Dot Indicators */}
      {showDots && count > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {Array.from({ length: count }).map((_, i) => (
            <motion.button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={index === i}
              className="rounded-full transition-all duration-300"
              style={{
                width: index === i ? '24px' : '10px',
                height: '10px',
                background: index === i ? 'var(--dm-accent)' : 'var(--dm-surface)',
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                width: index === i ? 24 : 10,
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
