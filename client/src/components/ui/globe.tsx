import { useEffect, useRef } from "react";
import createGlobe, { COBEOptions } from "cobe";
import { cn } from "@/lib/utils";

const MAKKAH_PHI = Math.PI - ((39.8262 + 180) * Math.PI) / 180;
const MAKKAH_THETA = ((21.4225 - 90) * Math.PI) / 180;

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: MAKKAH_PHI,
  theta: MAKKAH_THETA * 0.6,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [13 / 255, 148 / 255, 136 / 255],
  glowColor: [0.95, 0.98, 1],
  markers: [
    { location: [21.4225, 39.8262], size: 0.12 },
    { location: [24.7136, 46.6753], size: 0.06 },
    { location: [21.5428, 39.1728], size: 0.04 },
    { location: [25.2048, 55.2708], size: 0.05 },
    { location: [29.3759, 47.9774], size: 0.04 },
    { location: [33.8938, 35.5018], size: 0.03 },
    { location: [31.9454, 35.9284], size: 0.03 },
    { location: [30.0444, 31.2357], size: 0.06 },
    { location: [36.2021, 37.1343], size: 0.03 },
    { location: [41.0082, 28.9784], size: 0.05 },
    { location: [33.3152, 44.3661], size: 0.04 },
    { location: [35.6762, 51.4241], size: 0.05 },
    { location: [23.8103, 90.4125], size: 0.04 },
    { location: [3.1390, 101.6869], size: 0.05 },
    { location: [-6.2088, 106.8456], size: 0.06 },
    { location: [19.076, 72.8777], size: 0.05 },
    { location: [39.9042, 116.4074], size: 0.04 },
    { location: [51.5074, -0.1278], size: 0.04 },
    { location: [40.7128, -74.006], size: 0.04 },
  ],
};

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(MAKKAH_PHI);
  const rRef = useRef(0);
  const widthRef = useRef(0);

  useEffect(() => {
    const onResize = () => {
      if (canvasRef.current) {
        widthRef.current = canvasRef.current.offsetWidth;
      }
    };

    window.addEventListener("resize", onResize);
    onResize();

    if (!canvasRef.current) return;

    let globe: ReturnType<typeof createGlobe> | null = null;
    try {
      globe = createGlobe(canvasRef.current, {
        ...config,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
        onRender: (state) => {
          if (pointerInteracting.current === null) {
            phiRef.current += 0.005;
          }
          state.phi = phiRef.current + rRef.current;
          state.width = widthRef.current * 2;
          state.height = widthRef.current * 2;
        },
      });

      setTimeout(() => {
        if (canvasRef.current) canvasRef.current.style.opacity = "1";
      });
    } catch {
      // WebGL not available - gracefully degrade
    }

    return () => {
      globe?.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab";
    }
  };

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current;
      pointerInteractionMovement.current = delta;
      rRef.current = delta / 200;
    }
  };

  return (
    <div
      className={cn(
        "absolute inset-0 mx-auto aspect-[1/1] w-full max-w-[600px]",
        className,
      )}
    >
      <canvas
        className={cn(
          "size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]",
        )}
        ref={canvasRef}
        onPointerDown={(e) =>
          updatePointerInteraction(
            e.clientX - pointerInteractionMovement.current,
          )
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) =>
          e.touches[0] && updateMovement(e.touches[0].clientX)
        }
      />
    </div>
  );
}
