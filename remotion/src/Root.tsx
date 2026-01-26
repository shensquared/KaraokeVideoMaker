import React from "react";
import { Composition } from "remotion";
import { Video, VideoProps } from "./Video";
import { WIDTH, HEIGHT, FPS, secondsToFrames } from "./utils/constants";
import { parseSrt } from "./utils/parseSrt";

// Import subtitles content
const srtContent = `1
00:00:09,120 --> 00:00:13,001
Jump into the learning where the algorithms groove.

2
00:00:13,370 --> 00:00:15,800
Supervised, unsupervised,

3
00:00:15,810 --> 00:00:17,300
let's find our rhythm and move!

4
00:00:17,750 --> 00:00:22,320
Oh let's dive into the data, find the stories we can tell.

5
00:00:22,719 --> 00:00:24,320
With six three-nine-oh knowledge,

6
00:00:24,320 --> 00:00:33,920
we're under machine learning's spell.

7
00:00:35,320 --> 00:00:39,920
Linear, and non-linear, we will dance through every way.

8
00:00:40,520 --> 00:00:44,700
Gradient descent is our partner, taking us to sway.

9
00:00:45,020 --> 00:00:46,700
From theory to the practice,

10
00:00:46,950 --> 00:00:48,240
We'll navigate the scene.

11
00:00:48,390 --> 00:00:53,420
In the land of algorithms, we'll build our dream machine~

12
00:00:53,470 --> 00:00:58,130
Oh, welcome to 6.390, where the excitement flows!

13
00:00:58,470 --> 00:01:02,130
With every model built, we're ready to break those codes!

14
00:01:02,280 --> 00:01:06,570
Reinforcement learning is calling, let's get up on our feet.

15
00:01:07,020 --> 00:01:20,260
With funky neural networks, we can't be beat!

16
00:01:26,830 --> 00:01:28,040
Credits`;

// Staff images - ordered with instructors first (matching Python sorting)
// Format: staff/<category>/element_<n>.png
const staffImages = [
  // Instructors first (8 images)
  "staff/instructor/element_0.png",
  "staff/instructor/element_1.png",
  "staff/instructor/element_2.png",
  "staff/instructor/element_3.png",
  "staff/instructor/element_4.png",
  "staff/instructor/element_5.png",
  "staff/instructor/element_6.png",
  "staff/instructor/element_7.png",
  // Course Assistant (1 image)
  "staff/courseassistant/element_0.png",
  // LAs (47 images)
  ...Array.from({ length: 36 }, (_, i) => `staff/la/element_${i}.png`),
  "staff/la/element_37.png",
  "staff/la/element_38.png",
  "staff/la/element_39.png",
  "staff/la/element_40.png",
  "staff/la/element_41.png",
  "staff/la/element_42.png",
  // TAs (17 images)
  ...Array.from({ length: 17 }, (_, i) => `staff/ta/element_${i}.png`),
];

// Parse subtitles
const subtitles = parseSrt(srtContent);

// Total duration based on audio (approximately 90 seconds)
const TOTAL_DURATION_SECONDS = 90;
const TOTAL_DURATION_FRAMES = secondsToFrames(TOTAL_DURATION_SECONDS);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="KaraokeVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Video as any}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{
          totalDurationInFrames: TOTAL_DURATION_FRAMES,
          staffImages,
          subtitles,
          audioFile: "audio.mp3",
        }}
      />
    </>
  );
};
