import React from "react";
import { useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { GradientBar } from "./GradientBar";
import { Subtitle } from "./Subtitle";
import {
  WIDTH,
  HEIGHT,
  BAR_HEIGHT,
  BG_HEIGHT,
  HALF_WIDTH,
  DYNAMIC_START,
  CREDITS_START_TIME,
  FPS,
} from "../utils/constants";
import type { Subtitle as SubtitleType } from "../utils/parseSrt";
import type { StaffMember } from "../Root";

interface ScrollingPhaseProps {
  staffMembers: StaffMember[];
  subtitles: SubtitleType[];
}

export const ScrollingPhase: React.FC<ScrollingPhaseProps> = ({
  staffMembers,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate the time within the scrolling phase
  const currentTime = DYNAMIC_START + frame / fps;

  // Calculate cycle length: each composite is 2 images side by side = WIDTH pixels
  // Number of composites = ceil(staffMembers.length / 2)
  const numComposites = Math.ceil(staffMembers.length / 2);
  const cycleLength = numComposites * WIDTH;

  // Dynamic duration (scrolling phase duration)
  const dynamicDuration = CREDITS_START_TIME - DYNAMIC_START;

  // Scroll speed: complete one cycle over the dynamic duration
  const scrollSpeed = cycleLength / dynamicDuration;

  // Current position in the scroll
  const tDynamic = frame / fps; // time since start of scrolling phase
  const pos = (scrollSpeed * tDynamic) % cycleLength;

  // Create composite pairs for rendering
  const composites: { left: StaffMember; right: StaffMember }[] = [];
  for (let i = 0; i < staffMembers.length; i += 2) {
    composites.push({
      left: staffMembers[i],
      right: staffMembers[i + 1] || staffMembers[i], // duplicate if odd number
    });
  }

  // Calculate which composites to show and the offset
  const currentIndex = Math.floor(pos / WIDTH);
  const offset = pos % WIDTH;

  // Get current and next composite (wrap around)
  const currentComposite = composites[currentIndex % composites.length];
  const nextComposite = composites[(currentIndex + 1) % composites.length];

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "black",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background area with scrolling images */}
      <div
        style={{
          position: "absolute",
          top: BAR_HEIGHT,
          left: 0,
          width: WIDTH,
          height: BG_HEIGHT,
          overflow: "hidden",
        }}
      >
        {/* Current composite */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: -offset,
            width: WIDTH,
            height: BG_HEIGHT,
            display: "flex",
          }}
        >
          <StaffImage src={currentComposite.left.image} name={currentComposite.left.name} />
          <StaffImage src={currentComposite.right.image} name={currentComposite.right.name} />
        </div>

        {/* Next composite */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: WIDTH - offset,
            width: WIDTH,
            height: BG_HEIGHT,
            display: "flex",
          }}
        >
          <StaffImage src={nextComposite.left.image} name={nextComposite.left.name} />
          <StaffImage src={nextComposite.right.image} name={nextComposite.right.name} />
        </div>
      </div>

      <GradientBar>
        <Subtitle subtitles={subtitles} time={currentTime} />
      </GradientBar>
    </div>
  );
};

interface StaffImageProps {
  src: string;
  name: string;
}

const StaffImage: React.FC<StaffImageProps> = ({ src, name }) => {
  return (
    <div
      style={{
        width: HALF_WIDTH,
        height: BG_HEIGHT,
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "black",
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          height: BG_HEIGHT,
          width: "auto",
          maxWidth: HALF_WIDTH,
          objectFit: "contain",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          padding: "4px 0",
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 18,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
};
