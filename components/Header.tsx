import BurgerMenu from "./BurgerMenu";
import BrandBanner from "./BrandBanner";

/** Header height in px; the banner artwork scales to fill it. */
const HEADER_H = 96;

type HeaderProps = {
  onAddVod:             () => void;
  onConnectWCL:         () => void;
  onConnectFFL:         () => void;
  onOpenReport:         () => void;
  onAddReviewToStatic:  () => void;
  onManageStatics:      () => void;
  onLogin:              () => void;
  onLogout:             () => void;
  currentUser:          { username: string; role: string } | null;
  hasActiveSession:     boolean;
};

export default function Header({
  onAddVod,
  onConnectWCL,
  onConnectFFL,
  onOpenReport,
  onAddReviewToStatic,
  onManageStatics,
  onLogin,
  onLogout,
  currentUser,
  hasActiveSession,
}: HeaderProps) {
  return (
    <header
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        height:         `${HEADER_H}px`,
        flexShrink:     0,
        padding:        "0 20px",
        background:     "#06070a",
        overflow:       "visible",   // was "hidden" — must be visible so the burger dropdown can escape
        position:       "relative",  // establishes stacking context above the grid below
        zIndex:         100,
      }}
    >
      {/* The heraldic band is the header's background: it spans edge to edge
          behind the controls rather than sitting as a boxed-in centre panel.
          See BrandBanner.tsx for the 1b/2a design. */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <BrandBanner height={HEADER_H} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        <BurgerMenu
          onConnectWCL={onConnectWCL}
          onConnectFFL={onConnectFFL}
          onOpenReport={onOpenReport}
          onAddReviewToStatic={onAddReviewToStatic}
          onManageStatics={onManageStatics}
          onLogin={onLogin}
          onLogout={onLogout}
          currentUser={currentUser}
          hasActiveSession={hasActiveSession}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "120px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onAddVod}
          style={{
            backgroundColor: "#2563eb",
            color:           "white",
            border:          "none",
            borderRadius:    "6px",
            padding:         "10px 18px",
            fontWeight:      "bold",
            cursor:          "pointer",
          }}
        >
          Add VOD
        </button>
      </div>
    </header>
  );
}
