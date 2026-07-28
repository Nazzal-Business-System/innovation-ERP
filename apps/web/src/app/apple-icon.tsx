import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Apple touch icon — indigo hexagon + I mark (matches icon.svg). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none">
          <path fill="#6366f1" d="M16 1.5 28.5 8.5v15L16 30.5 3.5 23.5v-15L16 1.5Z" />
          <path
            fill="#818cf8"
            fillOpacity="0.35"
            d="M16 1.5 28.5 8.5v1.2L16 3.9 3.5 9.7V8.5L16 1.5Z"
          />
          <rect x="14.2" y="8.5" width="3.6" height="15" rx="1.2" fill="#ffffff" />
          <rect x="12.4" y="8.5" width="7.2" height="3.2" rx="1.2" fill="#ffffff" />
          <rect x="12.4" y="20.3" width="7.2" height="3.2" rx="1.2" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
