import { cn } from '@/lib/utils';

interface SlabImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  placeholderSrc?: string;
}

/**
 * Slab image with correct aspect ratio (63:88) and subtle corner rounding.
 */
export function SlabImage({
  src,
  alt,
  className,
  placeholderSrc = '/pokemon-placeholder.png',
}: SlabImageProps) {
  const imageSrc = src || placeholderSrc;

  return (
    <div className={cn('relative w-full', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        className="w-full rounded-sm"
      />
    </div>
  );
}
