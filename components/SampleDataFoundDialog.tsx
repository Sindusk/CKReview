"use client";

type SampleDataFoundDialogProps = {
  open:          boolean;
  reportCode:    string;
  fightCount:    number;
  onUseSample:   () => void;
  onFetchLive:   () => void;
};

export default function SampleDataFoundDialog({
  open,
  reportCode,
  fightCount,
  onUseSample,
  onFetchLive,
}: SampleDataFoundDialogProps) {
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
          Local Sample Data Found
        </h2>

        <p style={{ fontSize: "13px", color: "#ccc", lineHeight: 1.5, marginBottom: "18px" }}>
          Report <strong>{reportCode}</strong> was already fetched to disk ({fightCount} fight{fightCount === 1 ? "" : "s"}).
          Load it from local sample data instead of the live API? This won't spend any rate-limit points.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onFetchLive}
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
            Fetch Live Instead
          </button>
          <button
            onClick={onUseSample}
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
            Load From Sample Data
          </button>
        </div>
      </div>
    </div>
  );
}
