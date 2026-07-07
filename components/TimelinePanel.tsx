"use client";

import { useEffect, useRef, useState } from "react";

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
  const [isDragging, setIsDragging] = useState(false);
  const [previewTime, setPreviewTime] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const percent = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const displayPercent = isDragging && previewTime !== null && duration > 0
    ? Math.min(previewTime / duration, 1)
    : percent;
  const displayTime = isDragging && previewTime !== null ? previewTime : currentTime;

  useEffect(() => {
    if (!isDragging) return;

    function updateFromClientX(clientX: number) {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const nextPercent = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1));
      setPreviewTime(nextPercent * duration);
    }

    function handleMove(event: MouseEvent) {
      updateFromClientX(event.clientX);
    }

    function handleUp(event: MouseEvent) {
      updateFromClientX(event.clientX);
      setIsDragging(false);
      setPreviewTime(null);
      if (trackRef.current) {
        const rect = trackRef.current.getBoundingClientRect();
        const nextPercent = Math.max(0, Math.min((event.clientX - rect.left) / rect.width, 1));
        onSeek(nextPercent);
      }
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [duration, isDragging, onSeek]);

  function beginDrag(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
    setPreviewTime(currentTime);
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const nextPercent = Math.max(0, Math.min((event.clientX - rect.left) / rect.width, 1));
      setPreviewTime(nextPercent * duration);
    }
  }

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
        <span>{formatTime(displayTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Scrub bar */}
      <div
        ref={trackRef}
        style={{ position: "relative", height: "12px", cursor: "pointer" }}
        onMouseDown={beginDrag}
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
            width:        `${displayPercent * 100}%`,
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
            left:         `calc(${displayPercent * 100}% - 6px)`,
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
