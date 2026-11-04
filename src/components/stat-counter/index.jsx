import { useRef } from 'react';
import { useCountUp, useInView } from '@/lib/guide/hooks';
import { cn } from 'drupal-canvas';

const Ring = ({ value, max }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 size-full -rotate-90"
      viewBox="0 0 120 120"
    >
      <circle
        className="stroke-slate-200 in-data-[theme=dark]:stroke-white/10"
        cx="60"
        cy="60"
        fill="none"
        r={r}
        strokeWidth="8"
      />
      <circle
        className="stroke-guide-mint"
        cx="60"
        cy="60"
        fill="none"
        r={r}
        strokeDasharray={`${pct * circ} ${circ}`}
        strokeLinecap="round"
        strokeWidth="8"
      />
    </svg>
  );
};

const StatCounter = ({
  value = 0,
  decimals = 0,
  prefix,
  suffix,
  label,
  source,
  display = 'number',
  maxValue = 100,
  className,
}) => {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.4 });
  const current = useCountUp(Number(value) || 0, visible);
  const formatted = current.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const number = (
    <span className="tabular-nums">
      {prefix}
      {formatted}
      {suffix}
    </span>
  );

  return (
    <div
      className={cn(
        'flex flex-col',
        display === 'ring' && 'items-center text-center',
        className,
      )}
      data-print-avoid-break
      ref={ref}
    >
      {display === 'ring' ? (
        <div className="relative mb-5 flex size-44 items-center justify-center">
          <Ring max={maxValue} value={current} />
          <span className="text-5xl font-extrabold text-guide-ink in-data-[theme=dark]:text-white">
            {number}
          </span>
        </div>
      ) : (
        <div className="mb-3 bg-linear-to-r from-guide-cobalt to-guide-cyan bg-clip-text text-[clamp(56px,8vw,96px)] leading-none font-extrabold text-transparent in-data-[theme=dark]:from-guide-mint in-data-[theme=dark]:to-guide-cyan">
          {number}
        </div>
      )}
      {label && (
        <p className="max-w-xs text-lg/snug font-semibold text-guide-ink in-data-[theme=dark]:text-white">
          {label}
        </p>
      )}
      {source && (
        <p className="mt-2 text-xs text-slate-500 in-data-[theme=dark]:text-guide-haze">
          {source}
        </p>
      )}
    </div>
  );
};

export default StatCounter;
