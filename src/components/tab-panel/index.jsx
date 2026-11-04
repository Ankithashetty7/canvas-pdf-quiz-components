import { useId } from 'react';
import { GuideIcon } from '@/lib/guide/icons';
import { cn } from 'drupal-canvas';

const TabPanel = ({ label, icon, heading, text, content, className }) => {
  const id = `tab-${useId().replace(/:/g, '')}`;
  return (
    <div
      className={cn(
        'animate-fade-up rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-32px_rgba(8,15,92,0.35)] in-data-[theme=dark]:border-white/10 in-data-[theme=dark]:bg-white/5 in-data-[theme=dark]:shadow-none sm:p-10',
        className,
      )}
      data-icon={icon}
      data-label={label}
      data-print-avoid-break
      data-tab-panel
      id={id}
      role="tabpanel"
      tabIndex={0}
    >
      <div className="flex items-start gap-5">
        {icon && (
          <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-guide-mint/20 text-guide-cobalt in-data-[theme=dark]:text-guide-mint sm:flex">
            <GuideIcon name={icon} size={28} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {heading && (
            <h3 className="mb-3 text-2xl font-bold text-guide-ink in-data-[theme=dark]:text-white">
              {heading}
            </h3>
          )}
          {text && (
            <p className="text-[17px]/relaxed text-slate-600 in-data-[theme=dark]:text-guide-haze">
              {text}
            </p>
          )}
          {content}
        </div>
      </div>
    </div>
  );
};

export default TabPanel;
