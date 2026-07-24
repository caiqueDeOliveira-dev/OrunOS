import { useRef, useEffect } from "react";

interface VolumeVisualizerProps {
  volume: number; // 0-1
  isRecording: boolean;
  size?: number;
  barCount?: number;
}

/**
 * Circular volume visualizer — shows mic level as radial bars around a dot.
 * Used in the chat input area during recording.
 */
export function VolumeVisualizer({ volume, isRecording, size = 36, barCount = 16 }: VolumeVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const smoothVolume = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const cx = size / 2;
      const cy = size / 2;
      const innerR = size * 0.15;
      const maxBarH = size * 0.32;

      // Smooth the volume
      smoothVolume.current += (volume - smoothVolume.current) * 0.25;
      const v = smoothVolume.current;

      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2;
        // Vary bar height by position + volume
        const phase = Math.sin((i / barCount) * Math.PI * 4 + Date.now() * 0.003);
        const barH = isRecording
          ? Math.max(2, (v * maxBarH * (0.5 + phase * 0.3)) + 2)
          : 2;

        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barH);
        const y2 = cy + Math.sin(angle) * (innerR + barH);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = isRecording
          ? `rgba(192, 0, 24, ${0.4 + v * 0.6})`
          : "rgba(128, 128, 128, 0.2)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
      }

      // Center dot
      ctx.beginPath();
      ctx.arc(cx, cy, innerR * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = isRecording
        ? `rgba(192, 0, 24, ${0.6 + v * 0.4})`
        : "rgba(128, 128, 128, 0.2)";
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [volume, isRecording, size, barCount]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="flex-shrink-0"
    />
  );
}
