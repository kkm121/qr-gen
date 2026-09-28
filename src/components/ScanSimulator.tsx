import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sounds } from '../lib/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  payload: string;
  qrType: string;
}

export default function ScanSimulator({ isOpen, onClose, payload, qrType }: Props) {
  const [step, setStep] = useState<'acquiring' | 'locked' | 'decoded'>('acquiring');

  useEffect(() => {
    if (!isOpen) return;

    const t1 = setTimeout(() => {
      setStep('locked');
    }, 700);

    const t2 = setTimeout(() => {
      setStep('decoded');
      sounds.playScanSuccess();
    }, 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setStep('acquiring');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="scan-simulator-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="viewfinder-hud">
          {/* 4 Corner Alignment Brackets */}
          <div className="vf-bracket top-left" />
          <div className="vf-bracket top-right" />
          <div className="vf-bracket bottom-left" />
          <div className="vf-bracket bottom-right" />

          {/* Oscillating laser beam */}
          {step !== 'decoded' && <div className="vf-laser" />}

          {/* Center target crosshair */}
          <div className="vf-crosshair" />

          {/* Status HUD readout */}
          <div className="vf-status-card">
            <div className="vf-status-header">
              <span className={`vf-dot ${step === 'decoded' ? 'ok' : 'scanning'}`} />
              <span className="vf-mode-text">
                {step === 'acquiring' && 'ACQUIRING SPECIMEN OPTICS…'}
                {step === 'locked' && 'LOCKING REED-SOLOMON MODULES…'}
                {step === 'decoded' && 'SIMULATED DECODE COMPLETE'}
              </span>
            </div>

            {step === 'decoded' && (
              <motion.div
                className="vf-decoded-body"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="vf-meta-line">
                  <span className="vf-meta-badge">{qrType.toUpperCase()}</span>
                  <span className="vf-meta-res">SIMULATED PREVIEW</span>
                </div>
                <div className="vf-payload-preview">
                  <code>{payload}</code>
                </div>
                <p className="vf-note">
                  Simulated preview only — confirm scannability with a real phone camera scan.
                </p>
              </motion.div>
            )}

            <div className="vf-actions">
              <button className="btn small primary" onClick={onClose}>
                {step === 'decoded' ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
