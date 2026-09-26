import { useEffect, useRef, useState, type ReactNode } from 'react';

import { ConfirmDialog } from '@/components/admin/feedback/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { getErrorMessage } from '@/lib/api/api-error';

export interface FormDialogProps {
  children: ReactNode;
  description: string;
  isDirty?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void | Promise<void>;
  open: boolean;
  submitLabel?: string;
  submitting?: boolean;
  title: string;
}

export function FormDialog({
  children,
  description,
  isDirty = false,
  onOpenChange,
  onSubmit,
  open,
  submitLabel = 'Save changes',
  submitting = false,
  title
}: FormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const busy = submitting || pending;

  useEffect(() => {
    setError(null);
    setConfirmDiscard(false);
  }, [open]);

  useEffect(() => {
    if (attempt > 0)
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
  }, [attempt]);

  const changeOpen = (nextOpen: boolean) => {
    if (busy || inFlight.current) return;
    if (!nextOpen && isDirty) setConfirmDiscard(true);
    else onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          className='max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl'
          showCloseButton={!busy}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form
            noValidate
            ref={formRef}
            className='space-y-6'
            onSubmit={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (busy || inFlight.current) return;
              inFlight.current = true;
              setPending(true);
              setError(null);
              try {
                await onSubmit();
              } catch (cause) {
                setError(getErrorMessage(cause));
              } finally {
                inFlight.current = false;
                setPending(false);
                setAttempt((previous) => previous + 1);
              }
            }}
          >
            <fieldset disabled={busy} className='min-w-0 space-y-6'>
              {children}
            </fieldset>
            {error && (
              <p role='alert' className='text-destructive text-sm'>
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                disabled={busy}
                onClick={() => changeOpen(false)}
                type='button'
                variant='outline'
              >
                Cancel
              </Button>
              <Button disabled={busy} type='submit'>
                {busy ? 'Saving...' : submitLabel}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={open && confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title='Discard unsaved changes?'
        description='Your changes will be lost if you close this form.'
        cancelLabel='Keep editing'
        confirmLabel='Discard changes'
        tone='destructive'
        onConfirm={() => {
          setConfirmDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
