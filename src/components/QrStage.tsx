import { useRef, type RefObject } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

interface Props {
  hostRef: RefObject<HTMLDivElement | null>;
  size: number;
  ec: string;
  ratio: string;
  payloadLen: number;
  valid: boolean;
}

/**
 * Original "specimen stage" presentation for the QR: a floating mat with
 * spring-smoothed 3D tilt, a cursor-tracked glare, orbit readouts and a
 * metadata strip. The QR canvas itself is mounted untouched inside —
 * the downloaded file is byte-identical to what renders here.
 */
export default function QrStage({ hostRef, size, ec, ratio, payloadLen, valid }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 22 });
  const sry = useSpring(ry, { stiffness: 180, damping: 22 });
  const glareX = useTransform(sry, [-10, 10], [20, 80]);
  const glareY = useTransform(srx, [-10, 10], [20, 80]);
  const glareLeft = useTransform(glareX, (v) => `${v}%`);
  const glareTop = useTransform(glareY, (v) => `${v}%`);

  const onMove = (e: React.MouseEvent) => {
    if (reduce || !frameRef.current) return;
    const r = frameRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 16);
    rx.set(-py * 16);
    frameRef.current.style.setProperty('--gx', `${(px + 0.5) * 100}%`);
    frameRef.current.style.setProperty('--gy', `${(py + 0.5) * 100}%`);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div className="stage" onMouseMove={onMove} onMouseLeave={onLeave} ref={frameRef}>
      <div className="stage-ring" aria-hidden="true" />
      <div className="stage-ring r2" aria-hidden="true" />

      <span className="chip c1" aria-hidden="true">
        EC · {ec}
      </span>
      <span className="chip c2" aria-hidden="true">
        {size} PX
      </span>
      <span className="chip c3" aria-hidden="true">
        {ratio}:1
      </span>

      <motion.div
        className="tilt"
        style={reduce ? undefined : { rotateX: srx, rotateY: sry, transformPerspective: 900 }}
        animate={reduce ? undefined : { y: [0, -10, 0] }}
        transition={reduce ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="qr-mat">
          <div className="qr-mat-head">
            <span className={`status-dot ${valid ? 'ok' : 'bad'}`} />
            <span>SPECIMEN · {valid ? 'LIVE' : 'AWAITING INPUT'}</span>
            <span className="qr-mat-len">{payloadLen} CH</span>
          </div>
          <div ref={hostRef} className="qr-box" aria-label="Generated QR code" />
          <motion.div
            className="glare"
            aria-hidden="true"
            style={reduce ? undefined : { left: glareLeft, top: glareTop }}
          />
          <div className="qr-mat-foot" aria-hidden="true">
            <span>
              {size}×{size}
            </span>
            <span className="scanline" />
            <span>GDG SRM</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
