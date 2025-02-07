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

# ---------------------------
# Load Static Logo for the First 8 Seconds
# ---------------------------
try:
    logo = Image.open("logo.png").convert("RGB")
    logo_width, logo_height = logo.size
    # Use "cover" scaling so that the logo fills the entire frame.
    scale_logo = max(width / logo_width, height / logo_height)
    new_logo_width = int(logo_width * scale_logo)
    new_logo_height = int(logo_height * scale_logo)
    logo_resized = logo.resize((new_logo_width, new_logo_height), Image.LANCZOS)
    # Center-crop to exactly (width, height)
    left = (new_logo_width - width) // 2
    top = (new_logo_height - height) // 2
    logo_cropped = logo_resized.crop((left, top, left + width, top + height))
    logo_array = np.array(logo_cropped, dtype=np.uint8)
    # Swap channels for cairo (BGRA order)
    logo_array = logo_array[:, :, ::-1]
    # Create a canvas with full opacity.
    logo_canvas = np.empty((height, width, 4), dtype=np.uint8)
    logo_canvas[:, :, :3] = logo_array
    logo_canvas[:, :, 3] = 255
except Exception as e:
    raise RuntimeError(f"Error loading logo.png: {e}")

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


# Each element is ((start, end), subtitle_text)
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
    # Cairo stores pixels as BGRA; convert to RGBA order.
    im = im[:, :, [2, 1, 0, 3]]
    if y_origin == "bottom":
        im = im[::-1]
    return im if transparent else im[:, :, :3]


# ---------------------------
# Load Individual Images with "Fit" Scaling and Create Half-Canvases
# ---------------------------
# For each PNG in the "staff" folder, scale it so that its height equals bg_height.
# Then place it in a half-canvas of width = width//2 (centered horizontally).
half_width = width // 2
half_canvases = []  # Each is a numpy array of shape (bg_height, half_width, 4)

for root, _, files in os.walk("staff"):
    for file in sorted(files):
        if file.lower().endswith(".png"):
            try:
                img = Image.open(os.path.join(root, file)).convert("RGB")
                img_width, img_height = img.size

                # Fit scaling: scale so the image's height exactly equals bg_height.
                scale = bg_height / img_height
                new_width = int(img_width * scale)
                new_height = bg_height  # by design
                img_resized = img.resize((new_width, new_height), Image.LANCZOS)

                # Create a half-canvas with a black background.
                half_canvas = np.zeros((bg_height, half_width, 4), dtype=np.uint8)
                half_canvas[..., 3] = 255

                # Center the resized image horizontally within the half-canvas.
                left_margin = (half_width - new_width) // 2
                if new_width > half_width:
                    img_array = np.array(img_resized)[:, :half_width, :]
                else:
                    img_array = np.array(img_resized)
                # Swap channels for cairo (BGRA)
                img_array = img_array[:, :, ::-1]
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

# ---------------------------
# Create Composite Canvases (Two Half-Canvases per Composite)
# ---------------------------
# Each composite canvas will be of size (bg_height, width, 4) with two images side-by-side.
composite_canvases = []
num_half = len(half_canvases)
i = 0
while i < num_half:
    composite = np.zeros((bg_height, width, 4), dtype=np.uint8)
    composite[..., 3] = 255
    # Left half:
    composite[:, 0:half_width, :] = half_canvases[i]
    # Right half: if available, use half_canvases[i+1]; otherwise, duplicate the left half.
    if i + 1 < num_half:
        composite[:, half_width:width, :] = half_canvases[i + 1]
    else:
        composite[:, half_width:width, :] = half_canvases[i]
    composite_canvases.append(composite)
    i += 2

# Use composite_canvases as the scrolling backgrounds.
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
    # Fix: Extract end times from the first element of each tuple.
    T = max(time_tuple[1] for (time_tuple, _) in relevant_lines)

# We'll show the static logo for the first 8 seconds.
static_duration = 8.0
if T <= static_duration:
    raise RuntimeError("Audio duration is too short (must be more than 8 seconds).")
T_dynamic = T - static_duration  # Duration for the scrolling portion

# Calculate scroll speed so that one full cycle is scrolled over T_dynamic.
scroll_speed = cycle_length / T_dynamic
print(
    f"Computed scroll speed: {scroll_speed:.2f} pixels/sec (cycle_length = {cycle_length}px, dynamic duration = {T_dynamic:.2f} sec)"
)


# ---------------------------
# Draw Frame Function for VideoClip (With Initial Static Logo)
# ---------------------------
def draw_frame(time):
    if time < static_duration:
        # For the first 8 seconds, display the static logo.
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
        context = cairo.Context(surface)
        logo_surf = cairo.ImageSurface.create_for_data(
            memoryview(logo_canvas).cast("B"),
            cairo.FORMAT_ARGB32,
            width,
            height,
            width * 4,
        )
        context.set_source_surface(logo_surf, 0, 0)
        context.paint()
        return get_npimage(surface, width, height)
    else:
        t_dynamic = time - static_duration
        pos = (scroll_speed * t_dynamic) % cycle_length

        current_index = int(pos // width)
        offset = pos % width
        x_offset = -offset

        current_canvas = background_images[current_index]
        next_index = (current_index + 1) % num_composites
        next_canvas = background_images[next_index]

        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
        context = cairo.Context(surface)

        # Draw the scrolling background in the area below the gradient bar.
        curr_img_surf = cairo.ImageSurface.create_for_data(
            memoryview(current_canvas).cast("B"),
            cairo.FORMAT_ARGB32,
            width,
            bg_height,
            width * 4,
        )
        context.set_source_surface(curr_img_surf, x_offset, bar_height)
        context.paint()

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
