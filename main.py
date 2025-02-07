import cairo
import numpy as np
import moviepy.editor as mpy
import argparse
from PIL import Image
import os
import math

# ---------------------------
# Argument Parsing
# ---------------------------
parser = argparse.ArgumentParser(
    description="Create a karaoke video from a subtitle file and optionally an audio file"
)
parser.add_argument("-f", "--fps", type=int, default=24, help="frames per second")
parser.add_argument(
    "-a",
    "--audio",
    default=None,
    help="file containing music audio (supported: *.mp3, *.mp4)",
)
parser.add_argument(
    "-o",
    "--output",
    default="output.mp4",
    help="output video file (format: *.mp4, default: output.mp4)",
)
parser.add_argument("subtitle_file", help="*.srt file containing text aligned to audio")
args = parser.parse_args()

sub_file = args.subtitle_file
audio_file = args.audio
output = args.output
fps = args.fps

# ---------------------------
# Video Dimensions & Configuration
# ---------------------------
width, height = 1280, 720
bar_height = 80  # Gradient bar at the top
bg_height = height - bar_height  # Background area for images

# We'll compute the scroll speed so that one full cycle (all composite canvases) is shown exactly over the audio duration.

# ---------------------------
# Subtitle Parsing
# ---------------------------
with open(sub_file, "r") as f:
    sub_raw = f.read().strip().split("\n")


def parse_time_interval(time_string):
    start_string, end_string = time_string.split(" --> ")
    return tuple(
        int(t[3:5]) * 60 + int(t[6:8]) + float(t[9:12]) / 1000
        for t in [start_string, end_string]
    )


relevant_lines = [
    (parse_time_interval(sub_raw[i + 1]), sub_raw[i + 2])
    for i in range(0, len(sub_raw), 4)
    if len(sub_raw[i + 2].strip()) > 0
]


# ---------------------------
# Helper Function: Convert Cairo Surface to NumPy Image
# ---------------------------
def get_npimage(surface, width, height, transparent=False, y_origin="top"):
    im = np.frombuffer(surface.get_data(), np.uint8).reshape((height, width, 4))
    # Cairo surfaces in ARGB32 (little-endian) store pixels as BGRA.
    im = im[:, :, [2, 1, 0, 3]]
    if y_origin == "bottom":
        im = im[::-1]
    return im if transparent else im[:, :, :3]


# ---------------------------
# Load Images and Create Composite Canvases (Two Images per Canvas)
# ---------------------------
# For each image in the "staff" folder, we scale it so that its height exactly equals bg_height.
# Then, for each composite canvas, we combine two images side-by-side.
# Each half-canvas is of size (bg_height, half_width) where half_width = width//2.
half_width = width // 2

# First, load each image and create a half-canvas for it.
half_canvases = []  # Each item is a numpy array of shape (bg_height, half_width, 4)
for root, _, files in os.walk("staff"):
    for file in sorted(files):
        if file.lower().endswith(".png"):
            try:
                img = Image.open(os.path.join(root, file)).convert("RGB")
                img_width, img_height = img.size

                # Scale so that the image's height equals bg_height.
                scale = bg_height / img_height
                new_width = int(img_width * scale)
                new_height = bg_height  # equals bg_height
                img_resized = img.resize((new_width, new_height), Image.LANCZOS)

                # Create a half-canvas (of size (bg_height, half_width)) with a black background.
                half_canvas = np.zeros((bg_height, half_width, 4), dtype=np.uint8)
                half_canvas[..., 3] = 255

                # Center the resized image horizontally within the half-canvas.
                left_margin = (half_width - new_width) // 2
                # If the image is wider than half_width, you might want to crop it.
                # We'll crop if necessary.
                if new_width > half_width:
                    # Crop the image (center crop) to half_width.
                    img_array = np.array(img_resized)[:, :half_width, :]
                else:
                    img_array = np.array(img_resized)
                # Swap channels for cairo (BGRA)
                img_array = img_array[:, :, ::-1]
                # Determine the region to paste into.
                paste_start = max(0, left_margin)
                paste_end = paste_start + min(new_width, half_width)
                half_canvas[:, paste_start:paste_end, :3] = img_array[
                    :, : (paste_end - paste_start), :
                ]

                half_canvases.append(half_canvas)
            except Exception as e:
                print(f"Error loading image {file}: {e}")

if not half_canvases:
    raise RuntimeError("No images found in the 'staff' directory.")

# Now, combine the half_canvases in pairs to create composite canvases.
# Each composite canvas is of size (bg_height, width, 4).
composite_canvases = []
num_half = len(half_canvases)
i = 0
while i < num_half:
    # Create an empty composite canvas.
    composite = np.zeros((bg_height, width, 4), dtype=np.uint8)
    composite[..., 3] = 255
    # Left half:
    composite[:, 0:half_width, :] = half_canvases[i]
    # Right half: if there is a next image, use it; otherwise, leave it black.
    if i + 1 < num_half:
        composite[:, half_width:width, :] = half_canvases[i + 1]
    else:
        # Optionally, you could duplicate the last half-canvas.
        composite[:, half_width:width, :] = half_canvases[i]
    composite_canvases.append(composite)
    i += 2

# Use composite_canvases as the background images for scrolling.
background_images = composite_canvases
num_composites = len(background_images)
cycle_length = (
    num_composites * width
)  # Each composite canvas is exactly 'width' pixels wide

# ---------------------------
# Determine Video Duration and Calculate Scroll Speed
# ---------------------------
if audio_file is not None:
    audio_clip = mpy.AudioFileClip(audio_file)
    T = audio_clip.duration
else:
    T = max(end for (_, end), _ in relevant_lines)

# Calculate scroll speed so that one full cycle is scrolled over the audio duration.
scroll_speed = cycle_length / T
print(
    f"Computed scroll speed: {scroll_speed:.2f} pixels/sec (cycle_length = {cycle_length}px, duration = {T:.2f} sec)"
)


# ---------------------------
# Draw Frame Function for VideoClip (Continuous Scrolling)
# ---------------------------
def draw_frame(time):
    # Compute the continuous scroll position (in pixels) along the full cycle.
    pos = (scroll_speed * time) % cycle_length

    # Determine current composite canvas index and offset within that canvas.
    current_index = int(pos // width)
    offset = pos % width
    x_offset = -offset

    current_canvas = background_images[current_index]
    next_index = (current_index + 1) % num_composites
    next_canvas = background_images[next_index]

    # Create a Cairo surface for the full frame.
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    context = cairo.Context(surface)

    # Draw the current composite canvas in the background area (below the gradient bar).
    curr_img_surf = cairo.ImageSurface.create_for_data(
        memoryview(current_canvas).cast("B"),
        cairo.FORMAT_ARGB32,
        width,
        bg_height,
        width * 4,
    )
    context.set_source_surface(curr_img_surf, x_offset, bar_height)
    context.paint()

    # Draw the next composite canvas immediately to the right.
    next_img_surf = cairo.ImageSurface.create_for_data(
        memoryview(next_canvas).cast("B"),
        cairo.FORMAT_ARGB32,
        width,
        bg_height,
        width * 4,
    )
    context.set_source_surface(next_img_surf, x_offset + width, bar_height)
    context.paint()

    # Draw the gradient bar at the top.
    gradient = cairo.LinearGradient(0, 0, width, 0)
    gradient.add_color_stop_rgb(0, 198 / 255, 22 / 255, 141 / 255)
    gradient.add_color_stop_rgb(0.5, 102 / 255, 45 / 255, 145 / 255)
    gradient.add_color_stop_rgb(1, 0, 161 / 255, 199 / 255)
    context.rectangle(0, 0, width, bar_height)
    context.set_source(gradient)
    context.fill()

    # Draw time-synced lyrics (centered in the gradient bar).
    subtitle = ""
    for (start, end), text in relevant_lines:
        if start <= time < end:
            subtitle = text
            break
    if subtitle:
        context.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL
        )
        context.set_font_size(40)
        context.set_source_rgb(1, 1, 1)
        te = context.text_extents(subtitle)
        x_text = (width - te.width) / 2 - te.x_bearing
        y_text = (bar_height - te.height) / 2 - te.y_bearing
        context.move_to(x_text, y_text)
        context.show_text(subtitle)

    return get_npimage(surface, width, height)


# ---------------------------
# Create VideoClip and Write Output
# ---------------------------
video_clip = mpy.VideoClip(draw_frame, duration=T)
if audio_file is not None:
    video_clip = video_clip.set_audio(audio_clip)

video_clip.write_videofile(
    output,
    fps=fps,
    codec="libx264",
    audio_codec="aac",
    temp_audiofile="temp-audio.m4a",
    remove_temp=True,
)
