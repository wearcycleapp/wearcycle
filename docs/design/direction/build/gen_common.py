"""Shared pieces for the Phase 6 direction mockups (generator; output goes to docs/design/direction/)."""
import html

R = '../../../'
IMG = R + 'tools/fixtures/img/'
COLORS = {'black': '#1c1d20', 'white': '#f6f6f3', 'grey': '#8b9097', 'navy': '#1f2e57', 'brown': '#6a4a2e', 'denim': '#4b6589',
          'burgundy': '#6e1f2f', 'green': '#3e8a4d'}
GLYPH = {
    'top': '<path d="M17 7 8 12l3 8 4-2v22h18V18l4 2 3-8-9-5c-1 3-4 5-7 5s-6-2-7-5Z"/>',
    'bottom': '<path d="M14 6h20l2 36h-9l-3-23-3 23h-9L14 6Z"/>',
    'shoes': '<path d="M5 32c0-7 2-13 4-15h8c0 4 4 7 9 8l12 3c4 1 5 5 5 7H5v-3Z"/>',
    'socks': '<path d="M16 4h13v20l9 8c3 3 1 10-5 10-2 0-4-1-5-2L15 31c-2-2-3-4-3-7V8c0-2 2-4 4-4Z"/>',
    'watch': '<rect x="19" y="4" width="10" height="40" rx="3"/><circle cx="24" cy="24" r="10"/>',
}
CAT = {'top': 'Top', 'bottom': 'Bottom', 'shoes': 'Shoes', 'belt': 'Belt', 'socks': 'Socks', 'watch': 'Watch', 'other': 'Other accessory', 'outerwear': 'Outerwear'}

# The fixture closet (tools/fixtures/closet.json): names, categories and images as the app shows them at the fixed clock.
P = {
    'sweater': dict(n='Grey merino sweater', cat='top', kind='photo', src='fx-04.jpg', cond='Good', worn=12),
    'chinos': dict(n='Navy chinos', cat='bottom', kind='cut', src='fx-10-cut.webp', cond='Like new', worn=15),
    'sneakers': dict(n='White leather sneakers', cat='shoes', kind='cut', src='fx-18-cut.webp', cond='Good', worn=15),
    'belt': dict(n='Brown leather belt', cat='belt', kind='photo', src='fx-22.jpg'),
    'socks': dict(n='Navy dress socks', cat='socks', kind='glyph', col='navy'),
    'watch': dict(n='Steel watch', cat='watch', kind='glyph', col='grey'),
    'scarf': dict(n='Grey wool scarf', cat='other', kind='photo', src='fx-25.jpg'),
    'hoodie': dict(n='Burgundy hoodie', cat='top', kind='glyph', col='burgundy'),
    'jeans': dict(n='Dark jeans', cat='bottom', kind='photo', src='fx-11.jpg'),
    'polo': dict(n='Navy knit polo', cat='top', kind='cut', src='fx-03-cut.webp'),
    'boots': dict(n='Black chelsea boots', cat='shoes', kind='cut', src='fx-21-cut.webp'),
    'oxford': dict(n='White oxford shirt', cat='top', kind='cut', src='fx-01-cut.webp', cond='Like new', worn=12),
    'tee': dict(n='Black t-shirt', cat='top', kind='glyph', col='black', cond='Good', worn=9, flag='wash'),
    'rain': dict(n='Green rain jacket', cat='outerwear', kind='photo', src='fx-16.jpg', cond='Worn', worn=6, flag='repair'),
}
# The four ranked options for Work (from the check run on v1.51.3, fixed clock 2026-10-14 08:30).
OPTIONS = [
    dict(rank=1, match='Excellent match', bars=5, style='Minimal', pieces=['sweater', 'chinos', 'sneakers'], acc=['belt', 'socks', 'watch', 'scarf']),
    dict(rank=2, match='Excellent match', bars=5, pieces=['hoodie', 'jeans', 'sneakers'], acc=[]),
    dict(rank=3, match='Fair match', bars=2, pieces=['polo', 'chinos', 'boots'], acc=[]),
    dict(rank=4, match='Fair match', bars=2, pieces=['polo', 'jeans', 'boots'], acc=[]),
]
REASONS = [('neg', 'Nothing under Grey merino sweater; add a t-shirt if you have one'), ('', 'Pieces sit at the same dress level'),
           ('', 'Brown leather belt goes with the outfit'), ('', 'Navy dress socks go with the outfit'), ('', 'Fits your Minimal style')]
OCC = ['Work', 'Going out', 'Sport', 'Home', 'Chores', 'Formal']
STYLES = ['All my styles', 'Rotate', 'Classic', 'Minimal']
CATS = [('All', 26), ('In the wash', 1), ('Top', 10), ('Bottom', 5), ('Outerwear', 3), ('Shoes', 4)]
CLOSET = ['oxford', 'tee', 'sweater', 'chinos', 'rain', 'sneakers']
PALETTE = ['grey', 'navy', 'white', 'brown']
WEATHER = '10°–14°C'
ADVICE = 'Cool for work. An outer layer would help, but none is tagged for work yet.'

e = html.escape


def t(s, tag='span', cls='', extra=''):
    """Visible text that the mockup can show in French or Japanese (mock.js swaps it from the app's dictionaries)."""
    c = f' class="{cls}"' if cls else ''
    return f'<{tag}{c} data-t="{e(s)}"{extra}>{e(s)}</{tag}>'


def img(p, cls=''):
    x = P[p]
    if x['kind'] == 'glyph':
        return (f'<svg class="glyph {cls}" viewBox="0 0 48 48" aria-hidden="true" fill="{COLORS[x["col"]]}" stroke="rgba(120,130,140,.55)" '
                f'stroke-width="1.2" stroke-linejoin="round">{GLYPH[x["cat"]]}</svg>')
    return f'<img class="{x["kind"]} {cls}" src="{IMG}{x["src"]}" alt="" loading="lazy" decoding="async">'


def garment(p, cls=''):
    """A garment in its own frame: cut-outs and glyphs on the cream canvas, photos full-bleed."""
    x = P[p]
    canvas = ' m-cv' if x['kind'] != 'photo' else ''
    return f'<span class="m-g{canvas} {cls}">{img(p)}</span>'


# Flat-lay positions, in % of the board (left, top, width, height), as in app.js flatlay().
LAYOUT = {
    '4:5': {'top': (4, 4, 44, 74), 'bottom': (52, 4, 44, 46), 'shoes': (52, 52, 44, 26), 'acc': (80, 16)},
    '1:1': {'top': (4, 4, 44, 64), 'bottom': (52, 4, 44, 40), 'shoes': (52, 46, 44, 22), 'acc': (72, 24)},
    '3': {'top': (4, 6, 46, 58), 'bottom': (52, 4, 44, 64), 'shoes': (6, 66, 42, 30)},
}


def board(opt, shape='4:5', label=True, cls='', live=True):
    L = LAYOUT[shape if opt['acc'] else '3']
    out = []
    for p in opt['pieces']:
        x = P[p]; l, tp, w, h = L[x['cat']]
        out.append(f'<button class="fl" style="left:{l}%;top:{tp}%;width:{w}%;height:{h}%" aria-label="{e(CAT[x["cat"]])}: {e(x["n"])}. Tap to see it">{img(p)}</button>' if live else
                   f'<span class="fl" style="left:{l}%;top:{tp}%;width:{w}%;height:{h}%">{img(p)}</span>')
    if opt['acc']:
        top, h = L['acc']
        for k, p in enumerate(opt['acc']):
            x = P[p]; l = 4 + k * 23.5
            out.append(f'<button class="fl small" style="left:{l}%;top:{top}%;width:21.5%;height:{h}%" aria-label="{e(CAT[x["cat"]])}: {e(x["n"])}. Tap to see it">{img(p)}</button>' if live else
                       f'<span class="fl small" style="left:{l}%;top:{top}%;width:21.5%;height:{h}%">{img(p)}</span>')
    ar = {'4:5': '4/5', '1:1': '1/1'}[shape]
    name = f' role="group" aria-label="Option {opt["rank"]}, {e(opt["match"])}: {e(", ".join(P[p]["n"] for p in opt["pieces"]))}"' if label else ''
    return f'<div class="m-board {cls}" style="aspect-ratio:{ar}"{name}>{"".join(out)}</div>'


def bars(n):
    return '<span class="m-bars" aria-hidden="true">' + ''.join(f'<i class="{"on" if k < n else ""}"></i>' for k in range(5)) + '</span>'


def swatches():
    return '<span class="m-sws" aria-hidden="true">' + ''.join(f'<i style="background:{COLORS[c]}"></i>' for c in PALETTE) + '</span>'


def why(n=None):
    rs = REASONS if n is None else REASONS[:n]
    return '<ul class="m-why">' + ''.join(f'<li class="{c}">{e(s)}</li>' for c, s in rs) + '</ul>'


ICON = {
    'adjust': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    'share': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    'wx': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18.5 12 3 3 0 0 1 18 18H7Z"/></svg>',
    'diary': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    'down': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
    'prev': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    'next': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
    'wash': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11Z"/></svg>',
    'repair': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6Z"/></svg>',
}
FLAG = {'wash': ('In the wash', 'warn'), 'repair': ('Needs repair', 'bad')}


def shell_head(title, letter, css):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Direction {letter}: {e(title)} · Wearcycle Phase 6</title>
<link rel="stylesheet" href="{R}fonts/fonts.css">
<link rel="stylesheet" href="{R}styles.css">
<link rel="stylesheet" href="mock.css">
<style>
{css}
</style>
</head>
'''


def shell_top():
    return f'''<header class="top">
    <img class="logo" src="{R}icons/logo-icon.svg" alt="" width="36" height="36"><div class="brand">Wearcycle</div>
    <button class="iconbtn" aria-label="Settings and rules" data-tl="Settings"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg></button>
  </header>'''


def shell_nav():
    return '''<button class="fab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span data-t="Add clothes">Add clothes</span></button>
<nav class="tabs" aria-label="Sections"><div class="inner">
  <button data-tab="outfits"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M8 3 3 6l2 5 3-1.5V21h8V9.5l3 1.5 2-5-5-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3Z"/></svg><span data-t="Outfits">Outfits</span></button>
  <button data-tab="closet"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 6a2 2 0 1 1 2 2c-1 0-2 .7-2 2v1M12 11 3 17.5c-.8.6-.4 1.5.5 1.5h17c.9 0 1.3-.9.5-1.5L12 11Z"/></svg><span data-t="Closet">Closet</span></button>
  <button data-tab="care"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/></svg><span data-t="Care">Care</span><span class="badge">3</span></button>
  <button data-tab="shop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 12H6.2L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><span data-t="Shop">Shop</span></button>
</div></nav>
<script src="mock.js"></script>
</body>
</html>
'''


def foot(letter):
    others = ''.join(f'<a href="{x.lower()}.html">Direction {x}</a>' for x in 'ABC' if x != letter)
    return f'''<div class="m-foot">
      <p>Mockup for the Phase 6 direction choice. Sample data: the fixture closet in tools/fixtures (synthetic images, no real photos). Only the look is designed here; buttons change their state but not the content.</p>
      <div class="m-sw">Theme: <a data-set="theme=auto">Device</a><a data-set="theme=light">Light</a><a data-set="theme=dark">Dark</a></div>
      <div class="m-sw">Labels: <a data-set="lang=en">English</a><a data-set="lang=fr">Français</a><a data-set="lang=ja">日本語</a></div>
      <div class="m-sw"><a href="index.html">All directions</a>{others}</div>
    </div>'''


def shop_view():
    return '<section class="m-view" data-view="shop"><p class="m-shop">Shop is not part of the Phase 6 mockups: the chosen direction carries to it in Phase 11.</p></section>'
