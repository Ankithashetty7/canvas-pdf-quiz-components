import { useEffect, useRef, useState } from 'react';
import { RATE_EVENT, RESET_EVENT } from '@/lib/guide/scorecard';
import { cn } from 'drupal-canvas';

// Interactive vendor scorecard: rows report ratings via DOM events and this
// component summarises them.
const Scorecard = ({
  vendorLabel = 'Vendor',
  summaryHeading = 'Your vendor at a glance',
  rows,
  className,
}) => {
  const rootRef = useRef(null);
  const [ratings, setRatings] = useState({});
  const [rowCount, setRowCount] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const onRate = (event) => {
      const { id, value } = event.detail;
      setRatings((prev) => ({ ...prev, [id]: value }));
    };
    root.addEventListener(RATE_EVENT, onRate);
    let timer = null;
    const count = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => setRowCount(root.querySelectorAll('[data-scorecard-row]').length),
        30,
      );
    };
    count();
    const observer = new MutationObserver(count);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      root.removeEventListener(RATE_EVENT, onRate);
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  const values = Object.values(ratings).filter(Boolean);
  const strong = values.filter((v) => v === 'strong').length;
  const partial = values.filter((v) => v === 'partial').length;
  const flags = values.filter((v) => v === 'red_flag').length;
  const rated = strong + partial + flags;
  const score = rated
    ? Math.round(((strong * 2 + partial) / (rated * 2)) * 100)
    : 0;
  const total = rowCount || rated;

  let verdict = 'Rate each criterion to build a picture of your vendor.';
  if (rated) {
    if (flags >= 3)
      verdict = 'Several red flags — probe these areas before shortlisting.';
    else if (score >= 80)
      verdict = 'Strong fit across the criteria you have rated.';
    else if (score >= 55)
      verdict = 'Promising, with gaps worth validating in a proof of concept.';
    else
      verdict =
        'Significant gaps — compare alternatives on the weakest criteria.';
  }

  const reset = () => {
    setRatings({});
    rootRef.current
      ?.querySelectorAll('[data-scorecard-row]')
      .forEach((el) => el.dispatchEvent(new CustomEvent(RESET_EVENT)));
  };

  const r = 52;
  const circ = 2 * Math.PI * r;

  return (
    <div
      className={cn('grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]', className)}
      ref={rootRef}
    >
      <div className="flex flex-col gap-4">{rows}</div>
      <aside className="lg:order-last" data-print-avoid-break>
        <div className="sticky top-24 rounded-3xl bg-guide-ink p-7 text-white shadow-2xl">
          <div className="mb-1 text-xs font-bold tracking-[0.2em] text-guide-mint uppercase">
            {vendorLabel}
          </div>
          <h3 className="mb-6 text-lg font-bold">{summaryHeading}</h3>
          <div className="mb-6 flex items-center gap-5">
            <svg
              aria-label={`Score ${score}%`}
              className="size-28 shrink-0 -rotate-90"
              role="img"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                fill="none"
                r={r}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="10"
              />
              <circle
                className="stroke-guide-mint transition-[stroke-dasharray] duration-700"
                cx="60"
                cy="60"
                fill="none"
                r={r}
                strokeDasharray={`${(score / 100) * circ} ${circ}`}
                strokeLinecap="round"
                strokeWidth="10"
              />
              <text
                className="rotate-90"
                fill="white"
                fontSize="28"
                fontWeight="800"
                textAnchor="middle"
                transform="rotate(90 60 60)"
                x="60"
                y="70"
              >
                {score}%
              </text>
            </svg>
            <div className="text-sm text-guide-haze">
              <div className="text-2xl font-bold text-white tabular-nums">
                {rated}/{total}
              </div>
              criteria rated
            </div>
          </div>
          <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-white/10">
            {[
              [strong, 'bg-guide-mint'],
              [partial, 'bg-amber-400'],
              [flags, 'bg-red-500'],
            ].map(([n, color]) => (
              <div
                className={cn('h-full transition-[width] duration-500', color)}
                key={color}
                style={{ width: total ? `${(n / total) * 100}%` : 0 }}
              />
            ))}
          </div>
          <dl className="mb-5 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ['Strong', strong, 'text-guide-mint'],
              ['Partial', partial, 'text-amber-400'],
              ['Red flags', flags, 'text-red-400'],
            ].map(([label, n, color]) => (
              <div key={label}>
                <dt className="text-guide-haze">{label}</dt>
                <dd className={cn('m-0 text-xl font-bold tabular-nums', color)}>
                  {n}
                </dd>
              </div>
            ))}
          </dl>
          <p aria-live="polite" className="mb-5 text-sm/relaxed text-white/85">
            {verdict}
          </p>
          <div className="flex gap-2" data-guide-chrome>
            <button
              className="flex-1 cursor-pointer rounded-full border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!rated}
              onClick={reset}
              type="button"
            >
              Reset
            </button>
            <button
              className="flex-1 cursor-pointer rounded-full bg-guide-mint px-4 py-2 text-sm font-semibold text-guide-deep hover:bg-white"
              onClick={() => window.print()}
              type="button"
            >
              Print
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Scorecard;
