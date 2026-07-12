import { useEffect, useRef } from "react";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const ringPosRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX - 5}px, ${e.clientY - 5}px)`;
      }
    };
    const tick = () => {
      ringPosRef.current.x += (posRef.current.x - ringPosRef.current.x) * 0.1;
      ringPosRef.current.y += (posRef.current.y - ringPosRef.current.y) * 0.1;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ringPosRef.current.x - 16}px, ${ringPosRef.current.y - 16}px)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none rounded-full"
        style={{ width: 10, height: 10, background: "#FF1A2D", boxShadow: "0 0 8px #FF1A2D, 0 0 20px rgba(255,26,45,0.5)" }}
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 z-[9998] pointer-events-none rounded-full"
        style={{ width: 32, height: 32, border: "1px solid rgba(192,0,24,0.45)", boxShadow: "0 0 10px rgba(192,0,24,0.15)" }}
      />
    </>
  );
}
