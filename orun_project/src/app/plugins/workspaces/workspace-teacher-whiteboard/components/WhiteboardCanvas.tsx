import { useState, useRef, useCallback, useEffect } from "react";
import { useWhiteboardStore, addDrawElement } from "../teacher-store";
import { CANVAS_BG, GRID_COLOR } from "../teacher-types";
import type { DrawElement } from "../teacher-types";

export function WhiteboardCanvas() {
  const elements = useWhiteboardStore((s) => s.elements);
  const tool = useWhiteboardStore((s) => s.tool);
  const color = useWhiteboardStore((s) => s.color);
  const strokeWidth = useWhiteboardStore((s) => s.strokeWidth);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState("");
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [shapePreview, setShapePreview] = useState<DrawElement | null>(null);

  const getPos = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getPos(e);
    setIsDrawing(true);
    setStartPos(pos);

    if (tool === "pen" || tool === "eraser") {
      setCurrentPoints(`${pos.x},${pos.y}`);
    } else if (tool === "text") {
      const text = prompt("Digite o texto:");
      if (text) {
        addDrawElement({
          id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "text",
          x: pos.x, y: pos.y, text, color,
        });
      }
      setIsDrawing(false);
    }
  }, [tool, color, getPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);

    if ((tool === "pen" || tool === "eraser") && currentPoints) {
      setCurrentPoints((prev) => `${prev} ${pos.x},${pos.y}`);
    } else if (startPos && (tool === "rect" || tool === "circle")) {
      setShapePreview({
        id: "preview",
        type: tool,
        x: Math.min(startPos.x, pos.x),
        y: Math.min(startPos.y, pos.y),
        width: Math.abs(pos.x - startPos.x),
        height: Math.abs(pos.y - startPos.y),
        color,
      });
    }
  }, [isDrawing, tool, currentPoints, startPos, color, getPos]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if ((tool === "pen" || tool === "eraser") && currentPoints) {
      addDrawElement({
        id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: tool,
        points: currentPoints,
        color: tool === "eraser" ? CANVAS_BG : color,
        strokeWidth: tool === "eraser" ? strokeWidth * 4 : strokeWidth,
      });
      setCurrentPoints("");
    } else if (shapePreview && startPos) {
      addDrawElement({ ...shapePreview, id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` });
      setShapePreview(null);
    }
    setStartPos(null);
  }, [isDrawing, tool, currentPoints, shapePreview, startPos, color, strokeWidth]);

  return (
    <div className="relative flex-1 overflow-hidden" style={{ background: CANVAS_BG }}>
      <svg
        ref={svgRef}
        data-whiteboard-canvas
        className="w-full h-full"
        style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={GRID_COLOR} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {elements.map((el) => {
          if (el.type === "pen" || el.type === "eraser") {
            return <polyline key={el.id} points={el.points || ""} fill="none" stroke={el.color} strokeWidth={el.strokeWidth || 3} strokeLinecap="round" strokeLinejoin="round" />;
          }
          if (el.type === "rect") {
            return <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} fill="none" stroke={el.color} strokeWidth={2} rx={4} />;
          }
          if (el.type === "circle") {
            return <ellipse key={el.id} cx={(el.x || 0) + (el.width || 0) / 2} cy={(el.y || 0) + (el.height || 0) / 2} rx={(el.width || 0) / 2} ry={(el.height || 0) / 2} fill="none" stroke={el.color} strokeWidth={2} />;
          }
          if (el.type === "text") {
            return <text key={el.id} x={el.x} y={el.y} fill={el.color} fontFamily="'Sora', sans-serif" fontSize="14">{el.text}</text>;
          }
          return null;
        })}

        {shapePreview && (
          <g opacity={0.5}>
            {shapePreview.type === "rect" && (
              <rect x={shapePreview.x} y={shapePreview.y} width={shapePreview.width} height={shapePreview.height}
                fill="none" stroke={shapePreview.color} strokeWidth={2} strokeDasharray="5,5" rx={4} />
            )}
            {shapePreview.type === "circle" && (
              <ellipse cx={(shapePreview.x || 0) + (shapePreview.width || 0) / 2} cy={(shapePreview.y || 0) + (shapePreview.height || 0) / 2}
                rx={(shapePreview.width || 0) / 2} ry={(shapePreview.height || 0) / 2}
                fill="none" stroke={shapePreview.color} strokeWidth={2} strokeDasharray="5,5" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
