import cairo
import numpy as np
import moviepy.editor as mpy
import argparse
from PIL import Image
import os

# ---------------------------
# Argument Parsing
# ---------------------------
parser = argparse.ArgumentParser(
    description="Create a karaoke video from a subtitle file and optionally an audio file"
)
parser.add_argument("-f", "--fps", type=int, help="fps", default=24)
parser.add_argument(
    "-a",
    "--audio",
    help="file containing music audio (supported: *.mp3, *.mp4)",
    default=None,
)
parser.add_argument(
    "-o",
    "--output",
    help="output video file (format: *.mp4, default: output.mp4)",
    default="output.mp4",
)
parser.add_argument("subtitle_file", help="*.srt file containing text aligned to audio")
args = parser.parse_args()

# ---------------------------
# Configuration
# ---------------------------
sub_file = args.subtitle_file
audio_file = args.audio
output = args.output
fps = args.fps
width, height = 1280, 720

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
# Helper Function to Center Text
# ---------------------------
def write_centered(context, text, x, y):
    x_bearing, y_bearing, text_width, text_height, x_advance, y_advance = (
        context.text_extents(text)
    )
    x -= text_width / 2 + x_bearing
    y -= text_height / 2 + y_bearing
    context.move_to(x, y)
    context.show_text(text)


# ---------------------------
# Helper Function to Convert Cairo Surface to NumPy Image
# ---------------------------
def get_npimage(surface, width, height, transparent=False, y_origin="top"):
    im = np.frombuffer(surface.get_data(), np.uint8).reshape((height, width, 4))
    # Cairo surfaces in ARGB32 (little-endian) are stored as BGRA.
    # Reorder channels to get RGB (dropping alpha if needed)
    im = im[:, :, [2, 1, 0, 3]]
    if y_origin == "bottom":
        im = im[::-1]
    return im if transparent else im[:, :, :3]


# ---------------------------
# Load Images from 'staff' Directory with Correct Color & Aspect Ratio
# ---------------------------
image_dir = "staff"
background_images = []

for root, _, files in os.walk(image_dir):
    for file in sorted(files):  # Sort for consistent order
        if file.endswith(".png"):
            try:
                # Open image and convert to RGB (eliminates potential alpha issues)
                img = Image.open(os.path.join(root, file)).convert("RGB")
                img_width, img_height = img.size

                # Preserve aspect ratio when resizing
                scale = min(width / img_width, height / img_height)
                new_width = int(img_width * scale)
                new_height = int(img_height * scale)
                img = img.resize((new_width, new_height), Image.LANCZOS)

                # Convert to numpy array; shape will be (new_height, new_width, 3) in RGB order.
                img_array = np.array(img, dtype=np.uint8)
                # Convert to BGR order because on little-endian systems, cairo.FORMAT_ARGB32 expects BGRA.
                img_array = img_array[:, :, ::-1]  # Swap R and B channels

                # Create a black canvas with 4 channels (for ARGB32) and set alpha to 255.
                canvas = np.zeros((height, width, 4), dtype=np.uint8)
                canvas[..., 3] = 255  # fully opaque
                y_offset = (height - new_height) // 2
                x_offset = (width - new_width) // 2
                # Paste the image (BGR in the first 3 channels) onto the canvas.
                canvas[
                    y_offset : y_offset + new_height,
                    x_offset : x_offset + new_width,
                    :3,
                ] = img_array

                background_images.append(canvas)
            except Exception as e:
                print(f"Error loading image {file}: {e}")

if not background_images:
    raise RuntimeError("No images found in the 'staff' directory.")


# ---------------------------
# Draw Frame Function for VideoClip
# ---------------------------
def draw_frame(time):
    # Calculate scrolling parameters.
    total_images = len(background_images)
    scroll_speed = width / (total_duration / total_images)
    offset = -(scroll_speed * time % width)

    current_image_index = int((time * total_images) // total_duration) % total_images
    next_image_index = (current_image_index + 1) % total_images

    # Create a Cairo surface for the frame using ARGB32 (4 bytes per pixel).
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    context = cairo.Context(surface)

    # Draw current image.
    current_image = background_images[current_image_index]
    img_surf = cairo.ImageSurface.create_for_data(
        memoryview(current_image).cast("B"),
        cairo.FORMAT_ARGB32,
        current_image.shape[1],
        current_image.shape[0],
        current_image.shape[1] * 4,  # stride: width * 4 bytes
    )
    context.set_source_surface(img_surf, offset, 0)
    context.paint()

    # Draw next image for a smooth horizontal scroll transition.
    if offset + current_image.shape[1] < width:
        next_image = background_images[next_image_index]
        next_img_surf = cairo.ImageSurface.create_for_data(
            memoryview(next_image).cast("B"),
            cairo.FORMAT_ARGB32,
            next_image.shape[1],
            next_image.shape[0],
            next_image.shape[1] * 4,
        )
        context.set_source_surface(next_img_surf, offset + current_image.shape[1], 0)
        context.paint()

    # Find and draw the appropriate subtitle.
    subtitle = ""
    for (start, end), text in relevant_lines:
        if start <= time < end:
            subtitle = text
            break

    if subtitle:
        context.select_font_face(
            "Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL
        )
        context.set_source_rgb(1, 1, 1)
        context.set_font_size(50)
        write_centered(context, subtitle, width / 2, height / 2)

    return get_npimage(surface, width, height)


# ---------------------------
# Determine Total Duration and Create VideoClip
# ---------------------------
total_duration = max(end for (_, end), _ in relevant_lines)

if audio_file is not None:
    audio_clip = mpy.AudioFileClip(audio_file)
    total_duration = max(total_duration, audio_clip.duration)

video_clip = mpy.VideoClip(draw_frame, duration=total_duration)

if audio_file is not None:
    video_clip = video_clip.set_audio(audio_clip)

video_clip.write_videofile(output, fps=fps)
