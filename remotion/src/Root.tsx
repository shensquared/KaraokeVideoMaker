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

// Staff members - ordered: instructors, TAs, UTAs, course assistants
export interface StaffMember {
  image: string;
  name: string;
}

const staffMembers: StaffMember[] = [
  // Instructors (4)
  { image: "staff/instructor/manoli.jpg", name: "Manolis Kellis" },
  { image: "staff/instructor/wojciech.jpg", name: "Wojciech Matusik" },
  { image: "staff/instructor/mardavij.jpg", name: "Mardavij Roozbehani" },
  { image: "staff/instructor/ashia07.png", name: "Ashia Wilson" },
  // TAs (23)
  { image: "staff/ta/jesusca.jpg", name: "Jesus Caraballo Anaya" },
  { image: "staff/ta/xabackus.jpeg", name: "Xander Backus" },
  { image: "staff/ta/abthebee.jpg", name: "Abhay Basireddy" },
  { image: "staff/ta/chuang26.jpg", name: "Christine Huang" },
  { image: "staff/ta/cassidyj.png", name: "Cassidy Jennings" },
  { image: "staff/ta/kolic.png", name: "Amir Kolic" },
  { image: "staff/ta/minniejl.png", name: "Minnie Liang" },
  { image: "staff/ta/eve_lal.jpg", name: "Evelyn Lianto" },
  { image: "staff/ta/luqiao.jpg", name: "Luqiao Liu" },
  { image: "staff/ta/anhn.png", name: "Anh Nguyen" },
  { image: "staff/ta/muktha21.jpg", name: "Muktha Ramesh" },
  { image: "staff/ta/dryu.jpg", name: "DongHun Ryu" },
  { image: "staff/ta/rshah2.jpeg", name: "Rushil Shah" },
  { image: "staff/ta/jsong7.jpeg", name: "Jonathan Song" },
  { image: "staff/ta/inimai.jpg", name: "Inimai Subramanian" },
  { image: "staff/ta/aimeew.jpeg", name: "Aimee Wang" },
  { image: "staff/ta/gwang2.png", name: "Grace Wang" },
  { image: "staff/ta/lw0328.jpeg", name: "Lillian Wang" },
  { image: "staff/ta/phoenixw.png", name: "Phoenix Wu" },
  { image: "staff/ta/elisaxia.jpeg", name: "Elisa Xia" },
  { image: "staff/ta/jjz300.jpg", name: "Jocelyn Zhao" },
  { image: "staff/ta/mirzhao.jpeg", name: "Miranda Zhao" },
  { image: "staff/ta/akzheng.png", name: "Andy Zheng" },
  // UTAs with photos (10)
  { image: "staff/uta/charisc.jpg", name: "Charis Ching" },
  { image: "staff/uta/gfarina.jpeg", name: "Gabriele Farina" },
  { image: "staff/uta/cge7.jpeg", name: "Chris Ge" },
  { image: "staff/uta/monardo.jpeg", name: "Vincent Monardo" },
  { image: "staff/uta/enoriega.png", name: "Eric Noriega" },
  { image: "staff/uta/joycequ.jpg", name: "Joyce Qu" },
  { image: "staff/uta/darivero.png", name: "Diego Rivero" },
  { image: "staff/uta/shenshen.jpeg", name: "Shen Shen" },
  { image: "staff/uta/alexdang.jpg", name: "Alex Dang" },
  { image: "staff/uta/yiqingdu.jpeg", name: "Yiqing Du" },
  // UTAs with placeholder (18)
  { image: "staff/uta/widetim.png", name: "Marcus Bluestone" },
  { image: "staff/uta/widetim.png", name: "Maryna Bohdan" },
  { image: "staff/uta/widetim.png", name: "Kara Chou" },
  { image: "staff/uta/widetim.png", name: "Sanjana Duttagupta" },
  { image: "staff/uta/widetim.png", name: "Ernesto Gomez" },
  { image: "staff/uta/widetim.png", name: "Tori Kelley" },
  { image: "staff/uta/widetim.png", name: "Kathryn Le" },
  { image: "staff/uta/widetim.png", name: "Michelle Li" },
  { image: "staff/uta/widetim.png", name: "Lilah Lindemann" },
  { image: "staff/uta/widetim.png", name: "Caleb Mathewos" },
  { image: "staff/uta/widetim.png", name: "Wyatt Mowery" },
  { image: "staff/uta/widetim.png", name: "Rafael Ribeiro" },
  { image: "staff/uta/widetim.png", name: "Bhadra Rupesh" },
  { image: "staff/uta/widetim.png", name: "Maxwell Sun" },
  { image: "staff/uta/widetim.png", name: "Sukrith Velmineti" },
  { image: "staff/uta/widetim.png", name: "Alexandra Volkova" },
  { image: "staff/uta/widetim.png", name: "Annie Wang" },
  { image: "staff/uta/widetim.png", name: "Josephine Wang" },
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
          staffMembers,
          subtitles,
          audioFile: "audio.wav",
        }}
      />
    </>
  );
};
