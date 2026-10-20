import { ImageResponse } from "next/og";

export const alt = "Decreta: escrow that releases when a federal court docket closes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette from IDENTITY.md (D6 fieldbook). ImageResponse cannot read CSS variables.
const PAPER = "#f5f2e6";
const PAPER_2 = "#ebe7d4";
const RULE = "#cfc9b4";
const INK = "#26311f";
const RUST = "#b4552d";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: "72px 88px",
          borderLeft: `28px solid ${PAPER_2}`,
          fontFamily: "serif",
          color: INK,
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: RUST }}>
          Settlement escrow, bound to the docket
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 132, fontWeight: 700, lineHeight: 1 }}>Decreta</div>
          <div style={{ marginTop: 28, fontSize: 38, lineHeight: 1.3, maxWidth: 900 }}>
            Funds that release by themselves when a US federal court docket closes, checked by a Chainlink CRE workflow.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${RULE}`, paddingTop: 24 }}>
          <div style={{ fontSize: 26 }}>The court decides. The money follows.</div>
          <div
            style={{
              display: "flex",
              border: `4px solid ${RUST}`,
              color: RUST,
              padding: "8px 22px",
              fontSize: 30,
              letterSpacing: 8,
              transform: "rotate(-4deg)",
            }}
          >
            TERMINATED
          </div>
        </div>
      </div>
    ),
    size
  );
}
