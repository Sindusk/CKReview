"use client";

type SessionFoundDialogProps = {
  open:           boolean;
  vodCount:       number;
  wipeCount:      number;
  onLoad:         () => void;
  onImportFresh:  () => void;
};

export default function SessionFoundDialog({
  open,
  vodCount,
  wipeCount,
  onLoad,
  onImportFresh,
}: SessionFoundDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#222",
          padding: "24px",
          borderRadius: "10px",
          width: "440px",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "10px", fontSize: "18px" }}>
          Session Found
        </h2>

        <p style={{ fontSize: "13px", color: "#ccc", lineHeight: 1.5, marginBottom: "18px" }}>
          A saved session already exists for this log
          {vodCount > 0 && <> with {vodCount} VOD{vodCount === 1 ? "" : "s"}</>}
          {wipeCount > 0 && <> and {wipeCount} wipe call{wipeCount === 1 ? "" : "s"}</>}.
          Would you like to load it instead of starting a new one?
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onImportFresh}
            style={{
              backgroundColor: "#2f2f2f",
              color: "#f3f4f6",
              border: "1px solid #555",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Import Fresh
          </button>
          <button
            onClick={onLoad}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Load Session
          </button>
        </div>
      </div>
    </div>
  );
}