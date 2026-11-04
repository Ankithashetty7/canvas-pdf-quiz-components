import { useRef } from 'react';
import { useInView } from '@/lib/guide/hooks';
import { GuideIcon } from '@/lib/guide/icons';
import { cva } from 'class-variance-authority';
import { cn } from 'drupal-canvas';

const cardVariants = cva(
  'group relative flex h-full flex-col transition-all duration-700 ease-out',
  {
    variants: {
      variant: {
        plain: '',
        card: [
          'rounded-2xl border p-7 hover:-translate-y-1',
          'border-slate-200 bg-white shadow-[0_12px_32px_-20px_rgba(8,15,92,0.35)]',
          'in-data-[theme=dark]:border-white/10 in-data-[theme=dark]:bg-white/5 in-data-[theme=dark]:shadow-none in-data-[theme=dark]:backdrop-blur-sm',
        ],
        accent: [
          'rounded-2xl border-l-4 border-guide-mint p-7',
          'bg-guide-mist in-data-[theme=dark]:bg-white/5',
        ],
      },
      align: {
        left: 'items-start text-left',
        center: 'items-center text-center',
      },
    },
    defaultVariants: { variant: 'card', align: 'left' },
  },
);

const FeatureCard = ({
  icon,
  eyebrow,
  heading,
  text,
  linkLabel,
  link,
  variant = 'card',
  align = 'left',
  className,
}) => {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.15 });

  return (
    <div
      className={cn(
        cardVariants({ variant, align }),
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className,
      )}
      data-print-avoid-break
      data-reveal
      ref={ref}
    >
      {icon && (
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-linear-135 from-guide-mint/20 to-guide-cyan/10 text-guide-cobalt ring-1 ring-guide-mint/40 transition-transform group-hover:scale-110 in-data-[theme=dark]:text-guide-mint">
          <GuideIcon name={icon} size={28} />
        </div>
      )}
      {eyebrow && (
        <div className="mb-2 text-xs font-bold tracking-[0.18em] text-guide-cyan uppercase">
          {eyebrow}
        </div>
      )}
      {heading && (
        <h3 className="mb-2 text-lg leading-snug font-bold text-guide-ink in-data-[theme=dark]:text-white">
          {heading}
        </h3>
      )}
      {text && (
        <p className="text-[15px]/relaxed text-slate-600 in-data-[theme=dark]:text-guide-haze">
          {text}
        </p>
      )}
      {linkLabel && link && (
        <a
          className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-guide-cobalt no-underline hover:gap-3 in-data-[theme=dark]:text-guide-mint"
          href={link}
        >
          {linkLabel}
          <GuideIcon name="arrow" size={16} strokeWidth={2.25} />
        </a>
      )}
    </div>
  );
};

export default FeatureCard;
