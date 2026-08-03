import type { CSSProperties } from "react";

/*
  Consistency Kings brand banner.

  Ported from the Claude Design project "Consistency Kings Logo":
  layout 1b ("Heraldic Centre" — symmetric crest flanked by the FFXIV
  crystal and WoW sigil) carrying mark 2a ("Regal tilt" — crown cocked
  off-axis, longer tapered bill, chest visible below the jaw).

  The design is authored at a fixed 1500x150; rather than re-deriving every
  offset for a fluid layout, the whole thing is laid out at that natural
  size and scaled with a transform, so the proportions stay exactly as
  drawn. `height` drives the scale.

  The band itself (gradient, gilt rules, weave) lives on the outer box and
  stretches to whatever width it's given — normally the full header — while
  only the artwork cluster is scaled and centred inside it.
*/

const DESIGN_W = 1500;
const DESIGN_H = 150;

/* The artwork cluster is centred inside the design width; keeping the full
   1500 here leaves slack at both ends so nothing clips if the title font
   falls back to a wider serif. */
const CLUSTER_W = DESIGN_W;

/* Scaling by height/DESIGN_H wastes the design's vertical padding: the
   tallest ink (the title column) is only ~120 of the 150. Scaling against
   that ink height instead renders the artwork ~25% larger in the same band,
   with the leftover slack clipped rather than drawn. */
const ART_H = 120;

/** The 2a duck mark: crown + head, no frame. Sized to fill its parent. */
function DuckMark() {
  return (
    <div
      style={{
        width:      "100%",
        height:     "100%",
        position:   "relative",
        background: "radial-gradient(120% 120% at 50% 28%, #2a1d12, #0d0a08 78%)",
      }}
    >
      {/* chest, tucked under the jaw so the mark reads as a portrait */}
      <div style={{ position: "absolute", left: "28%", top: "79%", width: "42%", height: "24%", borderRadius: "60% 60% 0 0", background: "linear-gradient(180deg, #eae0ce, #b3a690)" }} />
      {/* head */}
      <div style={{ position: "absolute", left: "19%", top: "35%", width: "54%", height: "54%", borderRadius: "50%", background: "linear-gradient(155deg, #ffffff 28%, #ece2d1 62%, #cbc0ac)" }} />
      {/* eye */}
      <div style={{ position: "absolute", left: "33%", top: "50%", width: "9%", height: "9%", borderRadius: "50%", background: "#17110e" }} />
      {/* bill */}
      <div style={{ position: "absolute", left: "66%", top: "56%", width: "29%", height: "13%", background: "linear-gradient(180deg, #ffd469, #dd9410)", clipPath: "polygon(0% 0%, 100% 36%, 100% 66%, 0% 100%)" }} />
      {/* crown, cocked off-axis */}
      <div style={{ position: "absolute", left: "17%", top: "4%", width: "58%", height: "25%", transform: "rotate(-8deg)" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "74%", display: "flex", alignItems: "flex-end", gap: "4%" }}>
          <div style={{ flex: 1, height: "74%",  background: "linear-gradient(180deg, #ffe9a8, #cd991f)", clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
          <div style={{ flex: 1, height: "100%", background: "linear-gradient(180deg, #fff6dc, #d29d21)", clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
          <div style={{ flex: 1, height: "74%",  background: "linear-gradient(180deg, #ffe9a8, #cd991f)", clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }} />
        </div>
        <div style={{ position: "absolute", left: "-3%", top: "72%", width: "106%", height: "26%", background: "linear-gradient(180deg, #fff3cf, #b9821c)" }} />
        <div style={{ position: "absolute", left: "42%", top: "66%", width: "16%", height: "38%", background: "linear-gradient(150deg, #ff8f6b, #c8231f)", clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" }} />
      </div>
    </div>
  );
}

const HEX = "polygon(50% 0%, 100% 22%, 100% 66%, 50% 100%, 0% 66%, 0% 22%)";

/** The mark inside its gilded hex frame. */
function Crest({ size }: { size: number }) {
  return (
    <div
      style={{
        width:    `${size}px`,
        height:   `${size}px`,
        flex:     "none",
        padding:  "3px",
        background: "linear-gradient(160deg, #ffe9a8, #c48f1c 60%, #6d4a0e)",
        clipPath: HEX,
      }}
    >
      <div style={{ width: "100%", height: "100%", overflow: "hidden", clipPath: HEX }}>
        <DuckMark />
      </div>
    </div>
  );
}

/** FFXIV aetheryte crystal. */
function CrystalSigil({ w, h }: { w: number; h: number }) {
  const layer: CSSProperties = { position: "absolute", inset: 0 };
  return (
    <div style={{ position: "relative", width: `${w}px`, height: `${h}px`, flex: "none", filter: "drop-shadow(0 0 10px rgba(90,170,255,0.45))" }}>
      <div style={{ ...layer, background: "linear-gradient(150deg, #bfe8ff, #3f8fdf 46%, #12305e)", clipPath: "polygon(50% 0%, 100% 30%, 82% 100%, 18% 100%, 0% 30%)" }} />
      <div style={{ ...layer, background: "rgba(8,26,54,0.5)", clipPath: "polygon(50% 0%, 50% 100%, 18% 100%, 0% 30%)" }} />
      <div style={{ ...layer, background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.06))", clipPath: "polygon(50% 5%, 63% 33%, 50% 95%, 37% 33%)" }} />
      <div style={{ position: "absolute", left: "6%", right: "6%", top: "30%", height: "1px", background: "rgba(196,232,255,0.55)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", background: "linear-gradient(180deg, rgba(150,215,255,0), rgba(170,225,255,0.5))", clipPath: "polygon(50% 0%, 100% 0%, 82% 100%, 18% 100%, 0% 0%)" }} />
    </div>
  );
}

/** WoW hex sigil. */
function WowSigil({ w, h }: { w: number; h: number }) {
  const hex = "polygon(50% 0%, 100% 26%, 100% 74%, 50% 100%, 0% 74%, 0% 26%)";
  return (
    <div style={{ position: "relative", width: `${w}px`, height: `${h}px`, flex: "none", filter: "drop-shadow(0 0 10px rgba(200,130,50,0.35))" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(150deg, #f0cba0, #a3671f 52%, #42250a)", clipPath: hex }} />
      <div style={{ position: "absolute", inset: "15%", background: "linear-gradient(160deg, #3d2309, #180d04)", clipPath: hex }} />
      <div style={{ position: "absolute", left: "47%", top: "25%", width: "6%", height: "50%", background: "#f6c98a" }} />
      <div style={{ position: "absolute", left: "24%", top: "33%", width: "26%", height: "6%", background: "#f6c98a", transform: "rotate(40deg)", transformOrigin: "right center" }} />
      <div style={{ position: "absolute", left: "50%", top: "52%", width: "26%", height: "6%", background: "#f6c98a", transform: "rotate(-40deg)", transformOrigin: "left center" }} />
    </div>
  );
}

const RULE_LEFT:  CSSProperties = { width: "170px", height: "1px", background: "linear-gradient(90deg, transparent, #6b5222)" };
const RULE_RIGHT: CSSProperties = { width: "170px", height: "1px", background: "linear-gradient(90deg, #6b5222, transparent)" };

type BrandBannerProps = {
  /** Rendered height in px; the 1500x150 artwork scales to match. */
  height?: number;
  title?: string;
};

export default function BrandBanner({ height = DESIGN_H, title = "Consistency Kings Raid Review" }: BrandBannerProps) {
  const scale = height / ART_H;
  /* scale() runs from the top-left corner, so the 150-tall design box lands
     taller than the band and its contents sit low; lift it by half the
     overhang to put the ink back on the band's centre line. */
  const lift = (DESIGN_H * scale - height) / 2;

  return (
    <div
      role="img"
      aria-label={title}
      style={{
        width:          "100%",
        height:         "100%",
        boxSizing:      "border-box",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        overflow:       "hidden",
        background:     "linear-gradient(180deg, #171310 0%, #0d0b09 100%)",
        borderTop:      "2px solid #a37a24",
        borderBottom:   "2px solid #a37a24",
        position:       "relative",
      }}
    >
      {/* faint diagonal weave over the whole band */}
      <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(135deg, rgba(242,193,78,0.05) 0 2px, transparent 2px 12px)", pointerEvents: "none" }} />

      {/* scaled footprint of the artwork cluster, so flex centring still works */}
      <div style={{ width: `${CLUSTER_W * scale}px`, height: `${height}px`, flex: "none", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            width:           `${CLUSTER_W}px`,
            height:          `${DESIGN_H}px`,
            boxSizing:       "border-box",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            gap:             "70px",
            transform:       `translateY(${-lift}px) scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "none" }}>
            <CrystalSigil w={28} h={40} />
            <WowSigil w={34} h={38} />
            <div style={RULE_LEFT} />
          </div>
  
          <div style={{ display: "flex", alignItems: "center", gap: "22px", flex: "none" }}>
            <Crest size={92} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <div style={{ width: "9px",  height: "9px",  background: "oklch(0.66 0.13 250)", transform: "rotate(45deg)" }} />
                <div style={{ width: "11px", height: "11px", background: "linear-gradient(150deg, #ff8f6b, #c8231f)", transform: "rotate(45deg)", boxShadow: "0 0 12px rgba(220,60,40,0.5)" }} />
                <div style={{ width: "9px",  height: "9px",  background: "oklch(0.66 0.13 150)", transform: "rotate(45deg)" }} />
              </div>
              <div
                style={{
                  fontFamily:         "var(--font-cinzel), serif",
                  fontWeight:         900,
                  fontSize:           "46px",
                  lineHeight:         0.95,
                  letterSpacing:      "0.055em",
                  background:         "linear-gradient(180deg, #fff6dc 0%, #f2c96a 48%, #b9821c 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip:     "text",
                  color:              "transparent",
                  whiteSpace:         "nowrap",
                }}
              >
                CONSISTENCY KINGS
              </div>
              <div style={{ fontFamily: "var(--font-cinzel), serif", fontWeight: 600, fontSize: "16px", letterSpacing: "0.55em", color: "#c9b58c", paddingLeft: "0.55em", whiteSpace: "nowrap" }}>
                RAID REVIEW
              </div>
            </div>
          </div>
  
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: "none" }}>
            <div style={RULE_RIGHT} />
            <WowSigil w={34} h={38} />
            <CrystalSigil w={28} h={40} />
          </div>
        </div>
      </div>
    </div>
  );
}
