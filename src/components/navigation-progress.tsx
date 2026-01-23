'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function NavigationProgress() {
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // Track navigation start
    const handleStart = () => {
      setIsNavigating(true);
      setProgress(0);

      // Simulate progress
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            return prev;
          }
          // Slow down as we get closer to 100
          const increment = Math.max(1, (90 - prev) / 10);
          return Math.min(90, prev + increment);
        });
      }, 100);
    };

    // Track navigation end
    const handleComplete = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setProgress(100);

      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        setProgress(0);
      }, 200);
    };

    // Listen for click events on links
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor) {
        const href = anchor.getAttribute('href');
        const isInternal = href && (
          href.startsWith('/') ||
          href.startsWith(window.location.origin)
        );
        const isNewTab = anchor.target === '_blank';
        const hasDownload = anchor.hasAttribute('download');

        if (isInternal && !isNewTab && !hasDownload) {
          handleStart();
          // Complete after a delay (will be triggered by actual page load)
          timeoutRef.current = setTimeout(handleComplete, 500);
        }
      }
    };

    // Listen for popstate (back/forward navigation)
    const handlePopState = () => {
      handleStart();
      timeoutRef.current = setTimeout(handleComplete, 300);
    };

    document.addEventListener('click', handleClick);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleClick);
      window.removeEventListener('popstate', handlePopState);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {isNavigating && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-[9999] h-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Background track */}
          <div className="absolute inset-0 bg-primary/10" />

          {/* Progress bar */}
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary via-primary to-primary/80"
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
          />

          {/* Glow effect */}
          <motion.div
            className="absolute top-0 h-full w-24 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ left: `${Math.max(0, progress - 10)}%` }}
            animate={{
              left: [`${Math.max(0, progress - 30)}%`, `${progress}%`],
            }}
            transition={{
              repeat: Infinity,
              duration: 1,
              ease: 'linear',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
