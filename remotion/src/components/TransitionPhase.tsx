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
import type { AnimationStyle } from "./ScrollingPhase";
import beatTimestamps from "../utils/beats.json";

const phaseBeats = beatTimestamps as number[];

const seedRandom = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

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

// Same logo cards as LogoPhase (same seeds so positions match)
const NUM_LOGO_CARDS = 20;
const LOGO_SIZE = 140;
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

interface TransitionPhaseProps {
  staffMembers: StaffMember[];
  subtitles: SubtitleType[];
  animationStyle?: AnimationStyle;
}

export const TransitionPhase: React.FC<TransitionPhaseProps> = ({
  staffMembers,
  subtitles,
  animationStyle = "scroll",
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

  if (animationStyle === "polaroid") {
    // Keep bobbing logo cards the whole time — no staff card here.
    // Staff scatter starts immediately at 10s in ScrollingPhase.
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
            const bob = getLogoBob(currentTime, i);
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

        <GradientBar>
          <span style={{ position: "relative", display: "inline-block" }}>
            <span style={{ opacity: 1 - blendFactor }}>{WELCOME_TEXT}</span>
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
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {animationStyle === "kenburns" ? (
          <Img
            src={staticFile(firstImage)}
            style={{
              width: WIDTH,
              height: BG_HEIGHT,
              objectFit: "cover",
            }}
          />
        ) : animationStyle === "grid" ? (
          <Img
            src={staticFile(firstImage)}
            style={{
              width: Math.min(WIDTH / 7 - 16, BG_HEIGHT / 4 - 40),
              height: Math.min(WIDTH / 7 - 16, BG_HEIGHT / 4 - 40),
              objectFit: "cover",
              borderRadius: 6,
            }}
          />
        ) : (
          <>
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
          </>
        )}
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
