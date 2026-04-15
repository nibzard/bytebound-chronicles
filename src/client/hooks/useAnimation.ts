import { useState, useEffect, useCallback } from 'react';

export interface AnimationOptions {
  duration?: number;
  easing?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';
  autoStart?: boolean;
  loop?: boolean;
}

export const useAnimation = (options: AnimationOptions = {}) => {
  const {
    duration = 1000,
    easing = 'linear',
    autoStart = false,
    loop = false,
  } = options;

  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoStart);
  const [startTime, setStartTime] = useState<number | null>(null);

  const easingFunctions = {
    linear: (t: number) => t,
    easeIn: (t: number) => t * t,
    easeOut: (t: number) => t * (2 - t),
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  };

  const start = useCallback(() => {
    setIsPlaying(true);
    setStartTime(Date.now());
    setProgress(0);
  }, []);

  const stop = useCallback(() => {
    setIsPlaying(false);
    setStartTime(null);
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setStartTime(null);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (!isPlaying || startTime === null) return;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFunctions[easing](rawProgress);
      
      setProgress(easedProgress);

      if (rawProgress >= 1) {
        if (loop) {
          setStartTime(Date.now());
        } else {
          setIsPlaying(false);
        }
      }
    };

    const interval = setInterval(animate, 16); // ~60fps
    return () => clearInterval(interval);
  }, [isPlaying, startTime, duration, easing, loop]);

  return {
    progress,
    isPlaying,
    start,
    stop,
    reset,
  };
};

export const useTypewriter = (text: string, speed = 50) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
      return;
    }
  }, [text, currentIndex, speed]);

  const reset = useCallback(() => {
    setDisplayText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, []);

  return {
    displayText,
    isComplete,
    reset,
  };
};

export const usePulse = (duration = 1000) => {
  const { progress } = useAnimation({ duration, loop: true, autoStart: true, easing: 'easeInOut' });
  
  // Convert progress to a pulse value (0 -> 1 -> 0)
  const pulseValue = progress <= 0.5 ? progress * 2 : (1 - progress) * 2;
  
  return pulseValue;
};