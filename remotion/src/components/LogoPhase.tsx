import React from "react";
import { useCurrentFrame, interpolate, Img, staticFile } from "remotion";
import { GradientBar } from "./GradientBar";
import {
  WIDTH,
  HEIGHT,
  BAR_HEIGHT,
  BG_HEIGHT,
  FPS,
  LOGO_FADE_IN_DURATION,
  WELCOME_TEXT,
} from "../utils/constants";
import type { AnimationStyle } from "./ScrollingPhase";
import beatTimestamps from "../utils/beats.json";

const phaseBeats = beatTimestamps as number[];

interface LogoPhaseProps {
  animationStyle?: AnimationStyle;
}

// Same seeded random as polaroid
const seedRandom = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Beat bob for logo cards (same logic as polaroid phase)
const getLogoBob = (tAbsolute: number, cardIndex: number): number => {
  let lastBeat = -Infinity;
  for (let i = phaseBeats.length - 1; i >= 0; i--) {
    if (phaseBeats[i] <= tAbsolute) {
      lastBeat = phaseBeats[i];
      break;
    }
  }
  const elapsed = tAbsolute - lastBeat;
  const bobDuration = 0.45;
  if (elapsed > bobDuration) return 0;
  const progress = elapsed / bobDuration;
  const decay = 1 - progress * progress;
  const direction = ((cardIndex % 3) - 1) || (cardIndex % 2 === 0 ? 1 : -1);
  return Math.sin(progress * Math.PI) * decay * 6 * direction;
};

const NUM_LOGO_CARDS = 20;
const LOGO_SIZE = 140;

// Pre-compute card positions/rotations
const logoCards = Array.from({ length: NUM_LOGO_CARDS }, (_, i) => {
  const r1 = seedRandom(i * 3 + 500);
  const r2 = seedRandom(i * 3 + 501);
  const r3 = seedRandom(i * 3 + 502);
  return {
    x: 10 + r1 * (WIDTH - LOGO_SIZE - 20),
    y: 5 + r2 * (BG_HEIGHT - LOGO_SIZE - 10),
    baseRotation: (r3 - 0.5) * 30,
  };
});

export const LogoPhase: React.FC<LogoPhaseProps> = ({
  animationStyle = "scroll",
}) => {
  const frame = useCurrentFrame();
  const fadeInFrames = LOGO_FADE_IN_DURATION * FPS;
  const tAbsolute = frame / FPS;

  const opacity = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (animationStyle === "polaroid") {
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
          {logoCards.map((card, i) => {
            const bob = getLogoBob(tAbsolute, i);

            return (
              <Img
                key={i}
                src={staticFile("logo.png")}
                style={{
                  position: "absolute",
                  left: card.x,
                  top: card.y,
                  width: LOGO_SIZE,
                  height: LOGO_SIZE,
                  objectFit: "contain",
                  transform: `rotate(${card.baseRotation + bob}deg)`,
                  zIndex: i,
                }}
              />
            );
          })}
        </div>
        <GradientBar>{WELCOME_TEXT}</GradientBar>
      </div>
    );
  }

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
