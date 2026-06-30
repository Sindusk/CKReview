"use client";

type TimelinePanelProps = {
  currentTime: number;   // seconds into pull
  duration:    number;   // seconds
  onSeek:      (percent: number) => void;
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TimelinePanel({
  currentTime,
  duration,
  onSeek,
}: TimelinePanelProps) {
  const percent = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <div
      style={{
        padding:     "10px",
        background:  "#181818",
        borderTop:   "1px solid #333",
      }}
    >
      {/* Time labels */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          fontSize:       "12px",
          color:          "#bbb",
          marginBottom:   "6px",
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Scrub bar */}
      <div
        style={{ position: "relative", height: "12px", cursor: "pointer" }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onSeek((e.clientX - rect.left) / rect.width);
        }}
      >
        {/* Track */}
        <div
          style={{
            position:     "absolute",
            left: 0, right: 0,
            top:          "50%",
            height:       "4px",
            transform:    "translateY(-50%)",
            background:   "#444",
            borderRadius: "999px",
          }}
        />
        {/* Fill */}
        <div
          style={{
            position:     "absolute",
            left: 0,
            top:          "50%",
            width:        `${percent * 100}%`,
            height:       "4px",
            transform:    "translateY(-50%)",
            background:   "#3b82f6",
            borderRadius: "999px",
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position:     "absolute",
            left:         `calc(${percent * 100}% - 6px)`,
            top:          "50%",
            width:        "12px",
            height:       "12px",
            transform:    "translateY(-50%)",
            borderRadius: "50%",
            background:   "#60a5fa",
            border:       "2px solid white",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
