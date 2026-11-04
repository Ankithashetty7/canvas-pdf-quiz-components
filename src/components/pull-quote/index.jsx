import { useRef } from 'react';
import { useInView } from '@/lib/guide/hooks';
import { cn } from 'drupal-canvas';

const PullQuote = ({
  quote,
  attribution,
  source,
  size = 'large',
  className,
}) => {
  const ref = useRef(null);
  const visible = useInView(ref);
  return (
    <figure
      className={cn(
        'relative m-0 border-l-4 border-guide-mint py-2 pl-8 transition-all duration-700 ease-out',
        visible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0',
        className,
      )}
      data-print-avoid-break
      data-reveal
      ref={ref}
    >
      <span
        aria-hidden="true"
        className="absolute -top-6 left-6 font-serif text-8xl leading-none text-guide-mint/40"
      >
        &ldquo;
      </span>
      <blockquote
        className={cn(
          'm-0 font-semibold tracking-tight text-guide-ink in-data-[theme=dark]:text-white',
          size === 'large'
            ? 'text-[clamp(22px,3vw,32px)]/snug'
            : 'text-xl/snug',
        )}
      >
        {quote}
      </blockquote>
      {(attribution || source) && (
        <figcaption className="mt-5 text-sm text-slate-500 in-data-[theme=dark]:text-guide-haze">
          {attribution && (
            <span className="font-semibold text-guide-cobalt in-data-[theme=dark]:text-guide-mint">
              {attribution}
            </span>
          )}
          {attribution && source && <span> · </span>}
          {source}
        </figcaption>
      )}
    </figure>
  );
};

export default PullQuote;
