import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  Img,
  staticFile,
  interpolate,
  spring,
} from "remotion";
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
import beatTimestamps from "../utils/beats.json";

export type AnimationStyle = "scroll" | "kenburns" | "polaroid" | "grid";

// Beat timestamps are absolute (from start of audio).
// The scrolling phase starts at DYNAMIC_START, so we offset them.
const phaseBeats = (beatTimestamps as number[])
  .map((t) => t - DYNAMIC_START)
  .filter((t) => t >= 0);

/**
 * Returns a bobbing rotation (degrees) that decays after the nearest beat.
 * Each card gets a random direction so they don't all tilt the same way.
 */
const getBeatBob = (tDynamic: number, cardIndex: number): number => {
  // Find the most recent beat
  let lastBeat = -Infinity;
  for (let i = phaseBeats.length - 1; i >= 0; i--) {
    if (phaseBeats[i] <= tDynamic) {
      lastBeat = phaseBeats[i];
      break;
    }
  }

  const elapsed = tDynamic - lastBeat;
  const bobDuration = 0.45; // how long the bob lasts
  if (elapsed > bobDuration) return 0;

  // Smooth decay
  const progress = elapsed / bobDuration;
  const decay = 1 - progress * progress; // quadratic ease-out

  // Direction: alternating sign per card, with some variation
  const direction = ((cardIndex % 3) - 1) || (cardIndex % 2 === 0 ? 1 : -1);
  const maxAngle = 6; // peak rotation in degrees

  // Single smooth tilt and return (half sine)
  const bob = Math.sin(progress * Math.PI) * decay * maxAngle * direction;

  return bob;
};

interface ScrollingPhaseProps {
  staffMembers: StaffMember[];
  subtitles: SubtitleType[];
  animationStyle?: AnimationStyle;
}

export const ScrollingPhase: React.FC<ScrollingPhaseProps> = ({
  staffMembers,
  subtitles,
  animationStyle = "scroll",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = DYNAMIC_START + frame / fps;

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
        {animationStyle === "scroll" && (
          <ScrollAnimation staffMembers={staffMembers} />
        )}
        {animationStyle === "kenburns" && (
          <KenBurnsAnimation staffMembers={staffMembers} />
        )}
        {animationStyle === "polaroid" && (
          <PolaroidAnimation staffMembers={staffMembers} />
        )}
        {animationStyle === "grid" && (
          <GridAnimation staffMembers={staffMembers} />
        )}
      </div>

      <GradientBar>
        <Subtitle subtitles={subtitles} time={currentTime} />
      </GradientBar>
    </div>
  );
};

// --- Shared components ---

interface NameLabelProps {
  name: string;
  style?: React.CSSProperties;
}

const NameLabel: React.FC<NameLabelProps> = ({ name, style }) => (
  <div
    style={{
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      padding: "6px 0",
      textAlign: "center",
      ...style,
    }}
  >
    <span
      style={{
        color: "white",
        fontSize: 24,
        fontWeight: "bold",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {name}
    </span>
  </div>
);

// --- Style A: Horizontal Scroll (original) ---

const ScrollAnimation: React.FC<{ staffMembers: StaffMember[] }> = ({
  staffMembers,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const numComposites = Math.ceil(staffMembers.length / 2);
  const cycleLength = numComposites * WIDTH;
  const dynamicDuration = CREDITS_START_TIME - DYNAMIC_START;
  const scrollSpeed = cycleLength / dynamicDuration;
  const tDynamic = frame / fps;
  const pos = (scrollSpeed * tDynamic) % cycleLength;

  const composites: { left: StaffMember; right: StaffMember }[] = [];
  for (let i = 0; i < staffMembers.length; i += 2) {
    composites.push({
      left: staffMembers[i],
      right: staffMembers[i + 1] || staffMembers[i],
    });
  }

  const currentIndex = Math.floor(pos / WIDTH);
  const offset = pos % WIDTH;
  const currentComposite = composites[currentIndex % composites.length];
  const nextComposite = composites[(currentIndex + 1) % composites.length];

  return (
    <>
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
        <ScrollStaffImage
          src={currentComposite.left.image}
          name={currentComposite.left.name}
        />
        <ScrollStaffImage
          src={currentComposite.right.image}
          name={currentComposite.right.name}
        />
      </div>
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
        <ScrollStaffImage
          src={nextComposite.left.image}
          name={nextComposite.left.name}
        />
        <ScrollStaffImage
          src={nextComposite.right.image}
          name={nextComposite.right.name}
        />
      </div>
    </>
  );
};

const ScrollStaffImage: React.FC<{ src: string; name: string }> = ({
  src,
  name,
}) => (
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
      }}
    >
      <NameLabel name={name} />
    </div>
  </div>
);

// --- Style B: Ken Burns ---

const KenBurnsAnimation: React.FC<{ staffMembers: StaffMember[] }> = ({
  staffMembers,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalDuration = CREDITS_START_TIME - DYNAMIC_START; // ~76s
  const perPhoto = totalDuration / staffMembers.length;
  const overlapSec = 0.5;
  const tDynamic = frame / fps;

  // Determine current and previous photo index
  const rawIndex = tDynamic / perPhoto;
  const currentIdx = Math.min(
    Math.floor(rawIndex),
    staffMembers.length - 1
  );
  const prevIdx = currentIdx - 1;

  // Time within current photo's slot
  const photoStartTime = currentIdx * perPhoto;
  const elapsed = tDynamic - photoStartTime;

  // Seeded pseudo-random for consistent pan direction per photo
  const seedRandom = (seed: number) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const renderPhoto = (
    idx: number,
    opacity: number
  ): React.ReactNode => {
    if (idx < 0 || idx >= staffMembers.length) return null;
    const member = staffMembers[idx];
    const localStart = idx * perPhoto;
    const localElapsed = tDynamic - localStart;
    const progress = Math.min(localElapsed / perPhoto, 1);

    // Zoom from 1.0 to 1.15
    const scale = 1.0 + 0.15 * progress;

    // Pan direction based on photo index
    const r = seedRandom(idx);
    const panX = (r - 0.5) * 60 * progress; // ±30px
    const panY = (seedRandom(idx + 100) - 0.5) * 40 * progress; // ±20px

    return (
      <div
        key={idx}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: WIDTH,
          height: BG_HEIGHT,
          opacity,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "black",
        }}
      >
        <div
          style={{
            width: WIDTH,
            height: BG_HEIGHT,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Img
            src={staticFile(member.image)}
            style={{
              width: WIDTH,
              height: BG_HEIGHT,
              objectFit: "cover",
              transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            minWidth: 200,
          }}
        >
          <NameLabel
            name={member.name}
            style={{ borderRadius: 6, padding: "6px 16px" }}
          />
        </div>
      </div>
    );
  };

  // Crossfade: outgoing photo fades out during overlap
  const prevOpacity =
    prevIdx >= 0
      ? interpolate(elapsed, [0, overlapSec], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  // Current photo fades in during overlap
  const currentOpacity = interpolate(elapsed, [0, overlapSec], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      {renderPhoto(prevIdx, prevOpacity)}
      {renderPhoto(currentIdx, currentOpacity)}
    </>
  );
};

// --- Style C: Polaroid Scatter ---

const PolaroidAnimation: React.FC<{ staffMembers: StaffMember[] }> = ({
  staffMembers,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const totalDuration = CREDITS_START_TIME - DYNAMIC_START;
  const perPhoto = totalDuration / staffMembers.length;
  const tDynamic = frame / fps;
  const maxVisible = 15;

  // Seeded random for consistent positions/rotations
  const seedRandom = (seed: number) => {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const photoW = 220;
  const photoH = 260;
  const borderW = photoW + 24; // white polaroid border
  const borderH = photoH + 60; // extra space for name below
  const appearDuration = 0.3; // seconds for scale-up

  // How many photos have appeared so far
  const appearedCount = Math.min(
    Math.floor(tDynamic / perPhoto) + 1,
    staffMembers.length
  );

  const photos: React.ReactNode[] = [];
  for (let i = 0; i < appearedCount; i++) {
    const appearTime = i * perPhoto;
    const age = tDynamic - appearTime;
    if (age < 0) continue;

    // Fade out old photos when too many visible
    const visibleIndex = i - (appearedCount - maxVisible);
    let opacity = 1;
    if (appearedCount > maxVisible && visibleIndex < 0) {
      // Already faded out
      continue;
    }
    if (appearedCount > maxVisible && visibleIndex === 0) {
      // Currently fading out
      const fadeProgress = (tDynamic % perPhoto) / perPhoto;
      opacity = 1 - fadeProgress;
    }

    // Scale-up entrance
    const scaleProgress = Math.min(age / appearDuration, 1);
    const scale = interpolate(scaleProgress, [0, 1], [0, 1], {
      extrapolateRight: "clamp",
    });

    // Position and rotation from seed
    const r1 = seedRandom(i * 3);
    const r2 = seedRandom(i * 3 + 1);
    const r3 = seedRandom(i * 3 + 2);

    const x = 40 + r1 * (WIDTH - borderW - 80);
    const y = 20 + r2 * (BG_HEIGHT - borderH - 40);
    const rotation = (r3 - 0.5) * 24; // ±12 degrees

    // Beat bob — each card rotates a different direction
    const bob = getBeatBob(tDynamic, i);

    const member = staffMembers[i];

    photos.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: borderW,
          height: borderH,
          backgroundColor: "white",
          borderRadius: 4,
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
          transform: `rotate(${rotation + bob}deg) scale(${scale})`,
          opacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: 12,
          zIndex: i,
        }}
      >
        <Img
          src={staticFile(member.image)}
          style={{
            width: photoW,
            height: photoH,
            objectFit: "cover",
            borderRadius: 2,
          }}
        />
        <span
          style={{
            color: "#222",
            fontSize: 18,
            fontWeight: "bold",
            fontFamily: "Arial, sans-serif",
            marginTop: 8,
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: photoW,
          }}
        >
          {member.name}
        </span>
      </div>
    );
  }

  return <>{photos}</>;
};

// --- Style D: Pop-in Grid ---

const GridAnimation: React.FC<{ staffMembers: StaffMember[] }> = ({
  staffMembers,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cols = 7;
  const rows = 4;
  const pageSize = cols * rows; // 28
  const totalDuration = CREDITS_START_TIME - DYNAMIC_START;
  const tDynamic = frame / fps;

  const totalPages = Math.ceil(staffMembers.length / pageSize);
  const perPhoto = totalDuration / staffMembers.length;
  const pageDuration = pageSize * perPhoto;
  const fadeDuration = 0.5; // seconds for page fade

  // Current page
  const currentPage = Math.min(
    Math.floor(tDynamic / pageDuration),
    totalPages - 1
  );
  const pageStartTime = currentPage * pageDuration;
  const pageElapsed = tDynamic - pageStartTime;

  // Page fade-out at end
  const pageEndTime = (currentPage + 1) * pageDuration;
  const timeUntilPageEnd = pageEndTime - tDynamic;
  const pageFadeOut =
    currentPage < totalPages - 1 && timeUntilPageEnd < fadeDuration
      ? timeUntilPageEnd / fadeDuration
      : 1;

  // Members for this page
  const pageStart = currentPage * pageSize;
  const pageMembers = staffMembers.slice(pageStart, pageStart + pageSize);

  const cellW = WIDTH / cols;
  const cellH = BG_HEIGHT / rows;
  const imgSize = Math.min(cellW - 16, cellH - 40);

  return (
    <div style={{ opacity: pageFadeOut }}>
      {pageMembers.map((member, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const appearTime = i * perPhoto;

        // Spring bounce for pop-in
        const appeared = pageElapsed >= appearTime;
        const springVal = appeared
          ? spring({
              frame: Math.max(
                0,
                frame - Math.round((pageStartTime + appearTime) * fps)
              ),
              fps,
              config: { damping: 12, stiffness: 200, mass: 0.8 },
            })
          : 0;

        return (
          <div
            key={`${currentPage}-${i}`}
            style={{
              position: "absolute",
              left: col * cellW,
              top: row * cellH,
              width: cellW,
              height: cellH,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              transform: `scale(${springVal})`,
            }}
          >
            <Img
              src={staticFile(member.image)}
              style={{
                width: imgSize,
                height: imgSize,
                objectFit: "cover",
                borderRadius: 6,
              }}
            />
            <span
              style={{
                color: "white",
                fontSize: 14,
                fontWeight: "bold",
                fontFamily: "Arial, sans-serif",
                marginTop: 4,
                textAlign: "center",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: cellW - 8,
              }}
            >
              {member.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};
