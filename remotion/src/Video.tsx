import React from "react";
import { Sequence, Audio, staticFile } from "remotion";
import { LogoPhase } from "./components/LogoPhase";
import { TransitionPhase } from "./components/TransitionPhase";
import { ScrollingPhase, AnimationStyle } from "./components/ScrollingPhase";
import {
  STATIC_FRAMES,
  TRANSITION_FRAMES,
  DYNAMIC_START_FRAME,
} from "./utils/constants";
import type { Subtitle } from "./utils/parseSrt";
import type { StaffMember } from "./Root";

export interface VideoProps {
  totalDurationInFrames: number;
  staffMembers: StaffMember[];
  subtitles: Subtitle[];
  audioFile?: string;
  animationStyle?: AnimationStyle;
}

export const Video: React.FC<VideoProps> = ({
  totalDurationInFrames,
  staffMembers,
  subtitles,
  audioFile,
  animationStyle = "scroll",
}) => {
  const scrollingDurationFrames = totalDurationInFrames - DYNAMIC_START_FRAME;

  return (
    <>
      {/* Static logo phase: 0 - 6.5 seconds */}
      <Sequence from={0} durationInFrames={STATIC_FRAMES}>
        <LogoPhase animationStyle={animationStyle} />
      </Sequence>

      {/* Transition phase: 6.5 - 10 seconds */}
      <Sequence from={STATIC_FRAMES} durationInFrames={TRANSITION_FRAMES}>
        <TransitionPhase staffMembers={staffMembers} subtitles={subtitles} animationStyle={animationStyle} />
      </Sequence>

      {/* Staff photos phase: 10 seconds to end */}
      <Sequence from={DYNAMIC_START_FRAME} durationInFrames={scrollingDurationFrames}>
        <ScrollingPhase staffMembers={staffMembers} subtitles={subtitles} animationStyle={animationStyle} />
      </Sequence>

      {/* Audio track */}
      {audioFile && <Audio src={staticFile(audioFile)} />}
    </>
  );
};
