"""
生成《鲸钩物语》的原创精灵图（鱼、宝箱、珍珠、靴子、鱼钩、小船、UI 皮肤、背景）。

全部由本脚本用 Pillow 绘制，属于本项目原创素材，不依赖任何第三方图片。
画风统一：粗白描边 + 柔和渐变高光 + 投影，贴合二次元立绘的“奶油描边”风格。

用法（只读外部依赖：Pillow）：
    python3 -I tools/build-art.py
输出到 public/assets/ 下，供 Vite / 微应用打包。
"""

from __future__ import annotations

import math
import os
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets"
SS = 4  # 超采样倍数：先画大图再缩小，边缘更平滑


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def rgba(hex_value: int, alpha: int = 255) -> tuple[int, int, int, int]:
    return ((hex_value >> 16) & 255, (hex_value >> 8) & 255, hex_value & 255, alpha)


def finish(layer: Image.Image, size: tuple[int, int], outline: int = 6, shadow: bool = True) -> Image.Image:
    """给形状加白色描边与投影，再缩小到目标尺寸。"""
    alpha = layer.split()[3]
    pad = outline * SS
    big = Image.new("RGBA", layer.size, (0, 0, 0, 0))

    if shadow:
        shadow_mask = alpha.filter(ImageFilter.MaxFilter(pad * 2 + 1 if pad * 2 + 1 <= 51 else 51))
        shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(3 * SS))
        shade = Image.new("RGBA", layer.size, (6, 18, 34, 0))
        shade.putalpha(shadow_mask.point(lambda v: int(v * 0.45)))
        offset = Image.new("RGBA", layer.size, (0, 0, 0, 0))
        offset.paste(shade, (0, 3 * SS), shade)
        big = Image.alpha_composite(big, offset)

    stroke_mask = alpha
    remaining = pad
    while remaining > 0:
        step = min(remaining, 25)
        stroke_mask = stroke_mask.filter(ImageFilter.MaxFilter(step * 2 + 1))
        remaining -= step
    stroke = Image.new("RGBA", layer.size, (255, 255, 255, 0))
    stroke.putalpha(stroke_mask)
    big = Image.alpha_composite(big, stroke)
    big = Image.alpha_composite(big, layer)

    bbox = big.getbbox()
    if bbox:
        big = big.crop(bbox)
    big.thumbnail((size[0], size[1]), Image.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.paste(big, ((size[0] - big.width) // 2, (size[1] - big.height) // 2), big)
    return canvas


def gradient_ellipse(draw_size: tuple[int, int], box, top: int, bottom: int) -> Image.Image:
    """在 box 内画一个从上到下渐变的椭圆。"""
    layer = Image.new("RGBA", draw_size, (0, 0, 0, 0))
    mask = Image.new("L", draw_size, 0)
    ImageDraw.Draw(mask).ellipse(box, fill=255)
    grad = Image.new("RGBA", draw_size, (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    y0, y1 = int(box[1]), int(box[3])
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, y1 - y0)
        c = tuple(int(rgba(top)[i] * (1 - t) + rgba(bottom)[i] * t) for i in range(3)) + (255,)
        gd.line([(0, y), (draw_size[0], y)], fill=c)
    layer.paste(grad, (0, 0), mask)
    return layer


def fish(body_top: int, body_bottom: int, fin: int, size: int, stripes: bool = False, crown: bool = False) -> Image.Image:
    W, H = 260 * SS, 180 * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = 140 * SS, 90 * SS
    # 尾鳍
    d.polygon([(70 * SS, cy), (20 * SS, cy - 46 * SS), (34 * SS, cy), (20 * SS, cy + 46 * SS)], fill=rgba(fin))
    # 背鳍 / 腹鳍
    d.polygon([(118 * SS, cy - 46 * SS), (150 * SS, cy - 82 * SS), (170 * SS, cy - 44 * SS)], fill=rgba(fin))
    d.polygon([(130 * SS, cy + 44 * SS), (150 * SS, cy + 66 * SS), (162 * SS, cy + 40 * SS)], fill=rgba(fin))
    # 身体
    body = gradient_ellipse((W, H), (62 * SS, cy - 54 * SS, 232 * SS, cy + 54 * SS), body_top, body_bottom)
    layer = Image.alpha_composite(layer, body)
    d = ImageDraw.Draw(layer)
    # 肚皮高光
    d.ellipse((96 * SS, cy + 4 * SS, 210 * SS, cy + 44 * SS), fill=(255, 255, 255, 70))
    d.ellipse((110 * SS, cy - 44 * SS, 190 * SS, cy - 20 * SS), fill=(255, 255, 255, 90))
    if stripes:
        for x in (120, 150):
            d.arc((x * SS - 30 * SS, cy - 52 * SS, x * SS + 30 * SS, cy + 52 * SS), 250, 290, fill=(255, 255, 255, 120), width=7 * SS)
    # 腮
    d.arc((168 * SS, cy - 34 * SS, 210 * SS, cy + 30 * SS), 120, 240, fill=rgba(fin, 200), width=5 * SS)
    # 眼睛（大眼睛更可爱）
    ex, ey = 200 * SS, cy - 10 * SS
    d.ellipse((ex - 19 * SS, ey - 19 * SS, ex + 19 * SS, ey + 19 * SS), fill=(255, 255, 255, 255))
    d.ellipse((ex - 12 * SS, ey - 13 * SS, ex + 12 * SS, ey + 13 * SS), fill=rgba(0x13263d))
    d.ellipse((ex - 9 * SS, ey - 10 * SS, ex - 1 * SS, ey - 2 * SS), fill=(255, 255, 255, 255))
    d.ellipse((ex + 3 * SS, ey + 3 * SS, ex + 7 * SS, ey + 7 * SS), fill=(255, 255, 255, 220))
    # 腮红与嘴
    d.ellipse((186 * SS, cy + 12 * SS, 208 * SS, cy + 24 * SS), fill=(255, 150, 180, 150))
    d.arc((214 * SS, cy + 4 * SS, 230 * SS, cy + 20 * SS), 200, 340, fill=rgba(0x13263d), width=4 * SS)
    if crown:
        d.polygon([
            (120 * SS, cy - 50 * SS), (128 * SS, cy - 80 * SS), (140 * SS, cy - 58 * SS),
            (152 * SS, cy - 86 * SS), (164 * SS, cy - 58 * SS), (176 * SS, cy - 80 * SS), (184 * SS, cy - 50 * SS),
        ], fill=rgba(0xfff1a8))
        d.ellipse((147 * SS, cy - 72 * SS, 157 * SS, cy - 62 * SS), fill=rgba(0xff8fb1))
    return finish(layer, (size, round(size * 0.72)))


def treasure(size: int) -> Image.Image:
    W, H = 220 * SS, 200 * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 金光
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((20 * SS, 10 * SS, 200 * SS, 190 * SS), fill=(255, 220, 120, 90))
    layer = Image.alpha_composite(layer, glow.filter(ImageFilter.GaussianBlur(14 * SS)))
    d = ImageDraw.Draw(layer)
    # 箱体
    d.rounded_rectangle((36 * SS, 92 * SS, 184 * SS, 172 * SS), radius=14 * SS, fill=rgba(0x8a4f26))
    d.rounded_rectangle((36 * SS, 92 * SS, 184 * SS, 112 * SS), radius=6 * SS, fill=rgba(0xa8642f))
    # 盖子
    d.rounded_rectangle((30 * SS, 46 * SS, 190 * SS, 100 * SS), radius=26 * SS, fill=rgba(0x6e3b1b))
    d.rounded_rectangle((40 * SS, 54 * SS, 180 * SS, 70 * SS), radius=8 * SS, fill=(255, 255, 255, 40))
    # 金边与锁
    for x0 in (52, 156):
        d.rectangle((x0 * SS, 46 * SS, (x0 + 12) * SS, 172 * SS), fill=rgba(0xffd166))
    d.rectangle((30 * SS, 92 * SS, 190 * SS, 102 * SS), fill=rgba(0xffd166))
    d.rounded_rectangle((92 * SS, 84 * SS, 128 * SS, 124 * SS), radius=8 * SS, fill=rgba(0xffe9a8))
    d.ellipse((104 * SS, 96 * SS, 116 * SS, 108 * SS), fill=rgba(0x5c341a))
    # 宝石
    d.ellipse((66 * SS, 128 * SS, 86 * SS, 148 * SS), fill=rgba(0x7fd2f0))
    d.ellipse((134 * SS, 128 * SS, 154 * SS, 148 * SS), fill=rgba(0xff8fb1))
    d.ellipse((69 * SS, 131 * SS, 76 * SS, 138 * SS), fill=(255, 255, 255, 220))
    # 闪光
    for (sx, sy, r) in ((180, 40, 10), (40, 34, 7)):
        d.polygon([(sx * SS, (sy - r) * SS), ((sx + 2) * SS, (sy - 2) * SS), ((sx + r) * SS, sy * SS),
                   ((sx + 2) * SS, (sy + 2) * SS), (sx * SS, (sy + r) * SS), ((sx - 2) * SS, (sy + 2) * SS),
                   ((sx - r) * SS, sy * SS), ((sx - 2) * SS, (sy - 2) * SS)], fill=(255, 255, 255, 240))
    return finish(layer, (size, round(size * 0.9)))


def pearl(size: int) -> Image.Image:
    W = H = 200 * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((10 * SS, 10 * SS, 190 * SS, 190 * SS), fill=(180, 235, 255, 120))
    layer = Image.alpha_composite(layer, glow.filter(ImageFilter.GaussianBlur(16 * SS)))
    # 贝壳
    d = ImageDraw.Draw(layer)
    d.pieslice((24 * SS, 96 * SS, 176 * SS, 190 * SS), 0, 180, fill=rgba(0xffb3c7))
    for i in range(-2, 3):
        d.line([(100 * SS, 143 * SS), ((100 + i * 30) * SS, 186 * SS)], fill=rgba(0xff8fb1), width=4 * SS)
    # 珍珠
    p = gradient_ellipse((W, H), (52 * SS, 50 * SS, 148 * SS, 146 * SS), 0xffffff, 0xbfe6ff)
    layer = Image.alpha_composite(layer, p)
    d = ImageDraw.Draw(layer)
    d.ellipse((70 * SS, 66 * SS, 102 * SS, 92 * SS), fill=(255, 255, 255, 230))
    d.arc((60 * SS, 60 * SS, 140 * SS, 140 * SS), 20, 110, fill=(255, 255, 255, 140), width=4 * SS)
    return finish(layer, (size, size))


def boot(size: int) -> Image.Image:
    W, H = 220 * SS, 220 * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 靴筒
    d.rounded_rectangle((58 * SS, 18 * SS, 124 * SS, 128 * SS), radius=18 * SS, fill=rgba(0x8a6a4f))
    d.rounded_rectangle((66 * SS, 24 * SS, 90 * SS, 120 * SS), radius=10 * SS, fill=(255, 255, 255, 46))
    # 鞋口翻边
    d.rounded_rectangle((52 * SS, 14 * SS, 130 * SS, 38 * SS), radius=10 * SS, fill=rgba(0xa98564))
    # 脚掌与圆头
    d.rounded_rectangle((58 * SS, 104 * SS, 178 * SS, 154 * SS), radius=24 * SS, fill=rgba(0x8a6a4f))
    d.ellipse((146 * SS, 104 * SS, 182 * SS, 154 * SS), fill=rgba(0x8a6a4f))
    # 鞋跟
    d.rounded_rectangle((52 * SS, 140 * SS, 100 * SS, 172 * SS), radius=6 * SS, fill=rgba(0x5f4532))
    # 鞋底
    d.rounded_rectangle((56 * SS, 154 * SS, 184 * SS, 176 * SS), radius=10 * SS, fill=rgba(0x463227))
    # 鞋带
    for y in (48, 70, 92):
        d.line([(92 * SS, y * SS), (124 * SS, (y + 8) * SS)], fill=rgba(0xf2d9b8), width=5 * SS)
        d.line([(92 * SS, (y + 8) * SS), (124 * SS, y * SS)], fill=rgba(0xf2d9b8), width=5 * SS)
    # 补丁
    d.rectangle((132 * SS, 118 * SS, 158 * SS, 140 * SS), fill=rgba(0xb5926f))
    d.line([(136 * SS, 122 * SS), (154 * SS, 136 * SS)], fill=rgba(0x5f4532), width=3 * SS)
    # 头上的水草
    d.line([(70 * SS, 18 * SS), (56 * SS, -2 * SS)], fill=rgba(0x3fbf8a), width=7 * SS)
    d.line([(84 * SS, 16 * SS), (92 * SS, -6 * SS)], fill=rgba(0x2f9e74), width=6 * SS)
    # 委屈的小脸
    d.ellipse((128 * SS, 62 * SS, 136 * SS, 70 * SS), fill=rgba(0x2a1d14))
    d.ellipse((150 * SS, 62 * SS, 158 * SS, 70 * SS), fill=rgba(0x2a1d14))
    d.arc((132 * SS, 74 * SS, 154 * SS, 92 * SS), 200, 340, fill=rgba(0x2a1d14), width=4 * SS)
    d.ellipse((118 * SS, 74 * SS, 128 * SS, 84 * SS), fill=(255, 150, 180, 120))
    return finish(layer, (size, size))


def hook_sprite(size: int) -> Image.Image:
    W, H = 120 * SS, 200 * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # 浮漂
    d.ellipse((38 * SS, 8 * SS, 82 * SS, 52 * SS), fill=rgba(0xff6f91))
    d.chord((38 * SS, 8 * SS, 82 * SS, 52 * SS), 0, 180, fill=(255, 255, 255, 255))
    d.ellipse((48 * SS, 16 * SS, 60 * SS, 26 * SS), fill=(255, 255, 255, 200))
    # 钩身
    d.line([(60 * SS, 52 * SS), (60 * SS, 140 * SS)], fill=rgba(0xdfe9f2), width=9 * SS)
    d.arc((28 * SS, 112 * SS, 92 * SS, 186 * SS), 0, 200, fill=rgba(0xdfe9f2), width=9 * SS)
    d.polygon([(28 * SS, 148 * SS), (18 * SS, 128 * SS), (40 * SS, 140 * SS)], fill=rgba(0xdfe9f2))
    return finish(layer, (round(size * 0.6), size), outline=4)


def boat(width: int) -> Image.Image:
    W, H = 420 * SS, 150 * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.polygon([(10 * SS, 40 * SS), (410 * SS, 40 * SS), (360 * SS, 140 * SS), (60 * SS, 140 * SS)], fill=rgba(0x8a5a36))
    d.polygon([(10 * SS, 40 * SS), (410 * SS, 40 * SS), (396 * SS, 66 * SS), (24 * SS, 66 * SS)], fill=rgba(0xb07a4a))
    for x in range(70, 360, 58):
        d.line([(x * SS, 70 * SS), ((x + 6) * SS, 136 * SS)], fill=rgba(0x6b4226), width=4 * SS)
    d.rounded_rectangle((0, 28 * SS, 420 * SS, 46 * SS), radius=8 * SS, fill=rgba(0xd9a066))
    # 救生圈
    d.ellipse((300 * SS, 70 * SS, 350 * SS, 120 * SS), fill=rgba(0xff6f91))
    d.ellipse((314 * SS, 84 * SS, 336 * SS, 106 * SS), fill=rgba(0x8a5a36))
    for a in (45, 135, 225, 315):
        r = math.radians(a)
        cx, cy = 325 * SS, 95 * SS
        d.line([(cx + math.cos(r) * 14 * SS, cy + math.sin(r) * 14 * SS), (cx + math.cos(r) * 25 * SS, cy + math.sin(r) * 25 * SS)], fill=(255, 255, 255, 255), width=6 * SS)
    return finish(layer, (width, round(width * 0.36)), outline=4)


def panel(w: int, h: int, fill_top: int, fill_bottom: int, border: int, radius: int) -> Image.Image:
    """九宫格面板/按钮底图（不加外描边，边框由自身绘制）。"""
    W, H = w * SS, h * SS
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=radius * SS, fill=255)
    grad = Image.new("RGBA", (W, H))
    gd = ImageDraw.Draw(grad)
    for y in range(H):
        t = y / max(1, H - 1)
        c = tuple(int(rgba(fill_top)[i] * (1 - t) + rgba(fill_bottom)[i] * t) for i in range(3)) + (255,)
        gd.line([(0, y), (W, y)], fill=c)
    layer.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle((2 * SS, 2 * SS, W - 2 * SS, H - 2 * SS), radius=(radius - 2) * SS, outline=rgba(border), width=3 * SS)
    # 顶部一道很淡的高光；九宫格拉伸时不会形成明显色带
    d.rounded_rectangle((8 * SS, 6 * SS, W - 8 * SS, int(H * 0.22)), radius=(radius - 4) * SS, fill=(255, 255, 255, 14))
    return layer.resize((w, h), Image.LANCZOS)


def background(width: int, height: int, sky_top: int, sky_bottom: int, water_top: int, water_bottom: int, water_line: int, seed: int) -> Image.Image:
    import random

    rnd = random.Random(seed)
    img = Image.new("RGBA", (width, height))
    d = ImageDraw.Draw(img)
    for y in range(height):
        if y < water_line:
            t = y / max(1, water_line)
            a, b = rgba(sky_top), rgba(sky_bottom)
        else:
            t = (y - water_line) / max(1, height - water_line)
            a, b = rgba(water_top), rgba(water_bottom)
        d.line([(0, y), (width, y)], fill=tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3)) + (255,))
    # 星星
    for _ in range(70):
        x, y = rnd.randrange(width), rnd.randrange(int(water_line * 0.85))
        r = rnd.choice((1, 1, 1, 2))
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, rnd.randrange(120, 230)))
    # 光柱
    rays = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for i in range(6):
        x = int(width * (0.08 + i * 0.17)) + rnd.randrange(-20, 20)
        rd.polygon([(x, water_line), (x + 34, water_line), (x + 120, height), (x - 40, height)], fill=(170, 230, 255, 22))
    img = Image.alpha_composite(img, rays.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(img)
    # 海面高光带
    for x in range(0, width, 46):
        d.arc((x, water_line - 6, x + 46, water_line + 10), 200, 340, fill=(200, 240, 255, 120), width=2)
    # 远处礁石与珊瑚
    base = height - 40
    for i in range(9):
        cx = int(width * i / 8) + rnd.randrange(-30, 30)
        r = rnd.randrange(46, 96)
        d.ellipse((cx - r, base - r // 2, cx + r, base + r), fill=rgba(water_bottom, 255))
    coral = [0xff8fb1, 0xffb36b, 0xb48cff, 0x5fd3b0]
    for i in range(11):
        cx = rnd.randrange(20, width - 20)
        color = rgba(rnd.choice(coral), 200)
        h = rnd.randrange(40, 90)
        for k in range(3):
            ang = math.radians(-90 + (k - 1) * 28)
            d.line([(cx, base), (cx + math.cos(ang) * h * 0.6, base + math.sin(ang) * h)], fill=color, width=7)
        d.ellipse((cx - 6, base - h - 4, cx + 6, base - h + 8), fill=color)
    # 海底
    d.rectangle((0, height - 34, width, height), fill=rgba(0x0a1f2e))
    for x in range(0, width, 18):
        d.ellipse((x, height - 40, x + 30, height - 26), fill=rgba(0x13324a))
    return img


def save(img: Image.Image, rel: str, quality: int = 88) -> None:
    path = OUT / rel
    ensure_dir(path.parent)
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"  {rel:38s} {img.size[0]}x{img.size[1]}  {os.path.getsize(path) // 1024} KiB")


def main() -> int:
    print("生成精灵图 ->", OUT)
    save(fish(0x8fdcff, 0x3fa6e8, 0x2f8fd8, 128), "items/fish-small.webp")
    save(fish(0x6fb8ff, 0x2a62c8, 0x1f4fa8, 160, stripes=True), "items/fish-big.webp")
    save(fish(0xfff1a8, 0xffb627, 0xff9a1f, 128, crown=True), "items/fish-golden.webp")
    save(treasure(140), "items/treasure.webp")
    save(pearl(128), "items/pearl.webp")
    save(boot(128), "items/boot.webp")
    save(hook_sprite(72), "items/hook.webp")
    save(boat(300), "scene/boat.webp")

    save(panel(240, 72, 0x2b78b8, 0x16466f, 0xbfe9ff, 22), "ui/button.webp", quality=92)
    save(panel(240, 72, 0xff9bbb, 0xd95d86, 0xffe1ea, 22), "ui/button-primary.webp", quality=92)
    save(panel(360, 120, 0x0f2f4f, 0x0a1f36, 0x7fc7ef, 24), "ui/panel.webp", quality=92)

    palettes = [
        ("bg-1", 0x0b1630, 0x1c3e6a, 0x1f6f9a, 0x0a2a44),
        ("bg-2", 0x101a3a, 0x2b4f7a, 0x1f8a92, 0x0b3340),
        ("bg-3", 0x050b1c, 0x14254a, 0x123a66, 0x040f22),
    ]
    for index, (name, st, sb, wt, wb) in enumerate(palettes, start=1):
        save(background(960, 640, st, sb, wt, wb, 186, seed=index), f"scene/{name}-landscape.webp", quality=80)
        save(background(640, 960, st, sb, wt, wb, 232, seed=index + 10), f"scene/{name}-portrait.webp", quality=80)

    total = sum(p.stat().st_size for p in OUT.rglob("*.webp"))
    print(f"总计 {total // 1024} KiB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
