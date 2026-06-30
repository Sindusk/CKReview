"use client";

type Perspective = "Tank" | "Healer" | "DPS";

type PerspectiveTabsProps = {
  value: Perspective;
  onChange: (value: Perspective) => void;
};

export default function PerspectiveTabs({
  value,
  onChange,
}: PerspectiveTabsProps) {
  const tabs: Perspective[] = ["Tank", "Healer", "DPS"];

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        padding: "8px",
        borderBottom: "1px solid #333",
        backgroundColor: "#1a1a1a",
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const active = tab === value;

        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: active ? "1px solid #3b82f6" : "1px solid #333",
              backgroundColor: active ? "#1e293b" : "#111",
              color: "white",
              cursor: "pointer",
              fontWeight: active ? "bold" : "normal",
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}