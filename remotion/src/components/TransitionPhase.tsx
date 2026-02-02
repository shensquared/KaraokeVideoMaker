import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { GradientBar } from "./GradientBar";
import { Subtitle } from "./Subtitle";
import {
  WIDTH,
  HEIGHT,
  BAR_HEIGHT,
  BG_HEIGHT,
  HALF_WIDTH,
  FPS,
  TRANSITION_DURATION,
  STATIC_DURATION,
  WELCOME_TEXT,
} from "../utils/constants";
import type { Subtitle as SubtitleType } from "../utils/parseSrt";
import type { StaffMember } from "../Root";

interface TransitionPhaseProps {
  staffMembers: StaffMember[];
  subtitles: SubtitleType[];
}

export const TransitionPhase: React.FC<TransitionPhaseProps> = ({
  staffMembers,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const transitionFrames = TRANSITION_DURATION * FPS;

  // Blend factor: 0 = fully logo, 1 = fully dynamic
  const blendFactor = interpolate(frame, [0, transitionFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  const currentTime = STATIC_DURATION + frame / FPS;
  const subtitleText = subtitles.find(
    (s) => currentTime >= s.start && currentTime < s.end
  )?.text;

  // First two staff members for initial dynamic frame
  const firstImage = staffMembers[0]?.image || "";
  const secondImage = staffMembers[1]?.image || staffMembers[0]?.image || "";

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "black",
        position: "relative",
      }}
    >
      {/* Logo layer (fades out) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: WIDTH,
          height: HEIGHT,
          opacity: 1 - blendFactor,
        }}
      >
        <Img
          src={staticFile("logo.png")}
          style={{
            width: WIDTH,
            height: HEIGHT,
            objectFit: "cover",
          }}
        />
      </div>

      {/* Dynamic layer (fades in) */}
      <div
        style={{
          position: "absolute",
          top: BAR_HEIGHT,
          left: 0,
          width: WIDTH,
          height: BG_HEIGHT,
          opacity: blendFactor,
          display: "flex",
        }}
      >
        <div
          style={{
            width: HALF_WIDTH,
            height: BG_HEIGHT,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "black",
          }}
        >
          <Img
            src={staticFile(firstImage)}
            style={{
              height: BG_HEIGHT,
              width: "auto",
              maxWidth: HALF_WIDTH,
              objectFit: "contain",
            }}
          />
        </div>
        <div
          style={{
            width: HALF_WIDTH,
            height: BG_HEIGHT,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "black",
          }}
        >
          <Img
            src={staticFile(secondImage)}
            style={{
              height: BG_HEIGHT,
              width: "auto",
              maxWidth: HALF_WIDTH,
              objectFit: "contain",
            }}
          />
        </div>
      </div>

      {/* Gradient bar with cross-fading text */}
      <GradientBar>
        <span
          style={{
            position: "relative",
            display: "inline-block",
          }}
        >
          {/* Welcome text (fades out) */}
          <span style={{ opacity: 1 - blendFactor }}>{WELCOME_TEXT}</span>
          {/* Subtitle (fades in) */}
          {subtitleText && (
            <span
              style={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                opacity: blendFactor,
                whiteSpace: "nowrap",
              }}
            >
              {subtitleText}
            </span>
          )}
        </span>
      </GradientBar>
    </div>
  );
};
