import { useRef } from 'react';
import { slugify, useInView } from '@/lib/guide/hooks';
import { cn, FormattedText } from 'drupal-canvas';

const ScrollyStep = ({
  number,
  label,
  heading,
  anchorId,
  text,
  content,
  className,
}) => {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.15 });
  const id = anchorId || (label ? `step-${slugify(label)}` : undefined);

  return (
    <article
      className={cn(
        'scroll-mt-24 border-t border-white/10 py-14 transition-all duration-700 ease-out first:border-t-0 first:pt-0 in-data-[theme=light]:border-slate-200',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0',
        className,
      )}
      data-label={label || heading}
      data-number={number}
      data-reveal
      data-scrolly-step
      id={id}
      ref={ref}
    >
      <div className="mb-6 flex items-baseline gap-4">
        {number && (
          <span className="text-5xl font-extrabold text-guide-mint tabular-nums lg:hidden">
            {number}
          </span>
        )}
        {heading && (
          <h3 className="text-[clamp(26px,3.2vw,38px)] leading-[1.1] font-bold tracking-tight">
            {heading}
          </h3>
        )}
      </div>
      {text && (
        <FormattedText className="mb-10 max-w-3xl text-[17px]/[1.75] text-guide-haze in-data-[theme=light]:text-slate-700 [&_p]:mb-4">
          {text}
        </FormattedText>
      )}
      {content}
    </article>
  );
};

export default ScrollyStep;
