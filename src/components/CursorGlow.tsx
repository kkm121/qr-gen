import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Original ambient cursor glow: a soft radial light that trails the
 * pointer on desktop (fine pointers only). Decorative, never hides the
 * native cursor, off for reduced motion and touch devices.
 */
export default function CursorGlow() {
  const [on, setOn] = useState(false);
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);
  const sx = useSpring(x, { stiffness: 90, damping: 22 });
  const sy = useSpring(y, { stiffness: 90, damping: 22 });

  useEffect(() => {
    if (!window.matchMedia?.('(pointer: fine)').matches) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    setOn(true);
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [x, y]);

  if (!on) return null;
  return <motion.div className="cursor-glow" style={{ x: sx, y: sy }} aria-hidden="true" />;
}
