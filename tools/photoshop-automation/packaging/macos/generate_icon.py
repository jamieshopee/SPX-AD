"""Generate the macOS product icon from the locked Phase 1 tray geometry."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


SPX_ORANGE = (238, 77, 45, 255)
WHITE = (255, 255, 255, 255)


def build_icon():
    size = 1024
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((64, 64, 960, 960), radius=224, fill=SPX_ORANGE)
    draw.rectangle((288, 288, 736, 736), fill=WHITE)
    draw.rectangle((384, 384, 640, 640), fill=SPX_ORANGE)
    return image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    build_icon().save(output_path, format="ICNS")
    print("Generated {0}".format(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
