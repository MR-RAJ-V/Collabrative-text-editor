import React, { useEffect, useRef } from 'react';

const Dialog = ({ title, children, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onClose?.();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <>
      <div className="dialog-backdrop" />
      <div className="dialog-shell">
        <div className="dialog-card" ref={dialogRef} role="dialog" aria-modal="true" aria-label={title}>
          <div className="dialog-header">
            <h3>{title}</h3>
            <button className="sidebar-close" onClick={onClose}>×</button>
          </div>
          <div className="dialog-content">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dialog;
