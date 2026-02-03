// Video dimensions
export const WIDTH = 1280;
export const HEIGHT = 720;
export const FPS = 60;

// Layout
export const BAR_HEIGHT = 80;
export const BG_HEIGHT = HEIGHT - BAR_HEIGHT;
export const HALF_WIDTH = WIDTH / 2;

// Timing (in seconds)
export const STATIC_DURATION = 6.5;
export const TRANSITION_DURATION = 3.5;
export const DYNAMIC_START = STATIC_DURATION + TRANSITION_DURATION; // 10 seconds
export const CREDITS_START_TIME = 90.0; // no separate credits phase; staff photos run to end

// Fade durations (in seconds)
export const LOGO_FADE_IN_DURATION = 2.0;

// Colors for gradient bar
export const GRADIENT_COLORS = {
  start: "#C6168D",
  middle: "#662D91",
  end: "#00A1C7",
};

// Text
export const WELCOME_TEXT = "Welcome to 6.390!";
export const FONT_SIZE = 40;

// Convert seconds to frames
export const secondsToFrames = (seconds: number): number =>
  Math.round(seconds * FPS);

// Convert frames to seconds
export const framesToSeconds = (frames: number): number => frames / FPS;

// Frame counts
export const STATIC_FRAMES = secondsToFrames(STATIC_DURATION);
export const TRANSITION_FRAMES = secondsToFrames(TRANSITION_DURATION);
export const DYNAMIC_START_FRAME = secondsToFrames(DYNAMIC_START);
export const CREDITS_START_FRAME = secondsToFrames(CREDITS_START_TIME);
