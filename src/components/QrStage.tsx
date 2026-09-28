import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { sounds } from '../lib/sound';
import ScanSimulator from './ScanSimulator';

interface Props {
  hostRef: RefObject<HTMLDivElement | null>;
  size: number;
  ec: string;
  ratio: string;
  payloadLen: number;
  valid: boolean;
  trickKey: number;
  celebrateKey: number;
  payload: string;
  qrType: string;
  onTriggerJump: () => void;
}

export default function QrStage({
  hostRef,
  size,
  ec,
  ratio,
  payloadLen,
  valid,
  trickKey,
  celebrateKey,
  payload,
  qrType,
  onTriggerJump,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const prevTrick = useRef(0);
  const [isJumping, setIsJumping] = useState(false);
  const [showShockwave, setShowShockwave] = useState(false);
  const [isHologramMode, setIsHologramMode] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('simulator')
  );

  // Jump, Transparent 3D Rotate, and Smooth Landing
  useEffect(() => {
    if (trickKey === 0 || trickKey === prevTrick.current) return;
    prevTrick.current = trickKey;

    setIsJumping(true);
    setShowShockwave(false);
    sounds.playJump();

    controls
      .start({
        y: [0, -85, -85, 0],
        rotateY: [0, 180, 360],
        rotateX: [0, 16, 0],
        rotateZ: [0, -6, 0],
        scale: [1, 1.07, 1.07, 1],
        opacity: [1, 0.42, 0.48, 1],
        transition: {
          duration: 1.75,
          times: [0, 0.35, 0.7, 1],
          ease: [0.22, 1, 0.36, 1],
        },
      })
      .then(() => {
        setIsJumping(false);
        setShowShockwave(true);
        sounds.playLand();
        setTimeout(() => setShowShockwave(false), 1200);
      });
  }, [trickKey, controls]);

  // Download celebration shockwave
  useEffect(() => {
    if (celebrateKey > 0) {
      const t1 = setTimeout(() => setShowShockwave(true), 20);
      const t2 = setTimeout(() => setShowShockwave(false), 1220);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [celebrateKey]);

  // Spring-smoothed mouse parallax for 3D tilt
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 220, damping: 24 });
  const sry = useSpring(ry, { stiffness: 220, damping: 24 });
  const glareX = useTransform(sry, [-15, 15], [20, 80]);
  const glareY = useTransform(srx, [-15, 15], [20, 80]);
  const glareLeft = useTransform(glareX, (v) => `${v}%`);
  const glareTop = useTransform(glareY, (v) => `${v}%`);

  const onMove = (e: React.MouseEvent) => {
    if (!frameRef.current || isJumping) return;
    const r = frameRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    const tiltMultiplier = isHologramMode ? 32 : 18;
    ry.set(px * tiltMultiplier);
    rx.set(-py * tiltMultiplier);
  };

  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div
      className={`stage ${isHologramMode ? 'hologram-mode' : ''}`}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      ref={frameRef}
    >
      {/* Ambient pedestal rings */}
      <div className="stage-ring ring-outer" aria-hidden="true" />
      <div className="stage-ring ring-middle" aria-hidden="true" />
      <div className="stage-ring ring-inner" aria-hidden="true" />


      {/* Stage Interactive Action Bar */}
      <div className="stage-hud-bar">
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="stage-hud-btn"
          onClick={() => {
            sounds.playTap();
            onTriggerJump();
          }}
          title="Make QR Jump, Rotate & Land"
        >
          <svg className="hud-icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
          </svg>
          <span>Jump & Rotate</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className={`stage-hud-btn ${isHologramMode ? 'active' : ''}`}
          onClick={() => {
            sounds.playTap();
            setIsHologramMode(!isHologramMode);
          }}
          title="Toggle 3D Holographic Spatial Mode"
        >
          <svg className="hud-icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>
          </svg>
          <span>{isHologramMode ? 'Spatial: ON' : 'Spatial Mode'}</span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          className="stage-hud-btn highlight"
          onClick={() => {
            sounds.playTap();
            setIsScannerOpen(true);
          }}
          title="Test Scan with Simulated Viewfinder"
        >
          <svg className="hud-icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
          </svg>
          <span>Verify Scan</span>
        </motion.button>
      </div>

      {/* The 3D Jump & Rotation Container */}
      <motion.div className="stage-trick-wrapper" animate={controls}>
        <motion.div
          className="stage-tilt-plate"
          style={{
            rotateX: srx,
            rotateY: sry,
            transformPerspective: 1200,
          }}
        >
          <div className={`qr-pedestal-card ${isJumping ? 'in-air' : ''}`}>
            {/* Landing Shockwave Ripple Rings */}
            {showShockwave && (
              <>
                <span className="landing-shockwave wave-1" aria-hidden="true" />
                <span className="landing-shockwave wave-2" aria-hidden="true" />
              </>
            )}

            {/* Pedestal Header */}
            <div className="pedestal-header">
              <span className={`pedestal-dot ${valid ? 'ok' : 'pending'}`} />
              <span className="pedestal-kicker">
                {valid ? 'ACTIVE QR' : 'INPUT REQUIRED'}
              </span>
              <span className="pedestal-ec-badge">EC · {ec}</span>
              <span className="pedestal-len">{payloadLen} BYTES</span>
            </div>

            {/* The QR Host Element */}
            <div className="qr-viewport">
              <div ref={hostRef} className="qr-box" aria-label="Generated QR Code" />

              {/* Laser Optical Scanline on landing or live change */}
              {showShockwave && <div className="qr-laser-scanner" aria-hidden="true" />}
            </div>

            {/* Interactive Dynamic Glass Glare */}
            <motion.div
              className="pedestal-glare"
              aria-hidden="true"
              style={{ left: glareLeft, top: glareTop }}
            />

            {/* Pedestal Foot telemetry */}
            <div className="pedestal-footer" aria-hidden="true">
              <span className="pedestal-tag">{ratio}:1 CONTRAST</span>
              <span className="pedestal-scan-pulse" />
              <span className="pedestal-tag">{size}×{size} PX</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Holographic Pedestal Reflection in Spatial Mode */}
      {isHologramMode && <div className="hologram-ground-reflection" aria-hidden="true" />}

      {/* Interactive Camera Scan Simulator Modal */}
      <ScanSimulator
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        payload={payload}
        qrType={qrType}
      />
    </div>
  );
}
