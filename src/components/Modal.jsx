import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Open modals, innermost last.
 *
 * Module-scoped on purpose: Escape is a window-level event, so every mounted
 * Modal hears every keypress. Without knowing which one is on top, opening a
 * modal from inside another and pressing Escape closes BOTH -- the stacked one
 * the user meant to dismiss, and the form behind it, discarding whatever was
 * typed there.
 */
const openModals = [];

export function Modal({ isOpen, onClose, title, children, wide = false, elevated = false }) {
  // Held in a ref so the stack effect below depends only on isOpen. If onClose
  // were a dependency, an inline arrow would re-run the effect on every render
  // of the parent -- re-pushing that modal onto the top of the stack even while
  // a stacked modal sits above it, and handing Escape to the wrong one.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    const token = {};
    openModals.push(token);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === token) {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      const i = openModals.indexOf(token);
      if (i !== -1) openModals.splice(i, 1);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={`modal-backdrop${elevated ? ' modal-backdrop-elevated' : ''}`}
      onClick={onClose}
    >
      <div className={`modal-card${wide ? ' modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>{title}</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
