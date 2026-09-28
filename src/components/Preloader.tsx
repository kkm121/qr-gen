import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const WORDS = ['ENCODE', 'DESIGN', 'SCAN', 'EXPORT'];
const STATUS = [
  'CALIBRATING MODULES',
  'MIXING PIGMENTS',
  'TUNING ERROR CORRECTION',
  'POLISHING PIXELS',
];

type Phase = 'count' | 'ready' | 'exit';

/**
 * Original three-act boot sequence (~5.6s):
 *  Act 1 — eased 0→100 counter, cycling verbs + status lines, watermark.
 *  Act 2 — "READY" hold, everything locks at 100.
 *  Act 3 — dual-panel curtain exit (colour layer + black layer w/ curve).
 * Skipped instantly for reduced-motion users; parent force-dismisses
 * on a 9.5s timer so this can never trap anyone.
 */
export default function Preloader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('count');
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      doneRef.current();
      return;
    }
    let raf = 0;
    const timers: number[] = [];
    const start = performance.now();
    const DUR = 3600;
    const tick = (now: number) => {
      const p = Math.min((now - start) / DUR, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase('ready');
        timers.push(window.setTimeout(() => setPhase('exit'), 750));
        timers.push(window.setTimeout(() => doneRef.current(), 750 + 1250));
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const exiting = phase === 'exit';
  const idx = Math.min(Math.floor(count / 25), WORDS.length - 1);
  const word = phase === 'count' ? WORDS[idx] : 'READY';
  const status = phase === 'count' ? STATUS[idx] : 'ALL SYSTEMS SCANNABLE';
  const ease = { duration: 1.1, ease: [0.76, 0, 0.24, 1] as const };

  return (
    <>
      <motion.div
        className="preloader-back"
        initial={{ y: 0 }}
        animate={exiting ? { y: '-100%' } : { y: 0 }}
        transition={{ ...ease, delay: 0.12 }}
        aria-hidden="true"
      />
      <motion.div
        className="preloader"
        initial={{ y: 0 }}
        animate={exiting ? { y: '-100%' } : { y: 0 }}
        transition={ease}
        aria-hidden="true"
      >
        <div className="preloader-top">
          <span className="preloader-track" />
          <span className="preloader-bar" style={{ transform: `scaleX(${count / 100})` }} />
        </div>

        <span className="corner tl">+</span>
        <span className="corner tr">+</span>
        <span className="corner bl">+</span>
        <span className="corner br">+</span>
        <span className="watermark">QR</span>

        <motion.div
          className="preloader-inner"
          animate={exiting ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="preloader-kicker">GDG SRM · QR ATELIER</p>
          <p className="preloader-word" key={word}>
            {word}
          </p>
          <p className="preloader-status" key={status}>
            {status}
          </p>
        </motion.div>

        <div className="preloader-foot">
          <span>REALTIME · CLIENT ONLY</span>
          <span className="preloader-count">{count}</span>
        </div>

        <svg className="preloader-curve" viewBox="0 0 1440 90" preserveAspectRatio="none">
          <path d="M0,90 L0,45 Q720,0 1440,45 L1440,90 Z" />
        </svg>
      </motion.div>
    </>
  );
}
