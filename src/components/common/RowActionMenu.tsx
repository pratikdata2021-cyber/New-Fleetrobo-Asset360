import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface RowActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'accent' | 'warning' | 'danger';
  badge?: string | number;
  dividerBefore?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}

interface RowActionMenuProps {
  items: RowActionItem[];
  ariaLabel?: string;
  title?: string;
  buttonClassName?: string;
  menuWidthClass?: string;
}

export const RowActionMenu: React.FC<RowActionMenuProps> = ({
  items,
  ariaLabel = 'Row actions',
  title = 'Actions',
  buttonClassName = '',
  menuWidthClass = 'w-52',
}) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; ready: boolean }>({
    top: 0,
    left: 0,
    ready: false,
  });

  const visibleItems = items.filter((item) => !item.hidden);

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuWidth = menuEl?.offsetWidth || 208;
    const estimatedHeight = menuEl?.offsetHeight || Math.min(340, visibleItems.length * 36 + 16);

    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight + 12 && rect.top > estimatedHeight + 12;

    const top = openUpward
      ? Math.max(8, rect.top - estimatedHeight - 6)
      : Math.min(window.innerHeight - estimatedHeight - 8, rect.bottom + 6);

    const left = Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth));

    setCoords({ top, left, ready: true });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    updatePosition();
  }, [open, visibleItems.length]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [open]);

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((curr) => !curr);
        }}
        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer ${
          open
            ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-200'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        } ${buttonClassName}`}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
              visibility: coords.ready ? 'visible' : 'hidden',
            }}
            className={`${menuWidthClass} bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-left text-xs`}
          >
            {visibleItems.map((item) => {
              const toneClasses =
                item.tone === 'danger'
                  ? 'text-rose-600 hover:bg-rose-50 font-medium'
                  : item.tone === 'warning'
                  ? 'text-amber-700 hover:bg-amber-50 font-medium'
                  : item.tone === 'accent'
                  ? 'text-[#E56B38] hover:bg-orange-50 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50';

              return (
                <React.Fragment key={item.id}>
                  {item.dividerBefore && <div className="my-1 border-t border-slate-100" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.disabled) return;
                      setOpen(false);
                      item.onClick();
                    }}
                    className={`w-full px-3 py-1.5 flex items-center justify-between gap-2 text-left transition-colors ${
                      item.disabled
                        ? 'opacity-45 cursor-not-allowed text-slate-400'
                        : `${toneClasses} cursor-pointer`
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {item.icon && <span className="shrink-0 flex items-center">{item.icon}</span>}
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
};
