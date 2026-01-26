import React from "react";
import { Img, staticFile } from "remotion";
import { GradientBar } from "./GradientBar";
import { WIDTH, HEIGHT } from "../utils/constants";

export const CreditsPhase: React.FC = () => {
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
        src={staticFile("credits.png")}
        style={{
          width: WIDTH,
          height: HEIGHT,
          objectFit: "cover",
        }}
      />
      <GradientBar />
    </div>
  );
};
