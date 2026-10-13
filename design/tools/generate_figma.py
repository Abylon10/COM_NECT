"""
Generates the Figma-importable SVG screens in design/figma/.

    python3 design/tools/generate_figma.py <path-to-inter-woff-dir>

The Inter .woff files (from the @fontsource/inter npm package) are only used
to measure text so centered/wrapped text lines up; the SVGs themselves just
say font-family="Inter", which Figma has built in.

One layout definition per screen is rendered in two skins:
  - wireframe: grayscale, image placeholders, paragraph lines
  - hi-fi: the app's real theme (light, plus dark samples)
"""

import base64
import json
import os
import sys
from xml.sax.saxutils import escape

from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'design', 'figma')
ICONS = json.load(open(os.path.join(TOOLS, 'icons.json')))
LOGO = base64.b64encode(
    open(os.path.join(ROOT, 'assets', 'images', 'brand', 'logo-mark@3x.png'), 'rb').read()
).decode()

W, H = 390, 844  # iPhone 14 / 15 frame
FONT = 'Inter'

# ---------------------------------------------------------------------------
# Text metrics
# ---------------------------------------------------------------------------

_fonts = {}


def load_fonts(font_dir):
    for weight in (400, 500, 600, 700):
        f = TTFont(os.path.join(font_dir, f'inter-latin-{weight}-normal.woff'))
        _fonts[weight] = (f.getBestCmap(), f['hmtx'].metrics, f['head'].unitsPerEm)


def text_width(s, size, weight=400):
    cmap, hmtx, upm = _fonts[min(_fonts, key=lambda w: abs(w - weight))]
    total = 0
    for ch in s:
        glyph = cmap.get(ord(ch)) or cmap.get(ord('n'))
        total += hmtx[glyph][0]
    return total / upm * size


def wrap(s, width, size, weight=400):
    lines, line = [], ''
    for word in s.split():
        trial = f'{line} {word}'.strip()
        if line and text_width(trial, size, weight) > width:
            lines.append(line)
            line = word
        else:
            line = trial
    if line:
        lines.append(line)
    return lines


# ---------------------------------------------------------------------------
# Palettes
# ---------------------------------------------------------------------------

LIGHT = dict(
    text='#11181C', background='#FFFFFF', backgroundElement='#F2F5F5', textSecondary='#60686C',
    border='#E3E8E8', card='#FFFFFF', primary='#1F9E96', primarySoft='#E3F4F3', onPrimary='#FFFFFF',
    danger='#E5484D', dangerSoft='#FDECEC', warning='#F5A524', warningSoft='#FEF4E1',
)
DARK = dict(
    text='#ECEDEE', background='#0E1415', backgroundElement='#1A2223', textSecondary='#A3ADB0',
    border='#253031', card='#151C1D', primary='#38BDB4', primarySoft='#173634', onPrimary='#06201E',
    danger='#FF6369', dangerSoft='#3B1C1E', warning='#FFB547', warningSoft='#3A2D14',
)
WIRE = dict(
    text='#212121', background='#FFFFFF', backgroundElement='#F2F2F2', textSecondary='#757575',
    border='#BDBDBD', card='#FFFFFF', primary='#5F5F5F', primarySoft='#E6E6E6', onPrimary='#FFFFFF',
    danger='#5F5F5F', dangerSoft='#EEEEEE', warning='#8A8A8A', warningSoft='#EEEEEE',
)

CATEGORY = {
    'youth': ('Youth', 'groups', '#1F9E96'),
    'educational': ('Educational', 'school', '#3E7BD6'),
    'sports': ('Sports', 'sports_basketball', '#E07A2F'),
    'cultural': ('Cultural', 'theater_comedy', '#A3509C'),
    'volunteer': ('Volunteer', 'volunteer_activism', '#3F9C5A'),
}

# ---------------------------------------------------------------------------
# Mock content (mirrors src/data/events.ts)
# ---------------------------------------------------------------------------

EVENTS = {
    'summit': dict(
        title='Youth Leadership Summit 2026', org='SK Federation of Naval', cat='youth',
        date='Sat, Oct 10, 2026', time='8:00 AM', end='5:00 PM', month='OCT', day='10',
        venue='NSU Gymnasium', location='Brgy. Caraycaray, Naval', going=49, interested=31,
        status='scheduled',
        desc='A one-day summit for young leaders aged 15–24. Talks from local officials and '
             'student leaders, workshops on project planning and public speaking, and a '
             'networking lunch.',
        join='Free. Pre-register at your barangay SK office or through the SK Federation page '
             'before Oct 8. Bring a valid school or government ID.',
        org_desc='Sangguniang Kabataan federation coordinating youth programs across Naval.',
        contact='sk.naval@example.com · 0917 000 0001',
    ),
    'scholarship': dict(
        title='Scholarship Info Session', org='Naval Youth Development Office', cat='educational',
        date='Wed, Oct 14, 2026', time='2:00 PM', end='4:00 PM', month='OCT', day='14',
        venue='Municipal Session Hall', location='Brgy. P.I. Garcia, Naval', going=22,
        interested=40, status='scheduled',
    ),
    'cleanup': dict(
        title='Coastal Cleanup Drive', org='Biliran Coastal Volunteers', cat='volunteer',
        date='Sat, Oct 17, 2026', time='6:00 AM', end='10:00 AM', month='OCT', day='17',
        venue='Atipolo Shoreline', location='Brgy. Atipolo, Naval', going=35, interested=18,
        status='scheduled',
    ),
    'cultural': dict(
        title='Biliranon Cultural Night', org='Kultura Biliran Arts Collective', cat='cultural',
        date='Sat, Nov 7, 2026', time='6:00 PM', end='10:00 PM', month='NOV', day='7',
        venue='Provincial Capitol Grounds', location='Brgy. Larrazabal, Naval', going=75,
        interested=90, status='postponed',
        note='Postponed from Oct 3 because of rain. Now happening on Nov 7.',
    ),
}

# ---------------------------------------------------------------------------
# SVG canvas
# ---------------------------------------------------------------------------


class Canvas:
    def __init__(self, pal, wire=False):
        self.p = pal
        self.wire = wire
        self.out = []
        self.defs = []
        self.names = {}

    # Unique ids double as Figma layer names.
    def nid(self, name):
        n = self.names.get(name, 0)
        self.names[name] = n + 1
        name = name if n == 0 else f'{name} {n + 1}'
        return escape(name.replace('"', ''), {'"': ''})

    def c(self, key):
        return self.p.get(key, key)

    def begin(self, name, transform=None, clip=None, opacity=None):
        attrs = f' id="{self.nid(name)}"'
        if transform:
            attrs += f' transform="{transform}"'
        if clip:
            attrs += f' clip-path="url(#{clip})"'
        if opacity is not None:
            attrs += f' opacity="{opacity}"'
        self.out.append(f'<g{attrs}>')

    def end(self):
        self.out.append('</g>')

    def clip_rect(self, x, y, w, h, r=0):
        cid = f'clip{len(self.defs) + 1}'
        self.defs.append(
            f'<clipPath id="{cid}"><rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" '
            f'rx="{r:g}"/></clipPath>'
        )
        return cid

    def rect(self, x, y, w, h, r=0, fill=None, stroke=None, sw=1, name='Rectangle', opacity=None):
        a = f'id="{self.nid(name)}" x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}"'
        if r:
            a += f' rx="{r:g}"'
        a += f' fill="{self.c(fill)}"' if fill else ' fill="none"'
        if stroke:
            a += f' stroke="{self.c(stroke)}" stroke-width="{sw:g}"'
        if opacity is not None:
            a += f' fill-opacity="{opacity}"'
        self.out.append(f'<rect {a}/>')

    def circle(self, cx, cy, r, fill=None, stroke=None, sw=1, name='Ellipse'):
        a = f'id="{self.nid(name)}" cx="{cx:g}" cy="{cy:g}" r="{r:g}"'
        a += f' fill="{self.c(fill)}"' if fill else ' fill="none"'
        if stroke:
            a += f' stroke="{self.c(stroke)}" stroke-width="{sw:g}"'
        self.out.append(f'<circle {a}/>')

    def line(self, x1, y1, x2, y2, stroke='border', sw=1, name='Line'):
        self.out.append(
            f'<line id="{self.nid(name)}" x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" '
            f'stroke="{self.c(stroke)}" stroke-width="{sw:g}"/>'
        )

    def path(self, d, fill=None, stroke=None, sw=1, name='Vector'):
        a = f'id="{self.nid(name)}" d="{d}"'
        a += f' fill="{self.c(fill)}"' if fill else ' fill="none"'
        if stroke:
            a += f' stroke="{self.c(stroke)}" stroke-width="{sw:g}" stroke-linejoin="round"'
        self.out.append(f'<path {a}/>')

    def text(self, x, y, s, size=14, weight=400, fill='text', anchor='start', name=None,
             opacity=None):
        """`y` is the baseline. Anchors are resolved here so Figma gets plain left-aligned text."""
        w = text_width(s, size, weight)
        if anchor == 'middle':
            x -= w / 2
        elif anchor == 'end':
            x -= w
        a = (f'id="{self.nid(name or s[:40])}" x="{x:.1f}" y="{y:.1f}" font-family="{FONT}" '
             f'font-size="{size:g}" font-weight="{weight}" fill="{self.c(fill)}"')
        if opacity is not None:
            a += f' fill-opacity="{opacity}"'
        self.out.append(f'<text {a}>{escape(s)}</text>')
        return w

    def para(self, x, y, s, width, size=14, lh=22, fill='text', weight=400):
        """Wrapped text block starting at top `y`. Wireframes show gray lines instead."""
        lines = wrap(s, width, size, weight)
        if self.wire:
            self.begin('Paragraph placeholder')
            for i, ln in enumerate(lines):
                lw = width if i < len(lines) - 1 else max(40, text_width(ln, size, weight))
                self.rect(x, y + i * lh + (lh - 8) / 2, lw, 8, 4, fill='#DDDDDD', name='Text line')
            self.end()
        else:
            self.begin('Paragraph')
            for i, ln in enumerate(lines):
                self.text(x, y + i * lh + lh / 2 + size * 0.36, ln, size, weight, fill)
            self.end()
        return y + len(lines) * lh

    def icon(self, name, x, y, size=20, fill='text', opacity=None):
        s = size / 24
        op = f' fill-opacity="{opacity}"' if opacity is not None else ''
        self.out.append(
            f'<path id="{self.nid("icon/" + name)}" transform="translate({x:g} {y:g}) scale({s:.4f})" '
            f'd="{ICONS[name]}" fill="{self.c(fill)}"{op}/>'
        )

    def logo(self, x, y, size):
        if self.wire:
            self.rect(x, y, size, size, size * 0.25, fill='#E6E6E6', stroke='#BDBDBD', name='Logo')
            self.line(x, y, x + size, y + size, '#BDBDBD', name='Logo X')
            self.line(x + size, y, x, y + size, '#BDBDBD', name='Logo X')
        else:
            self.out.append(
                f'<image id="{self.nid("Logo")}" x="{x:g}" y="{y:g}" width="{size:g}" '
                f'height="{size:g}" href="data:image/png;base64,{LOGO}"/>'
            )

    def svg(self, w, h, name, bg=None):
        defs = f'<defs>{"".join(self.defs)}</defs>' if self.defs else ''
        bg_rect = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ''
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" '
            f'viewBox="0 0 {w} {h}">\n<title>{escape(name)}</title>\n{defs}\n{bg_rect}\n'
            + '\n'.join(self.out) + '\n</svg>\n'
        )


# ---------------------------------------------------------------------------
# Components
# ---------------------------------------------------------------------------


def text_center_baseline(top, h, size):
    return top + h / 2 + size * 0.36


def status_bar(c, light_content=False):
    fill = '#FFFFFF' if light_content else 'text'
    c.begin('Status bar')
    c.text(56, 33, '9:41', 16, 600, fill, 'middle', name='Time')
    for i in range(4):
        c.rect(296 + i * 5, 29 - (i + 1) * 3, 3, (i + 1) * 3, 1, fill=fill, name='Signal')
    c.rect(322, 21, 25, 12, 3.5, stroke=fill, name='Battery')
    c.rect(324, 23, 19, 8, 2, fill=fill, name='Battery level')
    c.rect(348, 25, 2, 4, 1, fill=fill, name='Battery cap')
    c.end()


def home_indicator(c):
    c.rect(128, 830, 134, 5, 2.5, fill='text', name='Home indicator')


def tab_bar(c, active):
    c.begin('Tab bar')
    c.rect(0, 761, W, 83, fill='background', name='Tab bar background')
    c.line(0, 761, W, 761, 'border', name='Divider')
    tabs = [('Browse', 'event', 'event'), ('Saved', 'bookmark_border', 'bookmark'),
            ('Profile', 'person', 'person')]
    for i, (label, ic, ic_active) in enumerate(tabs):
        cx = 65 + i * 130
        on = label == active
        color = 'primary' if on else 'textSecondary'
        c.begin(f'Tab/{label}')
        if on:
            c.rect(cx - 30, 767, 60, 32, 16, fill='primarySoft', name='Indicator')
        c.icon(ic_active if on else ic, cx - 13, 770, 26, color)
        c.text(cx, 816, label, 11, 600 if on else 500, color, 'middle')
        c.end()
    c.end()
    home_indicator(c)


def chip(c, x, y, label, selected=False, h=34):
    w = text_width(label, 13, 600) + 32
    c.begin(f'Chip/{label}')
    if selected:
        c.rect(x, y, w, h, h / 2, fill='primary', name='Chip background')
    else:
        c.rect(x, y, w, h, h / 2, fill='background', stroke='border', name='Chip background')
    c.text(x + 16, text_center_baseline(y, h, 13), label, 13, 600,
           'onPrimary' if selected else 'textSecondary')
    c.end()
    return w


def chip_wrap(c, x, y, max_w, labels, selected, gap=8):
    cx, cy = x, y
    for label in labels:
        w = text_width(label, 13, 600) + 32
        if cx > x and cx + w > x + max_w:
            cx, cy = x, cy + 34 + gap
        chip(c, cx, cy, label, label == selected)
        cx += w + gap
    return cy + 34


def button(c, x, y, w, label, variant='solid', icon=None, h=40, disabled=False):
    c.begin(f'Button/{label}')
    if disabled:
        c.rect(x, y, w, h, h / 2, fill='backgroundElement', stroke='border', sw=1.5,
               name='Button background')
        color = 'textSecondary'
    elif variant == 'solid':
        c.rect(x, y, w, h, h / 2, fill='primary', stroke='primary', sw=1.5, name='Button background')
        color = 'onPrimary'
    else:
        c.rect(x, y, w, h, h / 2, stroke='primary', sw=1.5, name='Button background')
        color = 'primary'
    tw = text_width(label, 14, 600) + (20 if icon else 0)
    tx = x + (w - tw) / 2
    if icon:
        c.icon(icon, tx, y + h / 2 - 8, 16, color)
        tx += 20
    c.text(tx, text_center_baseline(y, h, 14), label, 14, 600, color)
    c.end()


def rsvp_buttons(c, x, y, w, response=None, disabled=False):
    bw = (w - 8) / 2
    button(c, x, y, bw, 'Interested', 'solid' if response == 'interested' else 'outline', 'star',
           disabled=disabled)
    button(c, x + bw + 8, y, bw, 'Going', 'solid' if response == 'going' else 'outline',
           'check_circle', disabled=disabled)


def tag(c, x, y, label, fill, opacity=None):
    w = text_width(label, 12, 700) + 20
    c.begin(f'Tag/{label}')
    c.rect(x, y, w, 22, 8, fill=fill, opacity=opacity, name='Tag background')
    c.text(x + 10, text_center_baseline(y, 22, 12), label, 12, 700, '#FFFFFF')
    c.end()
    return w


def info_row(c, x, y, icon, text, width=300):
    c.begin('Info row')
    c.icon(icon, x, y + 2, 16, 'textSecondary')
    lines = wrap(text, width - 24, 14)
    for i, ln in enumerate(lines):
        c.text(x + 24, y + 15 + i * 20, ln, 14, 400, 'textSecondary')
    c.end()
    return y + 20 * len(lines)


def cover(c, x, y, w, h, ev, rounded=True, saved=False, top_inset=0, back=False):
    label, ic, color = CATEGORY[ev['cat']]
    r = 12 if rounded else 0
    c.begin('Event cover')
    if c.wire:
        c.rect(x, y, w, h, r, fill='#EEEEEE', stroke='#BDBDBD', name='Image placeholder')
        c.line(x, y, x + w, y + h, '#CFCFCF', name='Placeholder X')
        c.line(x + w, y, x, y + h, '#CFCFCF', name='Placeholder X')
        tile_color = '#757575'
    else:
        clip = c.clip_rect(x, y, w, h, r)
        c.begin('Cover background', clip=clip)
        c.rect(x, y, w, h, r, fill=color, name='Category color')
        big = h * 0.75
        c.icon(ic, x + w - big + 16, y + h - big + 16, big, '#FFFFFF', opacity=0.18)
        c.end()
        tile_color = color
    top = y + 16 + top_inset
    bx = x + 16
    if back:
        c.begin('Back button')
        c.circle(bx + 19, top + 19, 19, fill='#FFFFFF', stroke='#DDDDDD' if c.wire else None)
        c.icon('arrow_back', bx + 9, top + 9, 20, '#11181C')
        c.end()
        bx += 38 + 8
        badge_y = top + 8
    else:
        badge_y = top
    if ev['status'] != 'scheduled':
        st = 'Cancelled' if ev['status'] == 'cancelled' else 'Postponed'
        bx += tag(c, bx, badge_y, st, 'danger' if st == 'Cancelled' else 'warning') + 8
    tag(c, bx, badge_y, label, '#000000' if not c.wire else '#9E9E9E', 0.22 if not c.wire else None)
    c.begin('Save button')
    c.circle(x + w - 16 - 17, top + 17, 17, fill='#FFFFFF', stroke='#DDDDDD' if c.wire else None)
    c.icon('bookmark_added' if saved else 'bookmark_border', x + w - 16 - 26, top + 8, 18,
           tile_color)
    c.end()
    ty = y + h - 16 - 50
    c.begin('Date tile')
    c.rect(x + 16, ty, 46, 50, 8, fill='#FFFFFF', stroke='#DDDDDD' if c.wire else None,
           name='Tile')
    c.text(x + 39, ty + 18, ev['month'], 12, 700, tile_color, 'middle')
    c.text(x + 39, ty + 41, ev['day'], 20, 700, '#11181C', 'middle')
    c.end()
    c.end()


def event_card(c, y, ev, response=None, saved=False):
    x, w = 16, W - 32
    c.begin(f'Event card/{ev["title"]}')
    body_top = y + 8 + 140 + 16
    bx, bw = x + 16, w - 32
    title_lines = wrap(ev['title'], bw, 17, 600)
    rows = [('calendar_today', f'{ev["date"]} · {ev["time"]}'),
            ('location_on', f'{ev["venue"]}, {ev["location"]}')]
    # Measure height first so the card background can be drawn behind everything.
    hgt = 22 * len(title_lines) + 4 + 20 + 16
    for _, t in rows:
        hgt += 20 * len(wrap(t, bw - 24, 14)) + 4
    hgt += 12 + (20 if ev.get('note') else 0) + 16 + 16 + 40
    card_h = 8 + 140 + 16 + hgt + 16
    c.rect(x, y, w, card_h, 16, fill='card', stroke='border', name='Card background')
    cover(c, x + 8, y + 8, w - 16, 140, ev, saved=saved)
    cy = body_top
    for ln in title_lines:
        c.text(bx, cy + 17, ln, 17, 600, 'text', name='Title')
        cy += 22
    cy += 4
    ow = c.text(bx, cy + 15, f'by {ev["org"]}', 14, 400, 'textSecondary', name='Organizer')
    c.icon('verified', bx + ow + 6, cy + 3, 14, 'primary')
    cy += 20 + 16
    for ic, t in rows:
        cy = info_row(c, bx, cy, ic, t, bw) + 4
    cy += 12
    if ev.get('note'):
        c.text(bx, cy + 12, ev['note'], 12, 500, 'warning', name='Status note')
        cy += 20
    going = ev['going'] + (1 if response == 'going' else 0)
    c.text(bx, cy + 12, f'{going} going · {ev["interested"]} interested', 12, 500,
           'textSecondary', name='RSVP counts')
    cy += 16 + 16
    rsvp_buttons(c, bx, cy, bw, response, disabled=ev['status'] == 'cancelled')
    c.end()
    return y + card_h


def app_header(c):
    c.begin('Header')
    c.begin('Avatar')
    c.circle(34, 73, 18, fill='primarySoft')
    c.text(34, 78, 'AR', 14, 700, 'primary', 'middle')
    c.end()
    bw = text_width('Community Connect', 18, 700)
    bx = (W - (28 + 8 + bw)) / 2 - 6
    c.logo(bx, 59, 28)
    c.text(bx + 36, 79, 'Community Connect', 18, 700, 'primary' if not c.wire else 'text',
           name='Brand')
    c.icon('dark_mode', 314, 62, 22, 'text')
    c.icon('notifications', 348, 62, 22, 'text')
    c.circle(366, 64, 4, fill='danger', name='Unread dot')
    c.end()


def search_bar(c, y, placeholder, filter_active=False):
    c.begin('Search')
    c.rect(16, y, 306, 44, 22, fill='background', stroke='border', name='Search field')
    c.icon('search', 32, y + 13, 18, 'textSecondary')
    c.text(58, text_center_baseline(y, 44, 15), placeholder, 15, 400, 'textSecondary',
           name='Placeholder')
    c.begin('Filter button')
    c.circle(352, y + 22, 22, fill='background',
             stroke='primary' if filter_active else 'border')
    c.icon('tune', 342, y + 12, 20, 'primary' if filter_active else 'textSecondary')
    c.end()
    c.end()


def screen_bg(c, name):
    c.rect(0, 0, W, H, fill='background', name=f'{name} background')


# ---------------------------------------------------------------------------
# Screens
# ---------------------------------------------------------------------------


def s_sign_in(c):
    screen_bg(c, 'Sign in')
    status_bar(c)
    c.logo(W / 2 - 48, 128, 96)
    c.text(W / 2, 270, 'Community Connect', 28, 700, 'text', 'middle', name='App name')
    y = 286
    for ln in wrap('Local events and trusted announcements for Naval, all in one place.',
                   W - 96, 15):
        c.text(W / 2, y + 16, ln, 15, 400, 'textSecondary', 'middle', name='Tagline')
        y += 22
    y += 32
    for label, ic, value, trailing in (
        ('Email', 'mail', 'you@example.com', None),
        ('Password', 'lock', '••••••••', 'visibility'),
    ):
        c.begin(f'Field/{label}')
        c.text(24, y + 14, label, 14, 600, 'text', name='Label')
        c.rect(24, y + 24, W - 48, 50, 12, fill='background', stroke='border', name='Input')
        c.icon(ic, 40, y + 39, 20, 'textSecondary')
        c.text(72, text_center_baseline(y + 24, 50, 15), value, 15, 400, 'textSecondary',
               name='Value')
        if trailing:
            c.icon(trailing, W - 64, y + 39, 20, 'textSecondary')
        c.end()
        y += 90
    c.text(W - 24, y + 4, 'Forgot password?', 14, 600, 'primary', 'end', name='Forgot password')
    y += 24
    button(c, 24, y, W - 48, 'Sign in', h=50)
    y += 62
    button(c, 24, y, W - 48, 'Create an account', 'outline', h=50)
    y += 78
    c.text(W / 2, y, 'Continue as guest', 15, 600, 'primary', 'middle', name='Guest link')
    y += 48
    c.begin('Organizer note')
    c.rect(24, y, W - 48, 64, 12, fill='primarySoft', name='Note background')
    c.icon('verified', 40, y + 22, 20, 'primary')
    c.para(72, y + 10, 'Organizers: your organization must be verified before you can post '
           'events.', W - 120, 13, 22, 'text')
    c.end()
    home_indicator(c)


def s_browse(c, dimmed=False):
    screen_bg(c, 'Browse')
    status_bar(c)
    app_header(c)
    search_bar(c, 107, 'Search events, organizers, venues', filter_active=dimmed)
    clip = c.clip_rect(0, 160, W, 50)
    c.begin('Category chips', clip=clip)
    x = 16
    for i, label in enumerate(['All', 'Youth', 'Educational', 'Sports', 'Cultural']):
        x += chip(c, x, 167, label, i == 0) + 8
    c.end()
    c.text(16, 231, '8 events', 12, 500, 'textSecondary', name='Result count')
    clip = c.clip_rect(0, 240, W, 521)
    c.begin('Event list', clip=clip)
    y = event_card(c, 244, EVENTS['summit'], 'going')
    event_card(c, y + 16, EVENTS['scholarship'])
    c.end()
    tab_bar(c, 'Browse')


def s_filters(c):
    s_browse(c, dimmed=True)
    c.rect(0, 0, W, H, fill='#000000', opacity=0.4, name='Backdrop')
    c.begin('Filter sheet')
    top = 236
    c.path(f'M0 {top + 24} Q0 {top} 24 {top} L{W - 24} {top} Q{W} {top} {W} {top + 24} '
           f'L{W} {H} L0 {H} Z', fill='background', name='Sheet background')
    c.rect(W / 2 - 18, top + 8, 36, 5, 2.5, fill='border', name='Grabber')
    c.text(24, top + 50, 'Filters', 20, 700, 'text', name='Sheet title')
    c.icon('close', W - 46, top + 32, 22, 'textSecondary')
    y = top + 82
    c.text(24, y, 'When', 14, 600, 'text', name='Section/When')
    y = chip_wrap(c, 24, y + 12, W - 48, ['Any time', 'Today', 'Next 7 days', 'Next 30 days'],
                  'Next 7 days') + 24
    c.text(24, y, 'Location', 14, 600, 'text', name='Section/Location')
    y = chip_wrap(c, 24, y + 12, W - 48, ['All locations', 'Brgy. Atipolo', 'Brgy. Caraycaray',
                                          'Brgy. Larrazabal', 'Brgy. P.I. Garcia'],
                  'Brgy. Caraycaray') + 24
    c.text(24, y, 'Organizer', 14, 600, 'text', name='Section/Organizer')
    chip_wrap(c, 24, y + 12, W - 48, ['All organizers', 'SK Federation of Naval',
                                      'NSU Computer Society', 'Biliran Red Cross Youth'],
              'All organizers')
    by = H - 34 - 16 - 48
    c.line(0, by - 16, W, by - 16, 'border', name='Divider')
    bw = (W - 48 - 8) / 2
    button(c, 24, by, bw, 'Reset', 'outline', h=48)
    button(c, 24 + bw + 8, by, bw, 'Show 3 events', h=48)
    c.end()
    home_indicator(c)


def s_details(c):
    ev = EVENTS['summit']
    screen_bg(c, 'Event details')
    cover(c, 0, 0, W, 267, ev, rounded=False, top_inset=47, back=True)
    status_bar(c, light_content=not c.wire)
    x, w = 16, W - 32
    y = 299
    for ln in wrap(ev['title'], w, 26, 700):
        c.text(x, y + 26, ln, 26, 700, 'text', name='Title')
        y += 32
    y += 6
    c.text(x, y + 18, f'{ev["going"]} going · {ev["interested"]} interested', 14, 400,
           'textSecondary', name='RSVP counts')
    y += 44
    c.begin('Details card')
    c.rect(x, y, w, 144, 12, fill='backgroundElement', name='Card background')
    ry = y + 16
    for ic, t in (('calendar_today', ev['date']), ('schedule', f'{ev["time"]} – {ev["end"]}'),
                  ('apartment', ev['venue']), ('location_on', ev['location'])):
        ry = info_row(c, x + 16, ry, ic, t, w - 32) + 8
    c.end()
    y += 144 + 28
    c.text(x, y + 17, 'About', 17, 600, 'text', name='Section/About')
    y = c.para(x, y + 30, ev['desc'], w) + 24
    c.text(x, y + 17, 'How to join', 17, 600, 'text', name='Section/How to join')
    c.para(x, y + 30, ev['join'], w)
    c.begin('Footer')
    c.rect(0, 746, W, 98, fill='background', name='Footer background')
    c.line(0, 746, W, 746, 'border', name='Divider')
    rsvp_buttons(c, 16, 762, W - 32, 'going')
    c.end()
    home_indicator(c)


def s_saved(c):
    screen_bg(c, 'Saved')
    status_bar(c)
    c.text(16, 95, 'My Events', 26, 700, 'text', name='Screen title')
    x = 16
    for i, label in enumerate(['Saved', 'Going', 'Interested']):
        x += chip(c, x, 115, label, i == 0) + 8
    clip = c.clip_rect(0, 160, W, 601)
    c.begin('Event list', clip=clip)
    y = event_card(c, 165, EVENTS['cleanup'], saved=True)
    event_card(c, y + 16, EVENTS['cultural'], 'interested', saved=True)
    c.end()
    tab_bar(c, 'Saved')


def s_notifications(c):
    screen_bg(c, 'Notifications')
    status_bar(c)
    c.begin('Nav bar')
    c.icon('arrow_back', 16, 61, 24, 'text')
    c.text(W / 2, 80, 'Notifications', 17, 600, 'text', 'middle', name='Screen title')
    c.text(W - 16, 80, 'Mark all read', 14, 600, 'primary', 'end', name='Mark all read')
    c.end()
    x = 16
    for i, label in enumerate(['All', 'Event updates', 'Reminders']):
        x += chip(c, x, 106, label, i == 0) + 8
    items = [
        ('update', 'warning', 'warningSoft', 'Schedule changed', 'Biliranon Cultural Night moved '
         'to Sat, Nov 7 · 6:00 PM.', '2h ago', True),
        ('cancel', 'danger', 'dangerSoft', 'Event cancelled', 'Run for a Cause 5K was cancelled '
         'due to the weather advisory.', '5h ago', True),
        ('schedule', 'primary', 'primarySoft', 'Reminder: tomorrow', 'Youth Leadership Summit '
         'starts at 8:00 AM at NSU Gymnasium.', '1d ago', False),
        ('volunteer_activism', 'primary', 'primarySoft', 'New in Volunteer', 'Community Blood '
         'Donation Drive was posted by Biliran Red Cross Youth.', '2d ago', False),
    ]
    y = 156
    for ic, fg, bg, title, body, when, unread in items:
        c.begin(f'Notification/{title}')
        lines = wrap(body, W - 16 - 72 - 24, 14)
        h = 16 + 20 + 20 * len(lines) + 20 + 16
        if unread and not c.wire:
            c.rect(0, y, W, h, fill='primarySoft', opacity=0.45, name='Unread background')
        c.circle(40, y + 36, 22, fill=bg)
        c.icon(ic, 29, y + 25, 22, fg)
        c.text(72, y + 30, title, 15, 600, 'text', name='Title')
        for i, ln in enumerate(lines):
            c.text(72, y + 52 + i * 20, ln, 14, 400, 'textSecondary')
        c.text(72, y + 52 + 20 * len(lines) + 2, when, 12, 500, 'textSecondary', name='Time')
        if unread:
            c.circle(W - 20, y + 25, 5, fill='primary', name='Unread dot')
        c.line(72, y + h, W, y + h, 'border', name='Divider')
        c.end()
        y += h
    c.text(W / 2, y + 40, 'You get alerts for events you saved or RSVP’d to.', 13, 400,
           'textSecondary', 'middle', name='Footnote')
    home_indicator(c)


def s_profile(c):
    screen_bg(c, 'Profile')
    status_bar(c)
    c.text(W / 2, 84, 'Profile', 17, 600, 'text', 'middle', name='Screen title')
    c.begin('Identity')
    c.circle(W / 2, 154, 48, fill='primarySoft', name='Avatar')
    c.text(W / 2, 167, 'AR', 36, 700, 'primary', 'middle', name='Initials')
    c.text(W / 2, 232, 'Ashley Reyes', 20, 700, 'text', 'middle', name='Name')
    c.text(W / 2, 256, 'ashley@example.com', 14, 400, 'textSecondary', 'middle', name='Email')
    tw = text_width('Resident', 12, 700) + 20
    tag(c, W / 2 - tw / 2, 268, 'Resident', 'primary')
    c.text(W / 2, 312, 'Brgy. Caraycaray, Naval', 12, 500, 'textSecondary', 'middle',
           name='Location')
    c.end()
    c.begin('Stats')
    c.rect(16, 332, W - 32, 76, 16, fill='backgroundElement', name='Stats background')
    for i, (n, label) in enumerate((('2', 'Saved'), ('1', 'Going'), ('1', 'Interested'))):
        cx = 16 + (W - 32) / 6 * (2 * i + 1)
        c.text(cx, 366, n, 20, 700, 'primary', 'middle', name=f'{label} count')
        c.text(cx, 388, label, 12, 500, 'textSecondary', 'middle')
    c.end()
    y = 432
    c.begin('Appearance')
    c.icon('contrast', 24, y, 20, 'textSecondary')
    c.text(56, y + 15, 'Appearance', 15, 400, 'text')
    x = 24
    for i, label in enumerate(['System', 'Day', 'Night']):
        x += chip(c, x, y + 32, label, i == 0) + 8
    c.line(16, y + 82, W - 16, y + 82, 'border', name='Divider')
    c.end()
    y += 82
    for ic, label, danger in (('edit', 'Edit Profile', False),
                              ('campaign', 'Organizer Tools', False),
                              ('notifications', 'Notifications', False),
                              ('privacy_tip', 'Privacy Policy', False),
                              ('logout', 'Log Out', True)):
        c.begin(f'Menu/{label}')
        color = 'danger' if danger else 'text'
        c.icon(ic, 24, y + 16, 20, 'danger' if danger else 'textSecondary')
        c.text(56, y + 31, label, 15, 400, color)
        if not danger:
            c.icon('chevron_right', W - 40, y + 18, 16, 'textSecondary')
            c.line(16, y + 52, W - 16, y + 52, 'border', name='Divider')
        c.end()
        y += 52
    tab_bar(c, 'Profile')


def s_create_event(c):
    screen_bg(c, 'Create event')
    status_bar(c)
    c.begin('Nav bar')
    c.icon('close', 16, 61, 24, 'text')
    c.text(W / 2, 80, 'New Event', 17, 600, 'text', 'middle', name='Screen title')
    c.end()
    c.begin('Posting as')
    c.rect(16, 104, W - 32, 52, 12, fill='primarySoft', name='Org background')
    c.text(32, 125, 'Posting as', 12, 500, 'textSecondary')
    ow = c.text(32, 144, 'SK Federation of Naval', 15, 600, 'text', name='Organization')
    c.icon('verified', 32 + ow + 8, 130, 16, 'primary')
    c.icon('expand_more', W - 48, 118, 24, 'textSecondary')
    c.end()

    def field(y, label, value, h=48, icon=None, placeholder=True, half=None):
        x, w = (16, W - 32) if half is None else ((16, (W - 40) / 2) if half == 0
                                                  else (16 + (W - 40) / 2 + 8, (W - 40) / 2))
        c.begin(f'Field/{label}')
        c.text(x, y + 14, label, 13, 600, 'text', name='Label')
        c.rect(x, y + 22, w, h, 12, fill='background', stroke='border', name='Input')
        tx = x + 14
        if icon:
            c.icon(icon, x + 12, y + 22 + 14, 20, 'textSecondary')
            tx += 28
        c.text(tx, y + 22 + 30, value, 15, 400, 'textSecondary' if placeholder else 'text',
               name='Value')
        c.end()
        return y + 22 + h + 16

    y = field(172, 'Title', 'Youth Leadership Summit 2026', placeholder=False)
    c.text(16, y + 14, 'Category', 13, 600, 'text', name='Label/Category')
    x = 16
    for label in ['Youth', 'Educational', 'Sports', 'Cultural']:
        x += chip(c, x, y + 22, label, label == 'Youth') + 8
    y += 22 + 34 + 16
    field(y, 'Date', 'Oct 10, 2026', icon='calendar_today', placeholder=False, half=0)
    y = field(y, 'Time', '8 AM – 5 PM', icon='schedule', placeholder=False, half=1)
    y = field(y, 'Venue', 'e.g. NSU Gymnasium', icon='apartment')
    y = field(y, 'Location', 'Select barangay', icon='location_on')
    c.icon('expand_more', W - 52, y - 16 - 48 + 12, 24, 'textSecondary')
    field(y, 'Description', 'What will happen at this event?', h=88)
    c.begin('Footer')
    c.rect(0, 746, W, 98, fill='background', name='Footer background')
    c.line(0, 746, W, 746, 'border', name='Divider')
    bw = (W - 40) / 2
    button(c, 16, 762, bw, 'Save draft', 'outline')
    button(c, 24 + bw, 762, bw, 'Publish')
    c.end()
    home_indicator(c)


SCREENS = [
    ('01 Sign in', s_sign_in),
    ('02 Browse', s_browse),
    ('03 Filters', s_filters),
    ('04 Event details', s_details),
    ('05 Saved', s_saved),
    ('06 Notifications', s_notifications),
    ('07 Profile', s_profile),
    ('08 Create event (organizer)', s_create_event),
]
DARK_SCREENS = [('02 Browse', s_browse), ('04 Event details', s_details), ('07 Profile', s_profile)]


def slug(name):
    return name.lower().replace(' ', '-').replace('(', '').replace(')', '')


def render_screen(fn, pal, wire, name):
    c = Canvas(pal, wire)
    clip = c.clip_rect(0, 0, W, H)
    c.begin(name, clip=clip)
    fn(c)
    c.end()
    return c


# ---------------------------------------------------------------------------
# Boards
# ---------------------------------------------------------------------------


def board(items, title, subtitle, cols=4, scale=1.0, bg='#E9EDEE'):
    """Lays out several screens on one canvas with labels above each."""
    gap_x, gap_y, top = 80, 140, 200
    fw, fh = W * scale, H * scale
    rows = (len(items) + cols - 1) // cols
    bw = int(80 * 2 + cols * fw + (cols - 1) * gap_x)
    bh = int(top + rows * (fh + gap_y) + 40)
    c = Canvas(LIGHT)
    c.text(80, 96, title, 48, 700, '#11181C', name='Board title')
    c.text(80, 140, subtitle, 22, 400, '#60686C', name='Board subtitle')
    for i, (name, fn, pal, wire) in enumerate(items):
        col, row = i % cols, i // cols
        x = 80 + col * (fw + gap_x)
        y = top + row * (fh + gap_y) + 60
        c.text(x, y - 20, name, 22, 600, '#11181C', name=f'Label/{name}')
        sub = Canvas(pal, wire)
        clip = sub.clip_rect(0, 0, W, H)
        sub.begin(name, clip=clip)
        fn(sub)
        sub.end()
        # Merge the sub-canvas into the board, prefixing ids/clips to keep them unique.
        prefix = f's{i}_'
        body = '\n'.join(sub.out).replace('url(#clip', f'url(#{prefix}clip')
        body = body.replace(' id="', f' id="{prefix}')
        c.defs += [d.replace('id="clip', f'id="{prefix}clip') for d in sub.defs]
        c.out.append(f'<g id="{prefix}frame" transform="translate({x:g} {y:g}) scale({scale:g})">')
        c.out.append(f'<rect width="{W}" height="{H}" rx="0" fill="none" stroke="#C9D1D3"/>')
        c.out.append(body)
        c.out.append('</g>')
    return c.svg(bw, bh, title, bg)


def flow_board():
    """User flow: thumbnails of the hi-fi screens with the prototype connections."""
    s = 0.42
    tw, th = W * s, H * s
    pos = {
        'signin': (60, 190), 'browse': (380, 190), 'details': (700, 190), 'notif': (1020, 190),
        'filters': (380, 700), 'saved': (700, 700), 'profile': (1020, 700), 'create': (1340, 700),
    }
    fns = {
        'signin': ('01 Sign in', s_sign_in), 'browse': ('02 Browse', s_browse),
        'details': ('04 Event details', s_details), 'notif': ('06 Notifications', s_notifications),
        'filters': ('03 Filters', s_filters), 'saved': ('05 Saved', s_saved),
        'profile': ('07 Profile', s_profile), 'create': ('08 Create event', s_create_event),
    }
    c = Canvas(LIGHT)
    c.text(60, 70, 'Community Connect — User flow', 40, 700, '#11181C', name='Board title')
    c.text(60, 104, 'Prototype connections to wire up in Figma (see design/figma/README.md).',
           18, 400, '#60686C', name='Board subtitle')
    for i, (key, (x, y)) in enumerate(pos.items()):
        name, fn = fns[key]
        c.text(x, y - 14, name, 16, 600, '#11181C', name=f'Label/{name}')
        sub = Canvas(LIGHT)
        clip = sub.clip_rect(0, 0, W, H)
        sub.begin(name, clip=clip)
        fn(sub)
        sub.end()
        prefix = f'f{i}_'
        body = '\n'.join(sub.out).replace('url(#clip', f'url(#{prefix}clip')
        body = body.replace(' id="', f' id="{prefix}')
        c.defs += [d.replace('id="clip', f'id="{prefix}clip') for d in sub.defs]
        c.out.append(f'<g id="{prefix}thumb" transform="translate({x:g} {y:g}) scale({s})">')
        c.out.append(f'<rect width="{W}" height="{H}" fill="none" stroke="#C9D1D3" '
                     f'stroke-width="2"/>')
        c.out.append(body)
        c.out.append('</g>')

    teal = '#1F9E96'

    def arrow(points, label, lx, ly):
        d = 'M' + ' L'.join(f'{x:g} {y:g}' for x, y in points)
        c.path(d, stroke=teal, sw=2.5, name=f'Flow/{label}')
        (x1, y1), (x2, y2) = points[-2], points[-1]
        if x2 != x1:
            sgn = 1 if x2 > x1 else -1
            tri = f'M{x2:g} {y2:g} L{x2 - sgn * 12:g} {y2 - 7:g} L{x2 - sgn * 12:g} {y2 + 7:g} Z'
        else:
            sgn = 1 if y2 > y1 else -1
            tri = f'M{x2:g} {y2:g} L{x2 - 7:g} {y2 - sgn * 12:g} L{x2 + 7:g} {y2 - sgn * 12:g} Z'
        c.path(tri, fill=teal, name='Arrowhead')
        lw = text_width(label, 13, 600) + 20
        c.rect(lx - lw / 2, ly - 14, lw, 26, 13, fill='#FFFFFF', stroke=teal, name='Flow label')
        c.text(lx, ly + 4, label, 13, 600, teal, 'middle', name='Flow label text')

    mid = th / 2
    right = lambda k: (pos[k][0] + tw, pos[k][1] + mid)  # noqa: E731
    left = lambda k: (pos[k][0], pos[k][1] + mid)  # noqa: E731
    r1, r2 = 190, 700
    arrow([right('signin'), left('browse')], 'Sign in / Guest', 270, r1 + mid - 24)
    arrow([right('browse'), left('details')], 'Tap event card', 590, r1 + mid - 24)
    arrow([left('notif'), right('details')], 'Tap alert', 910, r1 + mid - 24)
    bx = pos['browse'][0] + tw - 20
    nx = pos['notif'][0] + tw / 2
    arrow([(bx, r1 - 30), (bx, 140), (nx, 140), (nx, r1 - 30)], 'Bell icon', 860, 140)
    fx = pos['browse'][0] + tw / 2
    arrow([(fx, r1 + th), (fx, r2 - 30)], 'Filter button', fx, r1 + th + 70)
    sx = pos['saved'][0] + tw / 2
    arrow([(pos['browse'][0] + tw - 30, r1 + th), (pos['browse'][0] + tw - 30, r2 - 70),
           (sx, r2 - 70), (sx, r2 - 30)], 'Saved tab', 640, r2 - 70)
    arrow([right('saved'), left('profile')], 'Profile tab', 910, r2 + mid - 24)
    arrow([right('profile'), left('create')], 'Organizer Tools', 1230, r2 + mid - 24)
    return c.svg(1560, 1120, 'User flow', '#F4F7F7')


def design_system_board():
    c = Canvas(LIGHT)
    c.text(80, 96, 'Community Connect — Design system', 48, 700, '#11181C', name='Board title')
    c.text(80, 140, 'Colors, type, and components used in the hi-fi screens (from '
           'src/constants/theme.ts).', 22, 400, '#60686C', name='Board subtitle')
    y = 220
    for title, pal in (('Light', LIGHT), ('Dark', DARK)):
        c.text(80, y, f'Colors — {title}', 24, 600, '#11181C')
        x = 80
        for key, val in pal.items():
            c.begin(f'Swatch/{title}/{key}')
            c.rect(x, y + 24, 140, 96, 12, fill=val, stroke='#D0D6D8', name='Swatch')
            c.text(x, y + 144, key, 14, 600, '#11181C', name='Token')
            c.text(x, y + 164, val, 13, 400, '#60686C', name='Hex')
            c.end()
            x += 156
        y += 220
    c.text(80, y, 'Category colors', 24, 600, '#11181C')
    x = 80
    for key, (label, ic, col) in CATEGORY.items():
        c.begin(f'Category/{label}')
        c.rect(x, y + 24, 200, 96, 12, fill=col, name='Swatch')
        c.icon(ic, x + 136, y + 56, 56, '#FFFFFF', opacity=0.35)
        c.text(x + 16, y + 52, label, 16, 700, '#FFFFFF', name='Label')
        c.text(x + 16, y + 74, col, 13, 500, '#FFFFFF', name='Hex')
        c.end()
        x += 216
    y += 180
    c.text(80, y, 'Type (Inter)', 24, 600, '#11181C')
    ty = y + 50
    for name, size, weight in (('Title / 26 Bold', 26, 700), ('Subtitle / 20 Bold', 20, 700),
                               ('Heading / 17 Semibold', 17, 600), ('Body / 16 Regular', 16, 400),
                               ('Small / 14 Regular', 14, 400), ('Caption / 12 Medium', 12, 500)):
        c.text(80, ty, name, size, weight, '#11181C', name=f'Type/{name}')
        ty += size + 22
    cx = 700
    c.text(cx, y, 'Components', 24, 600, '#11181C')
    x = cx
    for label, sel in (('All', True), ('Youth', False), ('Educational', False)):
        x += chip(c, x, y + 30, label, sel) + 8
    button(c, cx, y + 84, 150, 'Interested', 'outline', 'star')
    button(c, cx + 158, y + 84, 150, 'Going', 'solid', 'check_circle')
    button(c, cx + 316, y + 84, 150, 'Going', disabled=True, icon='check_circle')
    x = cx
    for label, col, op in (('Cancelled', '#E5484D', None), ('Postponed', '#F5A524', None),
                           ('Resident', '#1F9E96', None), ('Youth', '#000000', 0.22)):
        x += tag(c, x, y + 146, label, col, op) + 8
    c.text(cx, y + 210, 'Icons — Material Symbols (Android/web) · SF Symbols on iOS', 16, 600,
           '#11181C')
    ix, iy = cx, y + 230
    for i, n in enumerate(sorted(ICONS)):
        c.icon(n, ix + (i % 14) * 44, iy + (i // 14) * 44, 24, '#11181C')
    return c.svg(2200, y + 400, 'Design system', '#FFFFFF')


# ---------------------------------------------------------------------------


def main():
    load_fonts(sys.argv[1])
    sets = [
        ('wireframes', 'Wireframe', WIRE, True, SCREENS),
        ('hifi', 'Hi-fi', LIGHT, False, SCREENS),
        ('hifi-dark', 'Hi-fi dark', DARK, False, DARK_SCREENS),
    ]
    for folder, label, pal, wire, screens in sets:
        d = os.path.join(OUT, folder)
        os.makedirs(d, exist_ok=True)
        for name, fn in screens:
            c = render_screen(fn, pal, wire, f'{label} / {name}')
            with open(os.path.join(d, f'{slug(name)}.svg'), 'w') as f:
                f.write(c.svg(W, H, f'{label} / {name}'))

    boards = os.path.join(OUT, 'boards')
    os.makedirs(boards, exist_ok=True)
    with open(os.path.join(boards, 'wireframes-board.svg'), 'w') as f:
        f.write(board([(n, fn, WIRE, True) for n, fn in SCREENS],
                      'Community Connect — Wireframes',
                      'Low-fidelity layout of every screen. Gray boxes are image placeholders.'))
    with open(os.path.join(boards, 'hifi-board.svg'), 'w') as f:
        f.write(board([(n, fn, LIGHT, False) for n, fn in SCREENS]
                      + [(f'{n} (dark)', fn, DARK, False) for n, fn in DARK_SCREENS],
                      'Community Connect — Hi-fi',
                      'Final visual design, light mode plus dark-mode samples.'))
    with open(os.path.join(boards, 'user-flow.svg'), 'w') as f:
        f.write(flow_board())
    with open(os.path.join(boards, 'design-system.svg'), 'w') as f:
        f.write(design_system_board())


if __name__ == '__main__':
    main()
