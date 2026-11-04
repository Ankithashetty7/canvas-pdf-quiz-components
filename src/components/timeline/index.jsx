import { useEffect, useRef, useState } from 'react';
import { cn } from 'drupal-canvas';

// Vertical timeline whose connecting line fills as the reader scrolls.
const Timeline = ({ items, className }) => {
  const ref = useRef(null);
  const [fill, setFill] = useState(0);

  useEffect(() => {
    let frame = null;
    const update = () => {
      frame = null;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const start = window.innerHeight * 0.75;
      const value = (start - rect.top) / rect.height;
      setFill(Math.min(1, Math.max(0, value)));
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={cn('relative', className)} ref={ref}>
      <div
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-slate-200 in-data-[theme=dark]:bg-white/10"
      >
        <div
          className="w-full origin-top bg-linear-to-b from-guide-mint to-guide-cyan"
          style={{ height: '100%', transform: `scaleY(${fill})` }}
        />
      </div>
      <ol className="relative m-0 flex list-none flex-col gap-10 p-0">
        {items}
      </ol>
    </div>
  );
};

export default Timeline;
