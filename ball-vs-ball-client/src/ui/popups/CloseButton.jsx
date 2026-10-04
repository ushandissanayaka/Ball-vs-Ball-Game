import React from 'react';

/** The grey square "X" that closes a window. */
export default function CloseButton({ className = '', onClose }) {
  return (
    <button type="button" className={`popup-close ${className}`} aria-label="Close" onClick={onClose}>
      <svg className="popup-close-x" viewBox="0 0 64 64" aria-hidden="true">
        <path
          d="M8 4 H22 L32 20 L42 4 H56 L40 32 L56 60 H42 L32 44 L22 60 H8 L24 32 Z"
          fill="#fff" stroke="#111318" strokeWidth="3.5" strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
