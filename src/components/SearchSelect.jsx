import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import './SearchSelect.css';

/**
 * A dropdown you can type into. The list narrows as you type (the caller's
 * `search` does the matching, so products can use the ranked product search),
 * arrow keys move, Enter picks, Escape closes.
 *
 * With `freeText`, whatever is typed is passed up through `onText` as well, so
 * a name that is not on file can still be kept; without it the box only ever
 * holds a picked option.
 */
const SearchSelect = ({
  id,
  options = [],          // [{ value, label, sub, side, muted }]
  value = '',            // selected option's value
  text,                  // free-text value (freeText mode)
  onSelect,              // (option | null) => void
  onText,                // (string) => void, freeText mode
  search,                // (options, query) => options
  freeText = false,
  placeholder = 'Search...',
  required = false,
  emptyText = 'No match',
}) => {
  const selected = options.find((o) => String(o.value) === String(value)) || null;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const shown = freeText ? (text ?? '') : (open ? query : (selected ? selected.label : query));
  const q = freeText ? (text ?? '') : query;
  const matches = q.trim()
    ? (search ? search(options, q) : options.filter((o) => String(o.label).toLowerCase().includes(q.trim().toLowerCase())))
    : options;

  useEffect(() => {
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const el = listRef.current?.children[active];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const pick = (opt) => {
    onSelect?.(opt);
    if (freeText) onText?.(opt ? opt.label : '');
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && matches[active]) {
        e.preventDefault();
        pick(matches[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const hasValue = freeText ? Boolean(text) : Boolean(selected || query);

  return (
    <div className="ss" ref={wrapRef}>
      <div className={`ss__box ${open ? 'is-open' : ''}`}>
        <input
          id={id}
          type="text"
          value={shown}
          placeholder={selected && !freeText ? selected.label : placeholder}
          autoComplete="off"
          // An empty required box still blocks the form when nothing is picked.
          required={required && !(freeText ? text : selected)}
          onFocus={() => { setOpen(true); setActive(0); }}
          onChange={(e) => {
            if (freeText) {
              onText?.(e.target.value);
              if (selected) onSelect?.(null);
            } else {
              setQuery(e.target.value);
              if (selected) onSelect?.(null);
            }
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        {hasValue ? (
          <button type="button" className="ss__icon" aria-label="Clear" onClick={() => pick(null)}>
            <X size={14} />
          </button>
        ) : (
          <span className="ss__icon ss__icon--muted"><ChevronDown size={14} /></span>
        )}
      </div>

      {open && (
        <ul className="ss__list" ref={listRef} role="listbox">
          {matches.length === 0 && <li className="ss__empty">{emptyText}</li>}
          {matches.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={String(o.value) === String(value)}
              className={`ss__item ${i === active ? 'is-active' : ''} ${String(o.value) === String(value) ? 'is-selected' : ''}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
            >
              <span className="ss__main">
                <strong>{o.label}</strong>
                {o.sub && <span>{o.sub}</span>}
              </span>
              {o.side !== undefined && o.side !== '' && (
                <span className={`ss__side ${o.muted ? 'is-muted' : ''}`}>{o.side}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchSelect;
