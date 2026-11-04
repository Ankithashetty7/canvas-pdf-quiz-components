import { useEffect, useState } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// True once the element has scrolled into view (stays true).
export const useInView = (ref, { threshold = 0.2, rootMargin } = {}) => {
  // Without IntersectionObserver (old browsers, some test runners) content
  // is simply shown.
  const [inView, setInView] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, threshold, rootMargin]);
  return inView;
};

// Moves `layerRef` at `speed` relative to scroll while `ref` is on screen.
// Uses transforms only, so it stays on the compositor.
export const useParallax = (
  ref,
  layerRef,
  { speed = 0.3, enabled = true } = {},
) => {
  useEffect(() => {
    const el = ref.current;
    const layer = layerRef.current;
    if (!enabled || !el || !layer || prefersReducedMotion()) return undefined;
    let frame = null;
    const update = () => {
      frame = null;
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const offset =
        (rect.top + rect.height / 2 - window.innerHeight / 2) * -speed;
      layer.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.15)`;
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [ref, layerRef, speed, enabled]);
};

// Counts from 0 to `target` once `active` turns true.
export const useCountUp = (target, active, duration = 1600) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    if (prefersReducedMotion()) {
      const id = setTimeout(() => setValue(target), 0);
      return () => clearTimeout(id);
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration]);
  return value;
};

export const slugify = (text = '') =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
