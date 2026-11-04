import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion, useParallax } from '@/lib/guide/hooks';
import { GuideIcon } from '@/lib/guide/icons';
import { cn, Image } from 'drupal-canvas';

const AccentText = ({ text, accent }) => {
  if (!accent || !text?.includes(accent)) return text;
  const [before, ...rest] = text.split(accent);
  return (
    <>
      {before}
      <span className="bg-linear-to-r from-guide-mint to-guide-cyan bg-clip-text text-transparent">
        {accent}
      </span>
      {rest.join(accent)}
    </>
  );
};

const GuideHero = ({
  eyebrow,
  heading,
  headingAccent,
  subheading,
  backgroundImage,
  backgroundVideo,
  parallax = true,
  primaryLabel,
  primaryLink,
  secondaryLabel,
  secondaryLink,
  className,
}) => {
  const ref = useRef(null);
  const layerRef = useRef(null);
  const [showVideo, setShowVideo] = useState(false);
  useParallax(ref, layerRef, { speed: 0.25, enabled: parallax });

  // Video is skipped for reduced-motion visitors and loaded after first paint
  // so it never delays the page.
  useEffect(() => {
    if (!backgroundVideo?.src || prefersReducedMotion()) return undefined;
    const id = setTimeout(() => setShowVideo(true), 0);
    return () => clearTimeout(id);
  }, [backgroundVideo?.src]);

  return (
    <section
      className={cn(
        'relative isolate flex min-h-[88vh] items-center overflow-hidden bg-guide-deep text-white',
        className,
      )}
      data-theme="dark"
      ref={ref}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 will-change-transform"
        ref={layerRef}
      >
        {backgroundImage?.src && (
          <Image
            alt=""
            className="size-full object-cover"
            height={backgroundImage.height}
            src={backgroundImage.src}
            width={backgroundImage.width}
          />
        )}
        {showVideo && (
          <video
            autoPlay
            className="absolute inset-0 size-full object-cover"
            loop
            muted
            playsInline
            poster={backgroundVideo.poster || backgroundImage?.src}
            preload="metadata"
            src={backgroundVideo.src}
          />
        )}
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-linear-to-r from-guide-deep via-guide-deep/80 to-guide-deep/10"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-40 -left-40 -z-10 size-[520px] animate-pulse rounded-full bg-guide-cobalt/30 blur-3xl"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-6">
        <div className="max-w-2xl animate-fade-up">
          {eyebrow && (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-guide-mint/40 bg-guide-mint/10 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-guide-mint uppercase">
              {eyebrow}
            </div>
          )}
          <h1 className="mb-6 text-[clamp(40px,7vw,84px)] leading-[1.02] font-extrabold tracking-tight">
            <AccentText accent={headingAccent} text={heading} />
          </h1>
          {subheading && (
            <p className="mb-10 max-w-xl text-lg/relaxed text-guide-haze sm:text-xl/relaxed">
              {subheading}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {primaryLabel && primaryLink && (
              <a
                className="inline-flex items-center gap-2 rounded-full bg-guide-mint px-7 py-3.5 font-semibold text-guide-deep no-underline transition-transform hover:-translate-y-0.5 hover:bg-white"
                href={primaryLink}
              >
                {primaryLabel}
                <GuideIcon name="arrow" size={18} strokeWidth={2.25} />
              </a>
            )}
            {secondaryLabel && secondaryLink && (
              <a
                className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 font-semibold text-white no-underline transition-colors hover:bg-white/10"
                href={secondaryLink}
                rel="noopener noreferrer"
                target="_blank"
              >
                {secondaryLabel}
              </a>
            )}
          </div>
        </div>
      </div>

      {primaryLink && (
        <a
          aria-label="Scroll to content"
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 animate-bounce flex-col items-center gap-1 text-xs tracking-widest text-white/60 uppercase no-underline"
          data-guide-chrome
          href={primaryLink}
        >
          Scroll
          <GuideIcon name="chevron" size={20} />
        </a>
      )}
    </section>
  );
};

export default GuideHero;
