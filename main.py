import cairo
import numpy as np
import moviepy.editor as mpy
import argparse
from PIL import Image
import os
import math
import re

# ---------------------------
# Argument Parsing
# ---------------------------
parser = argparse.ArgumentParser(
    description="Create a karaoke video from a subtitle file and optionally an audio file"
)
parser.add_argument("-f", "--fps", type=int, default=60, help="frames per second")
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

# We'll define the following durations (in seconds):
static_duration = 8.0  # duration of the static logo phase
transition_duration = 2.0  # duration over which the static logo fades out and the dynamic background fades in
dynamic_start = static_duration + transition_duration  # dynamic phase begins at 10 sec

# ---------------------------
# Load Static Logo for the First Phase
# ---------------------------
try:
    logo = Image.open("logo.png").convert("RGB")
    logo_width, logo_height = logo.size
    # Use "cover" scaling so that the logo fills the entire frame.
    scale_logo = min(width / logo_width, height / logo_height)
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
    # Create a full-frame logo canvas with full opacity.
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
    # Cairo stores pixels as BGRA; reorder to RGBA.
    im = im[:, :, [2, 1, 0, 3]]
    if y_origin == "bottom":
        im = im[::-1]
    return im if transparent else im[:, :, :3]


# ---------------------------
# Load Individual Images with "Fit" Scaling and Create Half-Canvases
# ---------------------------
# Collect all PNG file paths (with their root) from the "staff" folder.
image_list = []
for root, _, files in os.walk("staff"):
    for file in files:
        if file.lower().endswith(".png"):
            image_list.append((root, file))

# Sort the list so that images whose root contains "instrcutros" come first.
# (Return 0 if "instrcutros" is in the path, else 1.)
image_list.sort(
    key=lambda tup: (0 if "instrcutros" in tup[0].lower() else 1, tup[0], tup[1])
)

half_width = width // 2
half_canvases = []  # Each will be a numpy array of shape (bg_height, half_width, 4)

for root, file in image_list:
    try:
        img = Image.open(os.path.join(root, file)).convert("RGB")
        img_width, img_height = img.size

        # Fit scaling: scale so the image's height equals bg_height.
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
# Each composite canvas is of size (bg_height, width, 4) with two images side-by-side.
composite_canvases = []
num_half = len(half_canvases)
i = 0
while i < num_half:
    composite = np.zeros((bg_height, width, 4), dtype=np.uint8)
    composite[..., 3] = 255
    # Left half:
    composite[:, 0:half_width, :] = half_canvases[i]
    # Right half: if available, use half_canvases[i+1]; otherwise, duplicate.
    if i + 1 < num_half:
        composite[:, half_width:width, :] = half_canvases[i + 1]
    else:
        composite[:, half_width:width, :] = half_canvases[i]
    composite_canvases.append(composite)
    i += 2

# Use composite canvases as the scrolling backgrounds.
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
    T_total = audio_clip.duration
else:
    T_total = max(time_tuple[1] for (time_tuple, _) in relevant_lines)

# We want:
#  - Static phase: first static_duration seconds (logo shown)
#  - Transition phase: next transition_duration seconds (logo fades out, dynamic background fades in)
#  - Dynamic (scrolling) phase: starts at dynamic_start = static_duration + transition_duration
static_duration = 8.0
transition_duration = 2.0
dynamic_start = static_duration + transition_duration
if T_total <= dynamic_start:
    raise RuntimeError("Audio duration is too short (must be more than 10 seconds).")
T_dynamic = T_total - dynamic_start  # Duration for the scrolling portion

# Calculate scroll speed so that one full cycle is scrolled over the dynamic phase.
scroll_speed = cycle_length / T_dynamic
print(
    f"Computed scroll speed: {scroll_speed:.2f} pixels/sec (cycle_length = {cycle_length}px, dynamic duration = {T_dynamic:.2f} sec)"
)


# ---------------------------
# Draw Frame Function for VideoClip (With Static Logo, Transition, and Scrolling Phase)
# ---------------------------
def draw_frame(time):
    if time < static_duration:
        # Static phase: display the logo (with fade-in if desired)
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
        context = cairo.Context(surface)
        # (Optional: you could fade in the logo; here we simply show it.)
        logo_surf = cairo.ImageSurface.create_for_data(
            memoryview(logo_canvas).cast("B"),
            cairo.FORMAT_ARGB32,
            width,
            height,
            width * 4,
        )
        context.set_source_surface(logo_surf, 0, 0)
        context.paint()
        # Draw the gradient bar at the top.
        gradient = cairo.LinearGradient(0, 0, width, 0)
        gradient.add_color_stop_rgb(0, 198 / 255, 22 / 255, 141 / 255)
        gradient.add_color_stop_rgb(0.5, 102 / 255, 45 / 255, 145 / 255)
        gradient.add_color_stop_rgb(1, 0, 161 / 255, 199 / 255)
        context.rectangle(0, 0, width, bar_height)
        context.set_source(gradient)
        context.fill()
        # Draw a welcome message.
        welcome_text = "Welcome to 6.390"
        context.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL
        )
        context.set_font_size(40)
        context.set_source_rgb(1, 1, 1)
        te = context.text_extents(welcome_text)
        x_text = (width - te.width) / 2 - te.x_bearing
        y_text = (bar_height - te.height) / 2 - te.y_bearing
        context.move_to(x_text, y_text)
        context.show_text(welcome_text)
        return get_npimage(surface, width, height)

    elif time < dynamic_start:
        # Transition phase: blend the static logo frame and the dynamic scrolling frame.
        t_norm = (time - static_duration) / transition_duration  # goes from 0 to 1
        # Static frame (same as in the static phase):
        static_surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
        static_ctx = cairo.Context(static_surface)
        static_ctx.set_source_surface(
            cairo.ImageSurface.create_for_data(
                memoryview(logo_canvas).cast("B"),
                cairo.FORMAT_ARGB32,
                width,
                height,
                width * 4,
            ),
            0,
            0,
        )
        static_ctx.paint()
        # Draw gradient bar and welcome message.
        gradient = cairo.LinearGradient(0, 0, width, 0)
        gradient.add_color_stop_rgb(0, 198 / 255, 22 / 255, 141 / 255)
        gradient.add_color_stop_rgb(0.5, 102 / 255, 45 / 255, 145 / 255)
        gradient.add_color_stop_rgb(1, 0, 161 / 255, 199 / 255)
        static_ctx.rectangle(0, 0, width, bar_height)
        static_ctx.set_source(gradient)
        static_ctx.fill()
        welcome_text = "Welcome to 6.390"
        static_ctx.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL
        )
        static_ctx.set_font_size(40)
        static_ctx.set_source_rgb(1, 1, 1)
        te = static_ctx.text_extents(welcome_text)
        x_text = (width - te.width) / 2 - te.x_bearing
        y_text = (bar_height - te.height) / 2 - te.y_bearing
        static_ctx.move_to(x_text, y_text)
        static_ctx.show_text(welcome_text)
        static_frame = get_npimage(static_surface, width, height)

        # Dynamic frame: use t_dynamic = max(0, time - dynamic_start) which is 0 for time in [8,10).
        # Thus, dynamic frame is computed with t_dynamic = 0.
        dynamic_surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
        dynamic_ctx = cairo.Context(dynamic_surface)
        # For t_dynamic = 0, pos = 0.
        current_canvas = background_images[0]
        next_canvas = background_images[1 % num_composites]
        curr_img_surf = cairo.ImageSurface.create_for_data(
            memoryview(current_canvas).cast("B"),
            cairo.FORMAT_ARGB32,
            width,
            bg_height,
            width * 4,
        )
        dynamic_ctx.set_source_surface(curr_img_surf, 0, bar_height)
        dynamic_ctx.paint()
        next_img_surf = cairo.ImageSurface.create_for_data(
            memoryview(next_canvas).cast("B"),
            cairo.FORMAT_ARGB32,
            width,
            bg_height,
            width * 4,
        )
        dynamic_ctx.set_source_surface(next_img_surf, width, bar_height)
        dynamic_ctx.paint()
        # Draw gradient bar and dynamic subtitles.
        gradient = cairo.LinearGradient(0, 0, width, 0)
        gradient.add_color_stop_rgb(0, 198 / 255, 22 / 255, 141 / 255)
        gradient.add_color_stop_rgb(0.5, 102 / 255, 45 / 255, 145 / 255)
        gradient.add_color_stop_rgb(1, 0, 161 / 255, 199 / 255)
        dynamic_ctx.rectangle(0, 0, width, bar_height)
        dynamic_ctx.set_source(gradient)
        dynamic_ctx.fill()
        subtitle = ""
        for (start, end), text in relevant_lines:
            if start <= time < end:
                subtitle = text
                break
        if subtitle:
            dynamic_ctx.select_font_face(
                "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL
            )
            dynamic_ctx.set_font_size(40)
            dynamic_ctx.set_source_rgb(1, 1, 1)
            te = dynamic_ctx.text_extents(subtitle)
            x_text = (width - te.width) / 2 - te.x_bearing
            y_text = (bar_height - te.height) / 2 - te.y_bearing
            dynamic_ctx.move_to(x_text, y_text)
            dynamic_ctx.show_text(subtitle)
        dynamic_frame = get_npimage(dynamic_surface, width, height)

        # Blend the two frames.
        blended = (1 - t_norm) * static_frame.astype(
            np.float32
        ) + t_norm * dynamic_frame.astype(np.float32)
        blended = np.clip(blended, 0, 255).astype(np.uint8)
        return blended

    else:
        # Dynamic scrolling phase.
        t_dynamic = time - dynamic_start
        pos = (scroll_speed * t_dynamic) % cycle_length
        current_index = int(pos // width)
        offset = pos % width
        x_offset = -offset
        current_canvas = background_images[current_index]
        next_index = (current_index + 1) % num_composites
        next_canvas = background_images[next_index]
        surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
        context = cairo.Context(surface)
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
        gradient = cairo.LinearGradient(0, 0, width, 0)
        gradient.add_color_stop_rgb(0, 198 / 255, 22 / 255, 141 / 255)
        gradient.add_color_stop_rgb(0.5, 102 / 255, 45 / 255, 145 / 255)
        gradient.add_color_stop_rgb(1, 0, 161 / 255, 199 / 255)
        context.rectangle(0, 0, width, bar_height)
        context.set_source(gradient)
        context.fill()
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
video_clip = mpy.VideoClip(draw_frame, duration=T_total)
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
