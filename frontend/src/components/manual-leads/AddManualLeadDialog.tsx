// Modal for adding a lead by hand.
//
// Two ways in, as tabs:
//   - By EXPA ID: fetch the person, review the prefilled fields, then save.
//     The lead keeps its real EXPA id so the status sync still tracks it.
//   - Manually: for someone who is not on EXPA at all.
//
// Both land in the caller's own department; that is decided server-side.

import { useState } from 'react';
import { Loader2, Search, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateManualLead, useExpaLookup } from '@/hooks/useManualLeads';
import type { ManualLeadPayload } from '@/types/manualLead';
import { cn } from '@/lib/utils';

interface AddManualLeadDialogProps {
  open: boolean;
  onClose: () => void;
}

type Mode = 'expa' | 'manual';

const EMPTY: ManualLeadPayload = {
  expaId: null,
  fullName: '',
  email: '',
  phone: '',
  university: '',
  fieldOfStudy: '',
  yearOfStudy: null,
  source: '',
  cvLink: '',
  notes: '',
};

export function AddManualLeadDialog({ open, onClose }: AddManualLeadDialogProps) {
  const [mode, setMode] = useState<Mode>('expa');
  const [expaId, setExpaId] = useState('');
  const [form, setForm] = useState<ManualLeadPayload>(EMPTY);
  // Set once a lookup succeeds, so the form shows a reviewed-and-ready state.
  const [prefilled, setPrefilled] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);

  const { mutate: lookup, isPending: isLooking } = useExpaLookup();
  const { mutate: create, isPending: isSaving } = useCreateManualLead();

  function reset() {
    setExpaId('');
    setForm(EMPTY);
    setPrefilled(false);
    setAlreadyExists(false);
  }

  function handleClose() {
    reset();
    setMode('expa');
    onClose();
  }

  function switchMode(next: Mode) {
    reset();
    setMode(next);
  }

  function handleLookup() {
    const id = expaId.trim();
    if (!id) return;

    lookup(id, {
      onSuccess: (person) => {
        setForm({
          expaId: person.expaId,
          fullName: person.fullName,
          email: person.email ?? '',
          phone: person.phone ?? '',
          university: person.university?.trim() ?? '',
          fieldOfStudy: person.fieldOfStudy ?? '',
          yearOfStudy: null,
          source: '',
          cvLink: '',
          notes: '',
        });
        setPrefilled(true);
        setAlreadyExists(person.alreadyExists);
      },
    });
  }

  function handleSave() {
    if (!form.fullName.trim() || alreadyExists) return;
    create(form, { onSuccess: handleClose });
  }

  const set = (key: keyof ManualLeadPayload) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  // In EXPA mode the fields stay hidden until a lookup has filled them.
  const showFields = mode === 'manual' || prefilled;
  const canSave = showFields && form.fullName.trim().length > 0 && !alreadyExists;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            Added to your own department and left unassigned until you dispatch it.
          </DialogDescription>
        </DialogHeader>

        {/* Mode switch */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {([
            ['expa', 'From EXPA ID'],
            ['manual', 'Enter manually'],
          ] as [Mode, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchMode(value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                mode === value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'expa' && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expaId">EXPA ID</Label>
            <div className="flex gap-2">
              <Input
                id="expaId"
                value={expaId}
                inputMode="numeric"
                placeholder="e.g. 6221719"
                onChange={(e) => setExpaId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookup();
                  }
                }}
                disabled={isLooking}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleLookup}
                disabled={!expaId.trim() || isLooking}
              >
                {isLooking ? <Loader2 className="animate-spin" /> : <Search />}
                Look up
              </Button>
            </div>

            {prefilled && !alreadyExists && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 size={13} /> Found on EXPA — check the details below.
              </p>
            )}

            {alreadyExists && (
              <p className="flex items-start gap-1.5 text-xs text-destructive">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                This EP is already in the system, so it cannot be added again.
              </p>
            )}
          </div>
        )}

        {showFields && (
          <div className="flex flex-col gap-3">
            <TextField
              id="fullName"
              label="Full name"
              required
              value={form.fullName}
              onChange={set('fullName')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField id="email" label="Email" value={form.email ?? ''} onChange={set('email')} />
              <TextField id="phone" label="Phone" value={form.phone ?? ''} onChange={set('phone')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                id="university"
                label="University"
                value={form.university ?? ''}
                onChange={set('university')}
              />
              <TextField
                id="fieldOfStudy"
                label="Field of study"
                value={form.fieldOfStudy ?? ''}
                onChange={set('fieldOfStudy')}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                id="source"
                label="Source"
                placeholder="How did they hear about us?"
                value={form.source ?? ''}
                onChange={set('source')}
              />
              <TextField
                id="cvLink"
                label="CV link"
                value={form.cvLink ?? ''}
                onChange={set('cvLink')}
              />
            </div>
            <TextField id="notes" label="Notes" value={form.notes ?? ''} onChange={set('notes')} />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            Add lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
