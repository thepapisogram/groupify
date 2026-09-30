import { ImageResponse } from "next/og";
import appMeta from "@/data/metadata";

export const alt = `${appMeta.app.name} - ${appMeta.app.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generated at request time so there's no image asset to keep in sync with the copy.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(135deg, #07090f 0%, #0b2a2f 100%)",
          color: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "#22d3ee",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 800,
              color: "#07090f",
            }}
          >
            G
          </div>
          <div style={{ fontSize: 44, fontWeight: 800 }}>{appMeta.app.name}</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 84, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>
          {appMeta.app.tagline}
        </div>
        <div style={{ marginTop: 32, fontSize: 34, color: "#94a3b8", maxWidth: 900 }}>
          Balanced groups for classrooms, workshops and teams. Free, no account needed.
        </div>
      </div>
    ),
    size,
  );
}
