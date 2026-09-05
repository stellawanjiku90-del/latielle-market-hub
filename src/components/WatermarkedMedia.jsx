import { cn } from "@/lib/utils";

const WATERMARK_TEXT = "LATIELLE MARKET HUB";

/**
 * Wraps an image or video with a diagonal repeating watermark overlay.
 * Usage:
 *   <WatermarkedMedia src="..." type="image" className="w-full h-full object-cover" />
 *   <WatermarkedMedia src="..." type="video" className="w-full rounded-xl" controls />
 */
export default function WatermarkedMedia({ src, type = "image", className, alt = "", ...props }) {
  return (
    <div className="relative overflow-hidden w-full h-full select-none">
      {type === "video" ? (
        <video
          src={src}
          className={cn("w-full", className)}
          {...props}
        />
      ) : (
        <img
          src={src}
          alt={alt}
          className={cn("w-full h-full object-cover", className)}
          {...props}
        />
      )}

      {/* Watermark overlay — pointer-events-none so it doesn't block controls */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 2 }}
      >
        {/* Diagonal repeating watermark using CSS background pattern */}
        <div
          style={{
            position: "absolute",
            inset: "-50%",
            width: "200%",
            height: "200%",
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 60px,
              rgba(255,255,255,0.0) 60px,
              rgba(255,255,255,0.0) 120px
            )`,
          }}
        />
        {/* SVG-based tiled watermark text */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          style={{ position: "absolute", inset: 0 }}
        >
          <defs>
            <pattern id="wm-pattern" x="0" y="0" width="280" height="150" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
              <text
                x="10"
                y="60"
                fontFamily="'Inter', sans-serif"
                fontSize="11"
                fontWeight="700"
                letterSpacing="2"
                fill="rgba(255,255,255,0.24)"
                stroke="rgba(0,0,0,0.06)"
                strokeWidth="0.5"
              >
                {WATERMARK_TEXT}
              </text>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#wm-pattern)" />
        </svg>
      </div>
    </div>
  );
}