import { cva } from 'class-variance-authority';
import { cn, FormattedText } from 'drupal-canvas';

const richTextVariants = cva(
  [
    'max-w-none [&_a]:font-semibold [&_a]:text-guide-cobalt [&_a]:underline in-data-[theme=dark]:[&_a]:text-guide-mint',
    '[&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-semibold',
    '[&_li]:mb-1.5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5',
    '[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-bold',
    'text-slate-700 in-data-[theme=dark]:text-guide-haze',
  ],
  {
    variants: {
      size: {
        small: 'text-sm/relaxed',
        normal: 'text-base/relaxed sm:text-[17px]/[1.75]',
        lead: 'text-lg/relaxed text-guide-ink in-data-[theme=dark]:text-white sm:text-xl/relaxed',
      },
      columns: {
        one: '',
        two: 'md:columns-2 md:gap-12 [&_p]:break-inside-avoid',
      },
    },
    defaultVariants: { size: 'normal', columns: 'one' },
  },
);

const RichText = ({ text, size = 'normal', columns = 'one', className }) => (
  <FormattedText className={cn(richTextVariants({ size, columns }), className)}>
    {text}
  </FormattedText>
);

export default RichText;
