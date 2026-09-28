import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const WORDS = ['ENCODE', 'DESIGN', 'SCAN'];

/**
 * Original Lusion-style boot loader: eased counter, cycling verbs,
 * hairline progress, curved-edge curtain exit. Skipped instantly for
 * reduced-motion users. Parent must also force-dismiss on a timeout
 * so this can never trap anyone.
 */
export default function Preloader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onDone();
      return;
    }
    let raf = 0;
    let timer = 0;
    const start = performance.now();
    const DUR = 3000;
    const tick = (now: number) => {
      const p = Math.min((now - start) / DUR, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * 100));
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setExiting(true);
        timer = window.setTimeout(onDone, 1100);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [onDone]);

  const word = WORDS[Math.min(Math.floor(count / 34), WORDS.length - 1)];

  return (
    <motion.div
      className="preloader"
      initial={{ y: 0 }}
      animate={exiting ? { y: '-100%' } : { y: 0 }}
      transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
      aria-hidden="true"
    >
      <div className="preloader-top">
        <span className="preloader-track" />
        <span className="preloader-bar" style={{ transform: `scaleX(${count / 100})` }} />
      </div>

      <motion.div
        className="preloader-inner"
        animate={exiting ? { opacity: 0, y: -30 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <p className="preloader-kicker">GDG SRM · QR ATELIER</p>
        <p className="preloader-word" key={word}>
          {word}
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
  );
}
