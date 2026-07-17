"""Generate the Windows product icon from the locked Phase 1 tray geometry."""

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


ICON_SIZES = tuple((size, size) for size in (16, 20, 24, 32, 40, 48, 64, 128, 256))
SPX_ORANGE = (238, 77, 45, 255)
WHITE = (255, 255, 255, 255)


def build_icon():
    size = 256
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((16, 16, 240, 240), radius=56, fill=SPX_ORANGE)
    draw.rectangle((72, 72, 184, 184), fill=WHITE)
    draw.rectangle((96, 96, 160, 160), fill=SPX_ORANGE)
    return image


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    build_icon().save(output_path, format="ICO", sizes=ICON_SIZES)
    print("Generated {0}".format(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
