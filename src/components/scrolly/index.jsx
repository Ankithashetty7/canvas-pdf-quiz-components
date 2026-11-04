import { useEffect, useRef, useState } from 'react';
import { cn } from 'drupal-canvas';

// Two-column scrollytelling: steps scroll on the left while a sticky rail on
// the right tracks the active step. Steps are separate components, so the
// rail reads them from the DOM.
const readSteps = (root) =>
  Array.from(root.querySelectorAll('[data-scrolly-step]')).map((el) => ({
    id: el.id,
    number: el.dataset.number || '',
    label: el.dataset.label || '',
  }));

const Scrolly = ({ railTitle, steps, className }) => {
  const stepsRef = useRef(null);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = stepsRef.current;
    if (!root) return undefined;
    let timer = null;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setItems(readSteps(root)), 50);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-label', 'data-number', 'id'],
    });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const root = stepsRef.current;
    if (!root || !items.length || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }
    const els = Array.from(root.querySelectorAll('[data-scrolly-step]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(els.indexOf(entry.target));
        });
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const current = items[active];
  const progress = items.length ? ((active + 1) / items.length) * 100 : 0;

  return (
    <div
      className={cn(
        'mt-16 grid grid-cols-1 gap-10 first:mt-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16',
        className,
      )}
    >
      <div ref={stepsRef}>{steps}</div>
      <aside
        aria-label={railTitle || 'Progress'}
        className="hidden lg:block"
        data-guide-chrome
      >
        <div className="sticky top-28 rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm in-data-[theme=light]:border-slate-200 in-data-[theme=light]:bg-guide-mist">
          {railTitle && (
            <div className="mb-4 text-xs font-bold tracking-[0.2em] text-guide-cyan uppercase">
              {railTitle}
            </div>
          )}
          <div
            className="relative mb-2 h-[104px] overflow-hidden"
            aria-live="polite"
          >
            <div
              className="text-[104px] leading-none font-extrabold text-guide-mint tabular-nums transition-all duration-500"
              key={current?.number}
            >
              <span className="inline-block animate-fade-up">
                {current?.number}
              </span>
            </div>
          </div>
          <div className="mb-6 min-h-12 text-lg/snug font-semibold">
            {current?.label}
          </div>
          <div className="mb-6 h-1 overflow-hidden rounded-full bg-white/10 in-data-[theme=light]:bg-slate-200">
            <div
              className="h-full rounded-full bg-linear-to-r from-guide-mint to-guide-cyan transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
            {items.map((item, i) => (
              <li key={item.id || i}>
                <a
                  className={cn(
                    'flex gap-3 rounded-lg px-2 py-1.5 text-[13px]/snug no-underline transition-colors',
                    i === active
                      ? 'bg-white/10 font-semibold text-white in-data-[theme=light]:bg-white in-data-[theme=light]:text-guide-ink'
                      : 'text-white/55 hover:text-white in-data-[theme=light]:text-slate-500 in-data-[theme=light]:hover:text-guide-ink',
                  )}
                  href={item.id ? `#${item.id}` : undefined}
                >
                  <span className="w-5 shrink-0 text-guide-mint tabular-nums">
                    {item.number}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
};

export default Scrolly;
