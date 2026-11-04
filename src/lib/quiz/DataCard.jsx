import { cn } from 'drupal-canvas';

// Authoring preview for quiz data components. Inside a `quiz` wrapper these
// nodes sit in a hidden container and are only read for their data; on their
// own (Workbench, editor previews) they render as a compact summary card.
export const DataCard = ({
  label,
  title,
  meta = [],
  body,
  children,
  className,
  ...attrs
}) => (
  <div
    className={cn(
      'my-2 rounded-lg border border-dashed border-gray-300 bg-white p-4 font-sans text-sm text-gray-700',
      className,
    )}
    {...attrs}
  >
    <div className="mb-1 text-[10px] font-semibold tracking-wider text-teal-dark uppercase">
      {label}
    </div>
    {title && <div className="font-semibold text-ink">{title}</div>}
    {meta.filter(Boolean).length > 0 && (
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        {meta.filter(Boolean).map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    )}
    {body && <p className="mt-2 text-xs/relaxed text-gray-600">{body}</p>}
    {children && <div className="mt-2 pl-3">{children}</div>}
  </div>
);
