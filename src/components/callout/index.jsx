import { useRef } from 'react';
import { useInView } from '@/lib/guide/hooks';
import { GuideIcon } from '@/lib/guide/icons';
import { cva } from 'class-variance-authority';
import { cn, FormattedText } from 'drupal-canvas';

const calloutVariants = cva(
  'relative overflow-hidden rounded-2xl p-7 transition-all duration-700 ease-out sm:p-8',
  {
    variants: {
      variant: {
        takeaway:
          'bg-linear-135 from-guide-mint to-guide-cyan text-guide-deep [&_a]:text-guide-deep',
        note: 'border border-guide-cobalt/20 bg-guide-mist text-guide-ink in-data-[theme=dark]:border-white/15 in-data-[theme=dark]:bg-white/5 in-data-[theme=dark]:text-white',
      },
    },
    defaultVariants: { variant: 'takeaway' },
  },
);

const ICONS = { takeaway: 'key', note: 'sparkles' };

const Callout = ({ variant = 'takeaway', title, text, className }) => {
  const ref = useRef(null);
  const visible = useInView(ref);
  return (
    <aside
      className={cn(
        calloutVariants({ variant }),
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        className,
      )}
      data-print-avoid-break
      data-reveal
      ref={ref}
    >
      <GuideIcon
        className="absolute -right-4 -bottom-4 opacity-15"
        name={ICONS[variant]}
        size={120}
        strokeWidth={1.25}
      />
      {title && (
        <div className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-[0.2em] uppercase">
          <GuideIcon name={ICONS[variant]} size={18} strokeWidth={2.25} />
          {title}
        </div>
      )}
      <FormattedText className="relative text-lg/relaxed font-semibold [&_p]:m-0">
        {text}
      </FormattedText>
    </aside>
  );
};

export default Callout;
