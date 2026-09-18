'use client';

import { useState, ReactNode } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet';
import { Button } from './button';
import { Plus } from 'lucide-react';

interface FormSheetProps {
  triggerLabel: string;
  title: string;
  description?: string;
  // Overrides the default "+ triggerLabel" button (e.g. a per-row icon-only
  // Edit button) — triggerLabel is still used for accessibility/title context.
  triggerElement?: ReactNode;
  // Render-prop so the form inside can call close() itself on a successful
  // mutation, without FormSheet needing to know anything about the mutation.
  children: (close: () => void) => ReactNode;
}

// Shared "Add X" slide-over shell — every create-flow across the admin
// panel (branches, employees, vendors, masters, etc.) uses this instead of
// each page reimplementing its own dialog/sheet chrome.
export function FormSheet({ triggerLabel, title, description, triggerElement, children }: FormSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {triggerElement ? (
        <span onClick={() => setOpen(true)}>{triggerElement}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {triggerLabel}
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription>{description}</SheetDescription>}
          </SheetHeader>
          <div className="flex-1 px-4 pb-4">{children(() => setOpen(false))}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
