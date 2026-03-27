import { Search, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '../../lib/utils';

export interface SearchableOption {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  className,
  disabled = false,
  emptyLabel = 'Nenhum resultado encontrado.',
  onChange,
  options,
  placeholder = 'Selecione',
  value,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(() => options.find((option) => option.value === value), [options, value]);
  const filteredOptions = useMemo(
    () => options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      <button
        className={cn('select justify-between', disabled && 'cursor-not-allowed opacity-50')}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={selectedOption ? 'text-text-primary' : 'text-text-tertiary'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-text-secondary" />
      </button>

      {open ? (
        <div className="card-elevated absolute z-30 mt-2 w-full min-w-[16rem] overflow-hidden">
          <div className="border-b border-border px-3 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-text-tertiary" />
              <input
                className="input pl-9"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar..."
                value={query}
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto p-2">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  'flex w-full items-center rounded-button px-3 py-2 text-left text-sm transition',
                  option.value === value ? 'bg-accent-subtle text-text-primary' : 'text-text-secondary hover:bg-hover hover:text-text-primary',
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setQuery('');
                }}
                type="button"
              >
                {option.label}
              </button>
            )) : <p className="px-3 py-4 text-sm text-text-secondary">{emptyLabel}</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
