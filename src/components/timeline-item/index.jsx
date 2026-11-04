import { useRef } from 'react';
import { useInView } from '@/lib/guide/hooks';
import { GuideIcon } from '@/lib/guide/icons';
import { cn } from 'drupal-canvas';

const TimelineItem = ({ label, heading, text, icon = 'check', className }) => {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.3 });
  return (
    <li
      className={cn('relative flex gap-6 pl-0', className)}
      data-print-avoid-break
      ref={ref}
    >
      <span
        className={cn(
          'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500',
          visible
            ? 'border-guide-mint bg-guide-mint text-guide-deep'
            : 'border-slate-300 bg-white text-slate-400 in-data-[theme=dark]:border-white/20 in-data-[theme=dark]:bg-guide-ink',
        )}
      >
        <GuideIcon name={icon} size={18} strokeWidth={2.25} />
      </span>
      <div
        className={cn(
          'pt-1 transition-all duration-700 ease-out',
          visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
        )}
        data-reveal
      >
        {label && (
          <div className="mb-1 text-xs font-bold tracking-[0.18em] text-guide-cyan uppercase">
            {label}
          </div>
        )}
        {heading && (
          <h3 className="mb-2 text-xl font-bold text-guide-ink in-data-[theme=dark]:text-white">
            {heading}
          </h3>
        )}
        {text && (
          <p className="max-w-2xl text-[16px]/relaxed text-slate-600 in-data-[theme=dark]:text-guide-haze">
            {text}
          </p>
        )}
      </div>
    </li>
  );
};

export default TimelineItem;
