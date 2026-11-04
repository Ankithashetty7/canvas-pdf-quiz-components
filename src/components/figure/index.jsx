import { useRef } from 'react';
import { useInView, useParallax } from '@/lib/guide/hooks';
import { cn, Image } from 'drupal-canvas';

const ASPECTS = {
  auto: '',
  landscape: 'aspect-[16/10]',
  portrait: 'aspect-[4/5]',
  square: 'aspect-square',
};

const Figure = ({
  image,
  caption,
  aspect = 'landscape',
  parallax = false,
  className,
}) => {
  const ref = useRef(null);
  const layerRef = useRef(null);
  const visible = useInView(ref);
  useParallax(ref, layerRef, { speed: 0.08, enabled: parallax });
  if (!image?.src) return null;

  return (
    <figure
      className={cn(
        'm-0 transition-all duration-1000 ease-out',
        visible ? 'scale-100 opacity-100' : 'scale-[0.97] opacity-0',
        className,
      )}
      data-print-avoid-break
      data-reveal
      ref={ref}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl shadow-[0_24px_64px_-24px_rgba(8,15,92,0.55)] ring-1 ring-white/10',
          ASPECTS[aspect],
        )}
      >
        <div
          className={cn(aspect !== 'auto' && 'absolute inset-0')}
          ref={layerRef}
        >
          <Image
            alt={image.alt || ''}
            className={cn(
              'w-full',
              aspect !== 'auto' && 'size-full object-cover',
            )}
            height={image.height}
            src={image.src}
            width={image.width}
          />
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-sm text-slate-500 in-data-[theme=dark]:text-guide-haze">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export default Figure;
