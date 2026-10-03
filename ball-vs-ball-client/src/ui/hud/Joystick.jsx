import React, { useRef, useState } from 'react';
import { setStick } from '../../controls/playerInput.js';

/** On touch screens: a thumb stick (bottom right) that walks the character. Hidden where there is a keyboard. */
export default function Joystick() {
  const baseRef = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef(null);

  const moveTo = (event) => {
    const rect = baseRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    let x = (event.clientX - rect.left - radius) / radius;
    let y = (event.clientY - rect.top - radius) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    setKnob({ x, y });
    setStick(x, -y); // screen down is backward
  };
  const end = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    setStick(0, 0);
  };

  return (
    <section
      ref={baseRef}
      className="joystick"
      onPointerDown={(event) => {
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        moveTo(event);
      }}
      onPointerMove={(event) => { if (pointer.current === event.pointerId) moveTo(event); }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className="joystick-knob" style={{ "--kx": knob.x, "--ky": knob.y }} />
    </section>
  );
}
