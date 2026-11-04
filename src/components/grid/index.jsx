import { cva } from 'class-variance-authority';
import { cn } from 'drupal-canvas';

const gridVariants = cva('grid grid-cols-1', {
  variants: {
    columns: {
      one: '',
      two: 'md:grid-cols-2',
      three: 'md:grid-cols-2 lg:grid-cols-3',
      four: 'sm:grid-cols-2 lg:grid-cols-4',
      five: 'sm:grid-cols-2 lg:grid-cols-5',
      split: 'lg:grid-cols-[1.1fr_0.9fr]',
    },
    gap: {
      tight: 'gap-4',
      normal: 'gap-6',
      wide: 'gap-10 lg:gap-16',
    },
    align: {
      start: 'items-start',
      center: 'items-center',
      stretch: 'items-stretch',
    },
  },
  defaultVariants: { columns: 'three', gap: 'normal', align: 'stretch' },
});

const Grid = ({
  columns = 'three',
  gap = 'normal',
  align = 'stretch',
  spaced = false,
  items,
  className,
}) => (
  <div
    className={cn(
      gridVariants({ columns, gap, align }),
      spaced && 'mt-12',
      className,
    )}
  >
    {items}
  </div>
);

export default Grid;
