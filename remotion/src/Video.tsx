import React from "react";
import { Sequence, Audio, staticFile } from "remotion";
import { LogoPhase } from "./components/LogoPhase";
import { TransitionPhase } from "./components/TransitionPhase";
import { ScrollingPhase } from "./components/ScrollingPhase";
import { CreditsPhase } from "./components/CreditsPhase";
import {
  STATIC_FRAMES,
  TRANSITION_FRAMES,
  DYNAMIC_START_FRAME,
  CREDITS_START_FRAME,
  secondsToFrames,
} from "./utils/constants";
import type { Subtitle } from "./utils/parseSrt";

export interface VideoProps {
  totalDurationInFrames: number;
  staffImages: string[];
  subtitles: Subtitle[];
  audioFile?: string;
}

export const Video: React.FC<VideoProps> = ({
  totalDurationInFrames,
  staffImages,
  subtitles,
  audioFile,
}) => {
  const scrollingDurationFrames = CREDITS_START_FRAME - DYNAMIC_START_FRAME;
  const creditsDurationFrames = totalDurationInFrames - CREDITS_START_FRAME;

  return (
    <>
      {/* Static logo phase: 0 - 6.5 seconds */}
      <Sequence from={0} durationInFrames={STATIC_FRAMES}>
        <LogoPhase />
      </Sequence>

      {/* Transition phase: 6.5 - 10 seconds */}
      <Sequence from={STATIC_FRAMES} durationInFrames={TRANSITION_FRAMES}>
        <TransitionPhase staffImages={staffImages} subtitles={subtitles} />
      </Sequence>

      {/* Scrolling phase: 10 - 86 seconds */}
      <Sequence from={DYNAMIC_START_FRAME} durationInFrames={scrollingDurationFrames}>
        <ScrollingPhase staffImages={staffImages} subtitles={subtitles} />
      </Sequence>

      {/* Credits phase: 86 seconds onwards */}
      <Sequence from={CREDITS_START_FRAME} durationInFrames={creditsDurationFrames}>
        <CreditsPhase />
      </Sequence>

      {/* Audio track */}
      {audioFile && <Audio src={staticFile(audioFile)} />}
    </>
  );
};
