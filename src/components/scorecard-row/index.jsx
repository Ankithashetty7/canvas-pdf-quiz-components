import { useEffect, useId, useRef, useState } from 'react';
import { GuideIcon } from '@/lib/guide/icons';
import { RATE_EVENT, RATINGS, RESET_EVENT } from '@/lib/guide/scorecard';
import { cn } from 'drupal-canvas';

const ACTIVE = {
  strong: 'border-guide-mint bg-guide-mint text-guide-deep',
  partial: 'border-amber-400 bg-amber-400 text-guide-deep',
  red_flag: 'border-red-500 bg-red-500 text-white',
};

const ScorecardRow = ({
  category,
  lookFor,
  redFlag,
  lookForLabel = 'What to look for',
  redFlagLabel = 'Red flag',
  className,
}) => {
  const ref = useRef(null);
  const id = useId();
  const [rating, setRating] = useState(null);
  const [index, setIndex] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const root = el.closest('[data-scorecard-rows]') || el.parentElement;
    const timer = setTimeout(() => {
      const rows = Array.from(
        (el.closest('.grid') || root).querySelectorAll('[data-scorecard-row]'),
      );
      setIndex(rows.indexOf(el) + 1);
    }, 0);
    const onReset = () => setRating(null);
    el.addEventListener(RESET_EVENT, onReset);
    return () => {
      clearTimeout(timer);
      el.removeEventListener(RESET_EVENT, onReset);
    };
  }, []);

  const rate = (value) => {
    const next = rating === value ? null : value;
    setRating(next);
    ref.current?.dispatchEvent(
      new CustomEvent(RATE_EVENT, {
        bubbles: true,
        detail: { id, value: next },
      }),
    );
  };

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white p-6 transition-colors in-data-[theme=dark]:bg-white/5',
        rating === 'red_flag'
          ? 'border-red-300 in-data-[theme=dark]:border-red-500/50'
          : 'border-slate-200 in-data-[theme=dark]:border-white/10',
        className,
      )}
      data-print-avoid-break
      data-scorecard-row
      ref={ref}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-3 text-lg font-bold text-guide-ink in-data-[theme=dark]:text-white">
          {index && (
            <span className="flex size-8 items-center justify-center rounded-full bg-guide-ink text-sm text-guide-mint tabular-nums">
              {index}
            </span>
          )}
          {category}
        </h3>
        <div
          aria-label={`Rate ${category}`}
          className="flex gap-1.5"
          role="group"
        >
          {RATINGS.map((r) => (
            <button
              aria-pressed={rating === r.value}
              className={cn(
                'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-all',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guide-mint',
                rating === r.value
                  ? ACTIVE[r.value]
                  : 'border-slate-300 bg-white text-slate-600 hover:border-guide-cobalt in-data-[theme=dark]:border-white/20 in-data-[theme=dark]:bg-transparent in-data-[theme=dark]:text-white/80',
              )}
              key={r.value}
              onClick={() => rate(r.value)}
              type="button"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex gap-3 rounded-xl bg-guide-mint/10 p-4">
          <GuideIcon
            className="mt-0.5 shrink-0 text-guide-cobalt in-data-[theme=dark]:text-guide-mint"
            name="check"
            size={18}
            strokeWidth={2.5}
          />
          <div>
            <div className="mb-1 text-[11px] font-bold tracking-[0.16em] text-guide-cobalt uppercase in-data-[theme=dark]:text-guide-mint">
              {lookForLabel}
            </div>
            <p className="text-sm/relaxed text-slate-700 in-data-[theme=dark]:text-guide-haze">
              {lookFor}
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-xl bg-red-500/8 p-4">
          <GuideIcon
            className="mt-0.5 shrink-0 text-red-500"
            name="alert"
            size={18}
            strokeWidth={2.25}
          />
          <div>
            <div className="mb-1 text-[11px] font-bold tracking-[0.16em] text-red-500 uppercase">
              {redFlagLabel}
            </div>
            <p className="text-sm/relaxed text-slate-700 in-data-[theme=dark]:text-guide-haze">
              {redFlag}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardRow;
