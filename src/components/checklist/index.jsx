import { useMemo, useRef } from 'react';
import { useInView } from '@/lib/guide/hooks';
import { GuideIcon } from '@/lib/guide/icons';
import { cn } from 'drupal-canvas';

// Items come from a formatted-text list so editors can author plain bullets.
const toItems = (html) => {
  if (!html) return [];
  if (typeof DOMParser === 'undefined') return [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const nodes = Array.from(doc.querySelectorAll('li'));
  const list = nodes.length ? nodes : Array.from(doc.querySelectorAll('p'));
  return list.map((n) => n.innerHTML.trim()).filter(Boolean);
};

const Checklist = ({ heading, items, icon = 'check', className }) => {
  const ref = useRef(null);
  const visible = useInView(ref, { threshold: 0.1 });
  const list = useMemo(() => toItems(items), [items]);

  return (
    <div className={cn('flex flex-col', className)} ref={ref}>
      {heading && (
        <h3 className="mb-5 text-sm font-extrabold tracking-[0.16em] text-guide-cobalt uppercase in-data-[theme=dark]:text-guide-mint">
          {heading}
        </h3>
      )}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {list.map((item, i) => (
          <li
            className={cn(
              'flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-500 ease-out in-data-[theme=dark]:border-white/10 in-data-[theme=dark]:bg-white/5',
              visible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0',
            )}
            data-print-avoid-break
            data-reveal
            key={item}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full',
                icon === 'alert'
                  ? 'bg-red-500/15 text-red-500'
                  : 'bg-guide-mint/25 text-guide-cobalt in-data-[theme=dark]:text-guide-mint',
              )}
            >
              <GuideIcon name={icon} size={16} strokeWidth={2.5} />
            </span>
            <span
              className="text-[15px]/relaxed text-slate-700 in-data-[theme=dark]:text-guide-haze"
              dangerouslySetInnerHTML={{ __html: item }}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Checklist;
