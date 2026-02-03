import React from "react";
import { Composition } from "remotion";
import { Video, VideoProps } from "./Video";
import { WIDTH, HEIGHT, FPS, secondsToFrames } from "./utils/constants";
import { parseSrt } from "./utils/parseSrt";
import type { AnimationStyle } from "./components/ScrollingPhase";

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

const P = "staff/photos";

const staffMembers: StaffMember[] = [
  { image: `${P}/jesusca.jpg`, name: "Jesus Caraballo Anaya" },
  { image: `${P}/xabackus.jpeg`, name: "Xander Backus" },
  { image: `${P}/abthebee.jpg`, name: "Abhay Basireddy" },
  { image: `${P}/marcusbl.jpg`, name: "Marcus Bluestone" },
  { image: `${P}/widetim.png`, name: "Maryna Bohdan" },
  { image: `${P}/charisc.jpg`, name: "Charis Ching" },
  { image: `${P}/widetim.png`, name: "Kara Chou" },
  { image: `${P}/alexdang.jpg`, name: "Alex Dang" },
  { image: `${P}/yiqingdu.jpeg`, name: "Yiqing Du" },
  { image: `${P}/sanjd.jpg`, name: "Sanjana Duttagupta" },
  { image: `${P}/gfarina.jpeg`, name: "Gabriele Farina" },
  { image: `${P}/cge7.jpeg`, name: "Chris Ge" },
  { image: `${P}/ernestog.png`, name: "Ernesto Gomez" },
  { image: `${P}/chuang26.jpg`, name: "Christine Huang" },
  { image: `${P}/cassidyj.png`, name: "Cassidy Jennings" },
  { image: `${P}/akatorik.jpg`, name: "Tori Kelley" },
  { image: `${P}/manoli.jpg`, name: "Manolis Kellis" },
  { image: `${P}/kolic.png`, name: "Amir Kolic" },
  { image: `${P}/kle.jpg`, name: "Kathryn Le" },
  { image: `${P}/widetim.png`, name: "Michelle Li" },
  { image: `${P}/minniejl.png`, name: "Minnie Liang" },
  { image: `${P}/eve_lal.jpg`, name: "Evelyn Lianto" },
  { image: `${P}/lilahl.jpg`, name: "Lilah Lindemann" },
  { image: `${P}/luqiao.jpg`, name: "Luqiao Liu" },
  { image: `${P}/calebmat.jpg`, name: "Caleb Mathewos" },
  { image: `${P}/wojciech.jpg`, name: "Wojciech Matusik" },
  { image: `${P}/monardo.jpeg`, name: "Vincent Monardo" },
  { image: `${P}/wmowery.jpg`, name: "Wyatt Mowery" },
  { image: `${P}/anhn.png`, name: "Anh Nguyen" },
  { image: `${P}/enoriega.jpg`, name: "Eric Noriega" },
  { image: `${P}/joycequ.jpg`, name: "Joyce Qu" },
  { image: `${P}/muktha21.jpg`, name: "Muktha Ramesh" },
  { image: `${P}/rafaelmr.jpg`, name: "Rafael Ribeiro" },
  { image: `${P}/darivero.png`, name: "Diego Rivero" },
  { image: `${P}/mardavij.jpg`, name: "Mardavij Roozbehani" },
  { image: `${P}/brupesh.jpg`, name: "Bhadra Rupesh" },
  { image: `${P}/dryu.jpg`, name: "DongHun Ryu" },
  { image: `${P}/rshah2.jpeg`, name: "Rushil Shah" },
  { image: `${P}/shenshen.jpeg`, name: "Shen Shen" },
  { image: `${P}/jsong7.jpeg`, name: "Jonathan Song" },
  { image: `${P}/inimai.jpg`, name: "Inimai Subramanian" },
  { image: `${P}/mrsun.jpg`, name: "Maxwell Sun" },
  { image: `${P}/sukrith.jpg`, name: "Sukrith Velmineti" },
  { image: `${P}/alevol26.png`, name: "Alexandra Volkova" },
  { image: `${P}/aimeew.jpeg`, name: "Aimee Wang" },
  { image: `${P}/awang27.jpg`, name: "Annie Wang" },
  { image: `${P}/gwang2.png`, name: "Grace Wang" },
  { image: `${P}/josiexw.jpg`, name: "Josephine Wang" },
  { image: `${P}/lw0328.jpeg`, name: "Lillian Wang" },
  { image: `${P}/ashia07.png`, name: "Ashia Wilson" },
  { image: `${P}/phoenixw.png`, name: "Phoenix Wu" },
  { image: `${P}/elisaxia.jpeg`, name: "Elisa Xia" },
  { image: `${P}/jjz300.jpg`, name: "Jocelyn Zhao" },
  { image: `${P}/mirzhao.jpeg`, name: "Miranda Zhao" },
  { image: `${P}/akzheng.png`, name: "Andy Zheng" },
];

// Sort staff alphabetically by name
staffMembers.sort((a, b) => a.name.localeCompare(b.name));

// Parse subtitles
const subtitles = parseSrt(srtContent);

// Total duration based on audio (approximately 90 seconds)
const TOTAL_DURATION_SECONDS = 90;
const TOTAL_DURATION_FRAMES = secondsToFrames(TOTAL_DURATION_SECONDS);

const styles: { id: string; style: AnimationStyle }[] = [
  { id: "KaraokeVideo", style: "scroll" },
  { id: "KaraokeVideo-scroll", style: "scroll" },
  { id: "KaraokeVideo-kenburns", style: "kenburns" },
  { id: "KaraokeVideo-polaroid", style: "polaroid" },
  { id: "KaraokeVideo-grid", style: "grid" },
];

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {styles.map(({ id, style }) => (
        <Composition
          key={id}
          id={id}
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
            animationStyle: style,
          }}
        />
      ))}
    </>
  );
};
