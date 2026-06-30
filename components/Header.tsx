import BurgerMenu from "./BurgerMenu";

type HeaderProps = {
  onAddVod: () => void;
  onConnectWCL: () => void;
};

export default function Header({ onAddVod, onConnectWCL }: HeaderProps) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "80px",
        padding: "0 20px",
        borderBottom: "1px solid #444",
        background: "#06070a",
        overflow: "hidden",
      }}
    >
      <BurgerMenu onConnectWCL={onConnectWCL} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          height: "100%",
          minWidth: 0,
          padding: "0 8px",
        }}
      >
        <img
          src="/ckreviewv3.jpg"
          alt="Consistency Kings Raid Review"
          style={{
            display: "block",
            width: "100%",
            maxWidth: "1536px",
            height: "auto",
            objectFit: "fill",
            objectPosition: "center",
            background: "transparent",
          }}
        />
      </div>

      <div style={{ width: "120px", display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onAddVod}
          style={{
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "6px",
            padding: "10px 18px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Add VOD
        </button>
      </div>
    </header>
  );
}
