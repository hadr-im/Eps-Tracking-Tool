import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';

interface EditableTextCellProps {
  id: string;
  field: string;
  value: string | null;
  isPending: boolean;
  multiline?: boolean;
  placeholder?: string;
  onUpdate: (id: string, field: string, value: string | null) => void;
}

export function EditableTextCell({
  id,
  field,
  value,
  isPending,
  multiline = false,
  placeholder = '—',
  onUpdate,
}: EditableTextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  // Sync external value changes 
  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next !== value) {
      onUpdate(id, field, next);
    }
  }

  function cancel() {
    setEditing(false);
    setDraft(value ?? '');
  }

  if (editing) {
    const sharedProps = {
      ref,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (!multiline && e.key === 'Enter') commit();
        if (e.key === 'Escape') cancel();
      },
      className:
        'w-full min-w-[8rem] rounded border border-blue-300 bg-white px-2 py-0.5 text-xs outline-none ring-1 ring-blue-400 focus:ring-2',
      disabled: isPending,
    };

    return multiline ? (
      <textarea {...sharedProps} rows={3} style={{ resize: 'vertical' }} />
    ) : (
      <input {...sharedProps} type="text" />
    );
  }

  return (
    <button
      type="button"
      onClick={() => { if (!isPending) setEditing(true); }}
      className="group flex w-full min-w-24 cursor-text items-start gap-1 rounded px-1 py-0.5 text-left text-xs transition-colors hover:bg-accent"
      title="Click to edit"
      aria-label={`Edit ${field}`}
    >
      <span className={`flex-1 ${!value ? 'text-muted-foreground' : ''}`}>
        {value ?? placeholder}
      </span>
      <Pencil
        size={10}
        className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-60"
      />
    </button>
  );
}
