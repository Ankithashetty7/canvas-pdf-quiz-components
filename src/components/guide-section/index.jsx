import { useRef } from 'react';
import { useInView, useParallax } from '@/lib/guide/hooks';
import { cva } from 'class-variance-authority';
import { cn, Image } from 'drupal-canvas';

const sectionVariants = cva('relative isolate overflow-clip py-20 sm:py-28', {
  variants: {
    theme: {
      light: 'bg-white text-guide-ink',
      mist: 'bg-guide-mist text-guide-ink',
      dark: 'bg-guide-ink text-white',
      deep: 'bg-guide-deep text-white',
      gradient:
        'bg-linear-160 from-guide-deep via-guide-ink to-guide-royal text-white',
    },
  },
  defaultVariants: { theme: 'light' },
});

const containerVariants = cva('mx-auto px-4 sm:px-6', {
  variants: {
    width: {
      narrow: 'max-w-3xl',
      normal: 'max-w-6xl',
      wide: 'max-w-7xl',
    },
  },
  defaultVariants: { width: 'normal' },
});

const DARK_THEMES = ['dark', 'deep', 'gradient'];

const GuideSection = ({
  theme = 'light',
  anchorId,
  navLabel,
  number,
  eyebrow,
  heading,
  intro,
  width = 'normal',
  align = 'left',
  backgroundImage,
  parallax = false,
  content,
  className,
}) => {
  const ref = useRef(null);
  const layerRef = useRef(null);
  const headerRef = useRef(null);
  const headerVisible = useInView(headerRef);
  useParallax(ref, layerRef, { speed: 0.2, enabled: parallax });
  const dark = DARK_THEMES.includes(theme);

  return (
    <section
      className={cn(sectionVariants({ theme }), 'scroll-mt-16', className)}
      data-guide-section
      data-nav-label={navLabel || heading || undefined}
      data-nav-number={number || undefined}
      data-theme={dark ? 'dark' : 'light'}
      id={anchorId || undefined}
      ref={ref}
    >
      {backgroundImage?.src && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 will-change-transform"
          ref={layerRef}
        >
          <Image
            alt=""
            className="size-full object-cover opacity-50"
            height={backgroundImage.height}
            src={backgroundImage.src}
            width={backgroundImage.width}
          />
          <div
            className={cn(
              'absolute inset-0',
              dark
                ? 'bg-linear-to-b from-guide-deep/80 via-guide-ink/70 to-guide-deep/90'
                : 'bg-white/80',
            )}
          />
        </div>
      )}
      <div className={containerVariants({ width })}>
        {(heading || eyebrow || number) && (
          <header
            className={cn(
              'mb-12 transition-all duration-700 ease-out sm:mb-16',
              align === 'center' && 'mx-auto max-w-3xl text-center',
              headerVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0',
            )}
            data-reveal
            ref={headerRef}
          >
            <div
              className={cn(
                'flex items-end gap-5',
                align === 'center' && 'justify-center',
              )}
            >
              {number && (
                <span
                  aria-hidden="true"
                  className="text-[clamp(56px,9vw,112px)] leading-[0.8] font-extrabold text-guide-mint tabular-nums"
                >
                  {number}
                </span>
              )}
              <div>
                {eyebrow && (
                  <div className="mb-3 text-xs font-bold tracking-[0.2em] text-guide-cyan uppercase">
                    {eyebrow}
                  </div>
                )}
                {heading && (
                  <h2 className="text-[clamp(30px,4.5vw,52px)] leading-[1.08] font-bold tracking-tight">
                    {heading}
                  </h2>
                )}
              </div>
            </div>
            {intro && (
              <p
                className={cn(
                  'mt-6 max-w-3xl text-lg/relaxed',
                  dark ? 'text-guide-haze' : 'text-slate-600',
                  align === 'center' && 'mx-auto',
                )}
              >
                {intro}
              </p>
            )}
          </header>
        )}
        {content}
      </div>
    </section>
  );
};

export default GuideSection;
