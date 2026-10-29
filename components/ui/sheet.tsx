'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetContent({
  side = 'bottom',
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props & { side?: 'bottom' | 'right' }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-ink/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          'fixed z-50 flex flex-col gap-3 bg-card p-5 text-ink transition-transform duration-300 ease-out',
          side === 'bottom' &&
            'inset-x-0 bottom-0 max-h-[85dvh] rounded-t-xl border-t-[1.5px] border-ink data-ending-style:translate-y-full data-starting-style:translate-y-full',
          side === 'right' &&
            'inset-y-0 right-0 w-80 border-l-[1.5px] border-ink data-ending-style:translate-x-full data-starting-style:translate-x-full',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label="닫기"
          className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-md hover:bg-paper-deep"
        >
          <XIcon className="size-5" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return <DialogPrimitive.Title className={cn('pr-10 text-lg font-black', className)} {...props} />
}

function SheetDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export { Sheet, SheetContent, SheetTitle, SheetDescription }
