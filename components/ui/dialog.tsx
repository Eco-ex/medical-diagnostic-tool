import * as React from 'react';
import { cn } from '@/lib/utils';

interface DialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

const Dialog = ({ open, onOpenChange, children }: { 
  open?: boolean; 
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  
  const setOpen = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [isControlled, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const context = React.useContext(DialogContext);
  
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => context?.setOpen(true)}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
});
DialogTrigger.displayName = 'DialogTrigger';

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onInteractOutside?: (e: React.MouseEvent) => void }
>(({ className, children, onInteractOutside, ...props }, ref) => {
  const context = React.useContext(DialogContext);
  
  if (!context?.open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onInteractOutside?.(e);
          if (!onInteractOutside) {
            context?.setOpen(false);
          }
        }
      }}
    >
      <div
        ref={ref}
        className={cn(
          'w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800',
          className
        )}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left mb-4', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-gray-500 dark:text-gray-400', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

export { 
  Dialog, 
  DialogTrigger,
  DialogContent, 
  DialogHeader, 
  DialogFooter,
  DialogTitle, 
  DialogDescription 
};

