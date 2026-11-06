import { ImageResponse } from "next/og";

// Shared card for every route (file-based metadata is inherited by child
// segments). Colours match the site's dark theme and the logo's own spark.
export const alt = "Twin Lanterns — Field operations for real-world data";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px 88px",
          background: "radial-gradient(circle at 78% 30%, #2a1c08 0%, #050607 55%)",
          color: "#f2f3f5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="60" height="54" viewBox="0 0 40 36" fill="none">
            <path d="M3 2.5 15.4 8v20L3 33.5V2.5Z" fill="#f2f3f5" />
            <path d="M37 2.5 24.6 8v20L37 33.5V2.5Z" fill="#f2f3f5" />
            <path
              d="M20 7.5c.9 5.9 2.1 7.6 8 8.5-5.9.9-7.1 2.6-8 8.5-.9-5.9-2.1-7.6-8-8.5 5.9-.9 7.1-2.6 8-8.5Z"
              fill="#ff5a18"
            />
          </svg>
          <div style={{ fontSize: 24, letterSpacing: "0.4em" }}>TWIN LANTERNS</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 76, lineHeight: 1.04, letterSpacing: "-0.04em", maxWidth: 900 }}>
            We run the field work behind real-world data.
          </div>
          <div style={{ fontSize: 30, color: "#9aa0a8", maxWidth: 1040 }}>
            Egocentric video, in-home video and speech for AI and robotics teams.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
