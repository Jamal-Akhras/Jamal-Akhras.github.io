import { useState, useEffect } from "react";

export function useMousePosition(enabled = true) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled) return;

    let frameId: number | null = null;
    let nextPosition = { x: 0, y: 0 };

    const handler = (e: MouseEvent) => {
      nextPosition = { x: e.clientX, y: e.clientY };
      if (frameId === null) {
        frameId = requestAnimationFrame(() => {
          setPosition(nextPosition);
          frameId = null;
        });
      }
    };

    window.addEventListener("mousemove", handler);
    return () => {
      window.removeEventListener("mousemove", handler);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [enabled]);

  return position;
}
