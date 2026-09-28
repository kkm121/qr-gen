import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PALETTE = ['#4285f4', '#ea4335', '#fbbc05', '#34a853'];

/**
 * Original ambient backdrop: a breathing grid of GDG-coloured particles
 * rendered with three.js. Fixed behind the UI, pointer-parallaxed,
 * DPR-capped, paused when the tab hides, off for reduced motion.
 */
export default function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    const mobile = window.innerWidth < 700;
    const COLS = mobile ? 56 : 104;
    const ROWS = mobile ? 30 : 52;
    const COUNT = COLS * ROWS;
    const SPACING = 0.58;

    const base = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const c = new THREE.Color();
    let i = 0;
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        base[i * 3] = (x - COLS / 2) * SPACING;
        base[i * 3 + 1] = (y - ROWS / 2) * SPACING;
        base[i * 3 + 2] = 0;
        c.set(PALETTE[(x * 7 + y * 3) % PALETTE.length]);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        seeds[i] = Math.random() * Math.PI * 2;
        i++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(base.slice(), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let tx = 0;
    let ty = 0;
    let mx = 0;
    let my = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove);

    const resize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let running = true;
    const onVis = () => {
      running = !document.hidden;
      if (running) loop();
    };
    document.addEventListener('visibilitychange', onVis);

    const clock = new THREE.Clock();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const loop = () => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      mx += (tx - mx) * 0.03;
      my += (ty - my) * 0.03;
      for (let k = 0; k < COUNT; k++) {
        const px = base[k * 3];
        const py = base[k * 3 + 1];
        pos.setZ(
          k,
          Math.sin(px * 0.35 + t * 0.7 + seeds[k]) * 0.9 +
            Math.cos(py * 0.3 + t * 0.5 + seeds[k] * 0.5) * 0.9,
        );
      }
      pos.needsUpdate = true;
      points.rotation.x = my * 0.1;
      points.rotation.y = mx * 0.16;
      camera.position.x = mx * 0.6;
      camera.position.y = -my * 0.4;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />;
}
