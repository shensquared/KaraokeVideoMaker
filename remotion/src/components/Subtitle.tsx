import React from "react";
import { FONT_SIZE } from "../utils/constants";
import { getSubtitleAtTime, Subtitle as SubtitleType } from "../utils/parseSrt";

interface SubtitleProps {
  subtitles: SubtitleType[];
  time: number; // current time in seconds
}

export const Subtitle: React.FC<SubtitleProps> = ({ subtitles, time }) => {
  const text = getSubtitleAtTime(subtitles, time);

  if (!text) {
    return null;
  }

  return (
    <span
      style={{
        color: "white",
        fontSize: FONT_SIZE,
        fontFamily: "sans-serif",
        textAlign: "center",
      }}
    >
      {text}
    </span>
  );
};
