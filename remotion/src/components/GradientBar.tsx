import React from "react";
import { BAR_HEIGHT, GRADIENT_COLORS, WIDTH, FONT_SIZE } from "../utils/constants";

interface GradientBarProps {
  children?: React.ReactNode;
}

export const GradientBar: React.FC<GradientBarProps> = ({ children }) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: WIDTH,
        height: BAR_HEIGHT,
        background: `linear-gradient(to right, ${GRADIENT_COLORS.start}, ${GRADIENT_COLORS.middle}, ${GRADIENT_COLORS.end})`,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      {children && (
        <span
          style={{
            color: "white",
            fontSize: FONT_SIZE,
            fontFamily: "sans-serif",
          }}
        >
          {children}
        </span>
      )}
    </div>
  );
};
