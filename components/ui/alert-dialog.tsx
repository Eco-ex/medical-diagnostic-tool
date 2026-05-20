import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertDialogContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextType | undefined>(undefined);

const AlertDialog = ({ open, onOpenChange, children }: {
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
    <AlertDialogContext.Provider value={{ open: isOpen, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
};

const AlertDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild, ...props }, ref) => {
  const context = React.useContext(AlertDialogContext);

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
AlertDialogTrigger.displayName = 'AlertDialogTrigger';

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(AlertDialogContext);

  if (!context?.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={ref}
        className={cn(
          'w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});
AlertDialogContent.displayName = 'AlertDialogContent';

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-500 dark:text-gray-400', className)}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const context = React.useContext(AlertDialogContext);

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        context?.setOpen(false);
      }}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        className
      )}
      {...props}
    />
  );
});
AlertDialogAction.displayName = 'AlertDialogAction';

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const context = React.useContext(AlertDialogContext);

  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        onClick?.(e);
        context?.setOpen(false);
      }}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800',
        className
      )}
      {...props}
    />
  );
});
AlertDialogCancel.displayName = 'AlertDialogCancel';

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};


