import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { GradientBar } from "./GradientBar";
import {
  WIDTH,
  HEIGHT,
  FPS,
  LOGO_FADE_IN_DURATION,
  WELCOME_TEXT,
} from "../utils/constants";

export const LogoPhase: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeInFrames = LOGO_FADE_IN_DURATION * FPS;

  const opacity = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "black",
        position: "relative",
      }}
    >
      <Img
        src={staticFile("logo.png")}
        style={{
          width: WIDTH,
          height: HEIGHT,
          objectFit: "cover",
          opacity,
        }}
      />
      <GradientBar>{WELCOME_TEXT}</GradientBar>
    </div>
  );
};
