import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { normalizeSearchValue } from '@/pages/monthlyPanel.helpers';

export default function LocationCombobox({
  value,
  options = [],
  onChange,
  label = 'Lugar',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = value && value !== 'all' ? value : '';
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(query);
    if (!normalizedQuery) return options;
    return options.filter((option) => normalizeSearchValue(option).includes(normalizedQuery));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const selectLocation = (location) => {
    onChange(location || 'all');
    setQuery('');
    setOpen(false);
  };

  const clearSelection = (event) => {
    event.stopPropagation();
    onChange('all');
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, filteredOptions.length - 1));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredOptions[activeIndex]) {
        selectLocation(filteredOptions[activeIndex]);
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full lg:w-72">
      <label className="sr-only" htmlFor="monthly-location-combobox">{label}</label>
      <div
        id="monthly-location-combobox"
        role="combobox"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selectedLabel ? `Lugar seleccionado: ${selectedLabel}` : 'Buscar o seleccionar lugar'}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleKeyDown}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-3 text-left text-base text-gray-900 outline-none transition focus-visible:ring-2 focus-visible:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 md:text-lg"
      >
        <span className={selectedLabel ? 'truncate' : 'truncate text-gray-500 dark:text-slate-400'}>
          {selectedLabel || 'Buscar o seleccionar lugar'}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selectedLabel ? (
            <button
              type="button"
              aria-label="Limpiar lugar"
              onClick={clearSelection}
              className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-[#1e3a8a] dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </div>

      {open ? (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-[70vh] rounded-lg border border-gray-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="relative border-b border-gray-100 p-2 dark:border-slate-800">
            <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              aria-label="Buscar lugar"
              placeholder="Buscar o seleccionar lugar"
              className="h-10 w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-[#1e3a8a] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-400"
            />
          </div>

          <div role="listbox" aria-label="Lugares" className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={!selectedLabel}
              onClick={() => selectLocation('all')}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 transition hover:bg-blue-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Todos los lugares
              {!selectedLabel ? <Check className="h-4 w-4 text-[#1e3a8a]" aria-hidden="true" /> : null}
            </button>

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-500 dark:text-slate-400">
                No se encontraron lugares
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const selected = normalizeSearchValue(option) === normalizeSearchValue(selectedLabel);
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectLocation(option)}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                      index === activeIndex ? 'bg-blue-50 dark:bg-slate-800' : ''
                    } ${selected ? 'font-semibold text-[#1e3a8a] dark:text-blue-200' : 'text-gray-700 dark:text-slate-200'}`}
                  >
                    <span className="truncate">{option}</span>
                    {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
