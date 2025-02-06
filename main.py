import cairo
import numpy as np
import moviepy.editor as mpy
import argparse
from PIL import Image
import os

# Argument parsing
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

# Configuration
sub_file = args.subtitle_file
audio_file = args.audio
output = args.output
fps = args.fps
width, height = 1280, 720

# Parse the subtitle file
with open(sub_file, "r") as f:
    sub_raw = f.read().split("\n")


def parse_time_interval(time_string):
    start_string, end_string = time_string.split(" --> ")
    return tuple(
        int(t[3:5]) * 60 + int(t[6:8]) + float(t[9:12]) / 1000
        for t in [start_string, end_string]
    )


relevant_lines = [
    (parse_time_interval(sub_raw[i + 1]), sub_raw[i + 2])
    for i in range(0, len(sub_raw), 4)
    if len(sub_raw[i + 2]) > 0
]


def write_centered(context, text, x, y):
    x_bearing, y_bearing, text_width, text_height, x_advance, y_advance = (
        context.text_extents(text)
    )
    x -= text_width / 2 + x_bearing
    y -= text_height / 2 + y_bearing
    context.move_to(x, y)
    context.show_text(text)


def get_npimage(surface, width, height, transparent=False, y_origin="top"):
    im = np.frombuffer(surface.get_data(), np.uint8).reshape((height, width, 4))
    im = im[:, :, [2, 1, 0, 3]]  # Reorder to RGB
    if y_origin == "bottom":
        im = im[::-1]
    return im if transparent else im[:, :, :3]


def create_blank_image(width, height):
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    context = cairo.Context(surface)
    context.set_source_rgb(0, 0, 0)  # Black background
    context.rectangle(0, 0, width, height)
    context.fill()
    return get_npimage(surface, width, height)


# Load images from 'staff' directory
image_dir = "staff"
background_images = []

for root, _, files in os.walk(image_dir):
    for file in files:
        if file.endswith(".png"):
            try:
                print(f"Loading image: {file}")
                img = (
                    Image.open(os.path.join(root, file))
                    .resize((width, height))
                    .convert("RGBA")
                )
                img_array = np.array(img)
                background_images.append(img_array)
            except Exception as e:
                print(f"Error loading image {file}: {e}")


def draw_frame(i, time):
    ((_, end_line), main_text) = relevant_lines[i]
    if i + 1 == len(relevant_lines):
        after_text = ""
        start_next_line = 100000
    else:
        (start_next_line, _), after_text = relevant_lines[i + 1]

    # Determine horizontal offset
    total_images = len(background_images)
    scroll_speed = width / (total_duration / total_images)
    offset = -(scroll_speed * time % width)

    current_image_index = int((time / total_duration) * total_images)
    next_image_index = (current_image_index + 1) % total_images

    # Create a surface for the current frame
    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, width, height)
    context = cairo.Context(surface)

    # Draw current image
    current_image = background_images[current_image_index]
    img_surf = cairo.ImageSurface.create_for_data(
        current_image,
        cairo.FORMAT_ARGB32,
        current_image.shape[1],
        current_image.shape[0],
    )
    context.set_source_surface(img_surf, offset, 0)
    context.paint()

    # Draw next image if needed to fill the frame (for smooth transition)
    if offset + current_image.shape[1] < width:
        next_image = background_images[next_image_index]
        next_img_surf = cairo.ImageSurface.create_for_data(
            next_image, cairo.FORMAT_ARGB32, next_image.shape[1], next_image.shape[0]
        )
        context.set_source_surface(next_img_surf, offset + current_image.shape[1], 0)
        context.paint()

    # Draw text
    context.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    context.set_source_rgb(1, 1, 1)
    context.set_font_size(50)
    write_centered(context, main_text, width / 2, height / 2)

    if start_next_line < end_line + 5:
        context.set_font_size(25)
        write_centered(context, after_text, width / 2, height / 2 + 100)

    # Draw time bar
    # timebar_width = (end_line - time) / 5 * width / 2
    context.set_source_rgb(0, 0.3, 0.7)
    # context.rectangle(width / 2 - timebar_width, 10, 2 * timebar_width, 10)
    context.fill()

    return get_npimage(surface, width, height)


def get_frame_index(time):
    for i, ((start, end), _) in enumerate(relevant_lines):
        if start <= time < end:
            return i
    return None


def build_frame(time):
    i_frame = get_frame_index(time)
    if i_frame is not None:
        return draw_frame(i_frame, time)
    else:
        return blank_image


blank_image = create_blank_image(width, height)

total_duration = max(end for (_, end), _ in relevant_lines)

if audio_file is not None:
    audio_clip = mpy.AudioFileClip(audio_file)
    total_duration = max(total_duration, audio_clip.duration)

video_clip = mpy.VideoClip(build_frame, duration=total_duration)

if audio_file is not None:
    video_clip.audio = audio_clip

video_clip.write_videofile(output, fps=fps)
