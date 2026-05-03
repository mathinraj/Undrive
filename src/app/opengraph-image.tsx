import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Undrive — Hidden storage in your Google Drive";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #09090b 0%, #1a1a2e 50%, #09090b 100%)",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "32px",
                fontWeight: 700,
              }}
            >
              U
            </div>
            <span
              style={{
                fontSize: "56px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.03em",
              }}
            >
              Undrive
            </span>
          </div>

          <div
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.03em",
              display: "flex",
            }}
          >
            Your Drive,{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #7c3aed, #5b21b6)",
                backgroundClip: "text",
                color: "transparent",
                marginLeft: "16px",
              }}
            >
              unseen.
            </span>
          </div>

          <p
            style={{
              fontSize: "24px",
              color: "#a1a1aa",
              maxWidth: "700px",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Hidden file storage inside your own Google Drive.
            Invisible, private, and free.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "16px",
              padding: "12px 24px",
              borderRadius: "9999px",
              border: "1px solid #3f3f46",
              color: "#a1a1aa",
              fontSize: "18px",
            }}
          >
            undrive-app.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
