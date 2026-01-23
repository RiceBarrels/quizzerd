'use client';

import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  decimals?: number;
  easing?: 'linear' | 'easeOut' | 'easeInOut';
  startOnMount?: boolean;
}

/**
 * Custom hook for count-up animation
 * @param options - Configuration options for the count-up animation
 * @returns The current animated count value and a reset function
 */
export function useCountUp({
  start = 0,
  end,
  duration = 1500,
  decimals = 0,
  easing = 'easeOut',
  startOnMount = true,
}: UseCountUpOptions): { count: number; reset: () => void } {
  const [count, setCount] = useState(startOnMount ? start : end);
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  const easingFunctions = {
    linear: (t: number) => t,
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  };

  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }

    const elapsed = currentTime - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easingFunctions[easing](progress);

    const currentValue = start + (end - start) * easedProgress;
    setCount(Number(currentValue.toFixed(decimals)));

    if (progress < 1) {
      frameRef.current = requestAnimationFrame(animate);
    }
  };

  const reset = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    startTimeRef.current = undefined;
    setCount(start);
    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (startOnMount) {
      frameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, startOnMount]);

  return { count, reset };
}

/**
 * Component wrapper for count-up animation
 */
export function CountUp({
  value,
  duration = 1500,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = ''
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const { count } = useCountUp({
    end: value,
    duration,
    decimals
  });

  return (
    <span className={className}>
      {prefix}{count}{suffix}
    </span>
  );
}
