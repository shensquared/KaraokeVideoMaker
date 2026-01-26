export interface Subtitle {
  start: number; // in seconds
  end: number; // in seconds
  text: string;
}

function parseTimestamp(timestamp: string): number {
  // Format: HH:MM:SS,mmm
  const [time, ms] = timestamp.split(",");
  const [hours, minutes, seconds] = time.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(ms) / 1000;
}

export function parseSrt(srtContent: string): Subtitle[] {
  const lines = srtContent.trim().split("\n");
  const subtitles: Subtitle[] = [];

  let i = 0;
  while (i < lines.length) {
    // Skip index line
    i++;

    if (i >= lines.length) break;

    // Parse timing line
    const timingLine = lines[i];
    if (!timingLine.includes("-->")) {
      i++;
      continue;
    }

    const [startStr, endStr] = timingLine.split(" --> ");
    const start = parseTimestamp(startStr.trim());
    const end = parseTimestamp(endStr.trim());
    i++;

    // Collect text lines until empty line or end
    const textLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      textLines.push(lines[i]);
      i++;
    }

    const text = textLines.join(" ").trim();
    if (text.length > 0) {
      subtitles.push({ start, end, text });
    }

    // Skip empty line
    i++;
  }

  return subtitles;
}

export function getSubtitleAtTime(
  subtitles: Subtitle[],
  timeInSeconds: number
): string | null {
  for (const sub of subtitles) {
    if (timeInSeconds >= sub.start && timeInSeconds < sub.end) {
      return sub.text;
    }
  }
  return null;
}
