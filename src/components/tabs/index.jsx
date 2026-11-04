import { useCallback, useEffect, useRef, useState } from 'react';
import { GuideIcon } from '@/lib/guide/icons';
import { cn } from 'drupal-canvas';

const panelsIn = (root) =>
  Array.from(root.querySelectorAll('[data-tab-panel]')).filter(
    (el) => el.closest('[data-tabs]') === root,
  );

const Tabs = ({ orientation = 'horizontal', label, panels, className }) => {
  const rootRef = useRef(null);
  const tabRefs = useRef([]);
  const [tabs, setTabs] = useState([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let timer = null;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setTabs(
          panelsIn(root).map((el) => ({
            id: el.id,
            label: el.dataset.label || 'Tab',
            icon: el.dataset.icon || '',
          })),
        );
      }, 30);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-label', 'data-icon'],
    });
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  // Panels are separate components; show the active one via `hidden`.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    panelsIn(root).forEach((el, i) => {
      el.hidden = i !== active;
      el.setAttribute('aria-labelledby', `${el.id}-tab`);
    });
  }, [active, tabs]);

  const select = useCallback(
    (index, focus) => {
      const next = (index + tabs.length) % tabs.length;
      setActive(next);
      if (focus) tabRefs.current[next]?.focus();
    },
    [tabs.length],
  );

  const onKeyDown = (event) => {
    const keys =
      orientation === 'vertical'
        ? ['ArrowUp', 'ArrowDown']
        : ['ArrowLeft', 'ArrowRight'];
    if (event.key === keys[0]) select(active - 1, true);
    else if (event.key === keys[1]) select(active + 1, true);
    else if (event.key === 'Home') select(0, true);
    else if (event.key === 'End') select(tabs.length - 1, true);
    else return;
    event.preventDefault();
  };

  const vertical = orientation === 'vertical';

  return (
    <div
      className={cn(
        'grid gap-8',
        vertical && 'lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-12',
        className,
      )}
      data-tabs
      ref={rootRef}
    >
      <div
        aria-label={label}
        aria-orientation={orientation}
        className={cn(
          'flex gap-2 overflow-x-auto pb-1',
          vertical ? 'lg:flex-col lg:overflow-visible' : 'flex-wrap',
        )}
        data-guide-chrome
        role="tablist"
      >
        {tabs.map((tab, i) => (
          <button
            aria-controls={tab.id}
            aria-selected={i === active}
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-guide-mint',
              i === active
                ? 'border-guide-mint bg-guide-mint text-guide-deep shadow-lg shadow-guide-mint/20'
                : 'border-slate-200 bg-white text-guide-ink hover:border-guide-cobalt/40 in-data-[theme=dark]:border-white/15 in-data-[theme=dark]:bg-white/5 in-data-[theme=dark]:text-white in-data-[theme=dark]:hover:border-guide-mint/50',
            )}
            id={`${tab.id}-tab`}
            key={tab.id || i}
            onClick={() => select(i)}
            onKeyDown={onKeyDown}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            tabIndex={i === active ? 0 : -1}
            type="button"
          >
            {tab.icon && <GuideIcon name={tab.icon} size={20} />}
            {tab.label}
          </button>
        ))}
      </div>
      <div>{panels}</div>
    </div>
  );
};

export default Tabs;
