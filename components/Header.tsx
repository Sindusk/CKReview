import BurgerMenu from "./BurgerMenu";
import BrandBanner from "./BrandBanner";

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
        height:         "80px",
        padding:        "0 20px",
        borderBottom:   "1px solid #444",
        background:     "#06070a",
        overflow:       "visible",   // was "hidden" — must be visible so the burger dropdown can escape
        position:       "relative",  // establishes stacking context above the grid below
        zIndex:         100,
      }}
    >
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

      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          flex:           1,
          height:         "100%",
          minWidth:       0,
          padding:        "0 8px",
        }}
      >
        {/* 1b heraldic banner carrying the 2a duck mark — see BrandBanner.tsx.
            72px leaves a little breathing room inside the 80px header. */}
        <BrandBanner height={72} />
      </div>

      <div style={{ width: "120px", display: "flex", justifyContent: "flex-end" }}>
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
