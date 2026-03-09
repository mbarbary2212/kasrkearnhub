import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  className?: string;
}

export function ImageLightbox({ src, alt, className }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={className || 'rounded-lg border max-h-40 object-contain cursor-zoom-in hover:opacity-90 transition-opacity'}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none overflow-hidden flex items-center justify-center"
          closeClassName="text-white hover:text-white/80 z-10"
          overlayClassName="bg-black/80"
        >
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
