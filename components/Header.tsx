import BurgerMenu from "./BurgerMenu";

type HeaderProps = {
  onAddVod:     () => void;
  onConnectWCL: () => void;
  onConnectFFL: () => void;
  onOpenReport: () => void;
};

export default function Header({ onAddVod, onConnectWCL, onConnectFFL, onOpenReport }: HeaderProps) {
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
      <BurgerMenu onConnectWCL={onConnectWCL} onConnectFFL={onConnectFFL} onOpenReport={onOpenReport} />

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
        <img
          src="/ckreviewv9.png"
          alt="Consistency Kings Raid Review"
          style={{
            display:        "block",
            width:          "100%",
            maxWidth:       "1536px",
            height:         "auto",
            maxHeight:      "100%",
            objectFit:      "scale-down",
            objectPosition: "center",
            background:     "transparent",
          }}
        />
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
