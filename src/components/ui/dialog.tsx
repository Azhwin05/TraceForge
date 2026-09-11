"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Padding lives on DialogContent (header/footer use margins) because all 24
 * call sites compose `<DialogContent><DialogHeader/>…body…<DialogFooter/>`
 * with no body wrapper — moving padding onto sub-parts would unpad every one.
 *
 * DELIBERATELY UNANIMATED, AND WRAPPED TO FORCE-UNMOUNT ON CLOSE.
 *
 * @base-ui/react 1.5.0's Dialog never actually removes its Popup from the DOM
 * on close in this app: closing (via Cancel, the library's own X button, or
 * Escape) correctly flips `open` to false and sets `data-closed`, but the
 * popup stays mounted, full-size, and completely unresponsive forever after —
 * confirmed with a live element on a freshly loaded page, `getAnimations()`
 * returning `[]` (nothing to wait on), and no console error. Root cause traced
 * into the library itself: `useOpenStateTransitions` only calls its internal
 * `forceUnmount` from inside `useOpenChangeComplete`'s animation-finished
 * detection (@base-ui/react/internals/useAnimationsFinished.js) — for reasons
 * not fully pinned down (most likely a ref timing issue between the popup ref
 * and that hook, since the *animation* detection itself works exactly as
 * documented, i.e. resolves immediately when there is nothing to wait for, yet
 * `forceUnmount` still never fires) that path never actually runs. This
 * reproduced identically across two different CSS animation approaches and
 * with no animation classes at all, i.e. it is not about *how* the dialog is
 * styled.
 *
 * The library documents exactly this escape hatch on DialogRoot's `actionsRef`
 * ("Useful when the dialog's animation is controlled by an external library"):
 * passing one hands US the `unmount()` action and makes Base UI stop trying to
 * unmount on its own. `DialogRoot` below does that and calls `unmount()`
 * itself the instant `open` becomes false — so this bug's cause doesn't matter
 * for correctness. If a future @base-ui/react upgrade fixes it upstream, this
 * wrapper is still correct (an already-unmounted popup's unmount() is a no-op).
 */
function DialogRoot({
  open,
  actionsRef: externalActionsRef,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const internalActionsRef = React.useRef<DialogPrimitive.Root.Actions>(null)
  const actionsRef = externalActionsRef ?? internalActionsRef

  React.useEffect(() => {
    if (!open) actionsRef.current?.unmount()
  }, [open, actionsRef])

  return <DialogPrimitive.Root open={open} actionsRef={actionsRef} {...props} />
}

const Dialog = DialogRoot
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <DialogPrimitive.Portal>{children}</DialogPrimitive.Portal>
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      // Deliberately no open/close animation — see the note on DialogContent
      // below for why. The backdrop's own fade cost nothing to keep working,
      // but an animated backdrop next to a non-animated, instantly-toggling
      // popup would look like a mismatched half-broken transition, so both
      // are kept equally instant.
      className={cn("fixed inset-0 z-50 bg-neutral-950/50 backdrop-blur-[2px]", className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Popup> & { showClose?: boolean }) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2",
          // Tall dialogs scroll internally instead of overflowing the viewport
          "max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain",
          "rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-xl",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-4 flex flex-col gap-1 pr-8", className)} {...props} />
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}
