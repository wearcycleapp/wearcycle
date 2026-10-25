"""The index page: the comparison table and every direction at 390, 820 and 1366px.
Screenshots, not frames: _headers sends X-Frame-Options: DENY for every file, so frames of the pages would be blocked.
The pictures in shots/ are made from the checks' captures (CSS pixels, light and dark) and link to the live pages."""
from gen_common import R, e

ROWS = [
    ('Type scale', 'Compact. Day 22px and screen titles 26px in the display face; labels 13 to 15px; rank and option numbers in the display face.',
     'Large and editorial. Day 40px (56px on desktop); occasions set in the display face; look numbers 28px.',
     'Today’s scale, refined. Day 26px; title 17px; display face for the rank and option numbers.'),
    ('Occasion selector', 'All six visible at once: a segmented grid, 3 by 2 on phones, one row from 700px. Long translations wrap inside their cell.',
     'Typographic tabs in the display face; selected is ink with a 2px ink underline. Scrolls sideways on phones; one row on desktop.',
     'A menu button (“Work”) beside the style chips; the six occasions open as a list. From 960px they stand as a list to the left of the outfit.'),
    ('Outfit composition', 'A kit: top tall on the left, bottom and shoes on the right, accessories in a row. Every piece is named under its picture.',
     'The flat-lay board, square on phones, one look per page.', 'The flat-lay board at 4:5 as today, with the rank, match and style above it.'),
    ('Alternatives', 'An index: one row per option with its number, small pictures, piece names and match.',
     'A lookbook you turn: swipe or use the arrows; the next look peeks in. On desktop all four looks sit side by side, today’s pick largest.',
     'A strip of small boards numbered 02 to 04 (two columns from 700px).'),
    ('Density', 'High: the most information on the first screen.', 'Low: one look at a time on phones.', 'Medium.'),
    ('Closet and Care', 'Dense tiles with a text mark (“In the wash”); filters wrap so all are visible; compact Care row.',
     'Large 4:5 gallery tiles with a round icon mark; typographic filters; Care row led by a large picture.',
     'Today’s tiles without the card box, a square icon mark; chips; Care row as today, flat.'),
    ('Honest risk', 'Reads more like a packing list than a styled photo; pictures are smaller.',
     'Comparing looks takes a swipe on phones; the big type uses height.', 'Changing occasion takes one more tap on phones; closest to today, so the least new.'),
]

FRAMES = [('Phone 390', 390, 844, 'outfits', 'p390'), ('iPad 820', 820, 1180, 'outfits', 'i820'), ('Windows 1366', 1366, 768, 'outfits', 'w1366'),
          ('Closet row, phone', 390, 844, 'closet', 'p390'), ('Care row, phone', 390, 844, 'care', 'p390')]
VIEW = {'outfits': 'Outfits', 'closet': 'Closet', 'care': 'Care'}


def page():
    head = ''.join(f'<th scope="col"><a href="{x.lower()}.html">{x}: {n}</a></th>' for x, n in [('A', 'Kit'), ('B', 'Lookbook'), ('C', 'Board')])
    body = ''.join(f'<tr><th scope="row">{e(r[0])}</th>' + ''.join(f'<td>{e(c)}</td>' for c in r[1:]) + '</tr>' for r in ROWS)
    dirs = ''
    for x, n, line in [('A', 'Kit', 'Every piece named and visible, all six occasions in view, options as an index.'),
                       ('B', 'Lookbook', 'Each ranked outfit is a page you turn, today’s pick first.'),
                       ('C', 'Board', 'Today’s screen, refined: the flat-lay board stays the hero; the occasion moves into a menu.')]:
        frames = ''.join(f'<figure class="fr" style="--w:{w};--h:{h}"><figcaption>{e(lab)}</figcaption><a class="box" href="{x.lower()}.html#{v}" data-view-link>'
                         f'<img src="shots/{x.lower()}-{v}-{dv}-light.webp" data-shot="shots/{x.lower()}-{v}-{dv}" alt="Direction {x}, {VIEW[v]} screen at {w} pixels wide" width="{w}" height="{h}" loading="lazy" decoding="async"></a></figure>'
                         for lab, w, h, v, dv in FRAMES)
        dirs += f'''<section class="dir" id="{x.lower()}">
      <div class="dh"><h2>{x}: {n}</h2><p>{e(line)}</p><a class="btn primary" href="{x.lower()}.html">Open direction {x}</a></div>
      <div class="frames" tabindex="0" role="region" aria-label="Direction {x} at three widths, screenshots">{frames}</div>
    </section>'''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Visual directions · Wearcycle Phase 6</title>
<link rel="stylesheet" href="{R}fonts/fonts.css">
<link rel="stylesheet" href="{R}styles.css">
<style>
body{{background:var(--bg)}}
.ix{{max-width:1500px;margin:0 auto;padding:24px 16px 64px;display:flex;flex-direction:column;gap:28px}}
.ix h1{{font-family:var(--f-display);font-weight:800;font-size:40px;line-height:1;margin:0}}
.ix .lede{{font-size:15px;max-width:72ch}}
.ix .bar{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:14px;color:var(--muted)}}
.ix .bar a{{min-height:40px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid var(--line);border-radius:8px;color:var(--ink);text-decoration:none;font-weight:600}}
.ix .bar a[aria-current="true"]{{background:var(--ink);color:var(--bg);border-color:var(--ink)}}
.frames:focus-visible,.tbl:focus-visible{{outline:2px solid var(--accent);outline-offset:4px;border-radius:4px}}
.tbl{{overflow-x:auto;border-top:1px solid var(--line);padding-top:4px}}
table{{border-collapse:collapse;width:100%;min-width:720px;font-size:14px}}
th,td{{text-align:left;vertical-align:top;padding:12px 12px 12px 0;border-bottom:1px solid var(--line)}}
thead th{{font-size:15px}}
thead th a{{color:var(--ink);text-underline-offset:3px}}
tbody th{{font-weight:600;width:150px}}
td{{color:var(--muted)}}
.dir{{display:flex;flex-direction:column;gap:12px;border-top:1px solid var(--line);padding-top:20px}}
.dh{{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 16px}}
.dh h2{{font-size:30px}}
.dh p{{margin:0;color:var(--muted);flex:1;min-width:240px}}
.dh .btn{{text-decoration:none}}
.frames{{display:flex;gap:16px;overflow-x:auto;padding-bottom:8px;align-items:flex-start}}
.fr{{margin:0;flex:none;--s:.42;width:calc(var(--w) * 1px * var(--s))}}
.fr figcaption{{font-size:13px;color:var(--muted);margin-bottom:6px}}
.fr .box{{display:block;width:calc(var(--w) * 1px * var(--s));height:calc(var(--h) * 1px * var(--s));overflow:hidden;border:1px solid var(--line);border-radius:10px;background:var(--raised)}}
.fr img{{display:block;width:100%;height:100%;object-fit:cover;object-position:top}}
@media (max-width:699px){{ .fr{{--s:.6}} .fr:nth-child(2),.fr:nth-child(3){{display:none}} }}
.foot{{font-size:13px;color:var(--muted);max-width:80ch}}
</style>
</head>
<body>
<main class="ix">
  <div>
    <h1>Three visual directions</h1>
    <p class="lede">Phase 6 of the redesign. Each direction keeps ink, the cream garment canvas, coral for the main action only, and the condensed display type; selected states are ink, containers are flat, and “Wear this” shows without scrolling at 390 by 844. They differ in type scale, occasion selector, outfit composition, alternatives and density. Open one on your phone, the iPad and a Windows browser to see it at that device’s width; the pictures below are screenshots of the same pages (select one to open it).</p>
  </div>
  <p class="lede"><strong>Chosen on 2026-10-25:</strong> A on phones, B from 700px wide (iPad and Windows), with B’s side-by-side looks starting at 1100px. The rules are in docs/design/SCREENS.md, under “Chosen direction”.</p>
  <div class="bar">Pictures: <a data-theme-set="light" href="?theme=light">Light</a><a data-theme-set="dark" href="?theme=dark">Dark</a><span>· Inside each direction, the footer switches theme and labels (English, French, Japanese).</span></div>
  <div class="tbl" tabindex="0" role="region" aria-label="How the directions differ"><table><thead><tr><th scope="col"></th>{head}</tr></thead><tbody>{body}</tbody></table></div>
  {dirs}
  <p class="foot">Sample data: the fixture closet in tools/fixtures (synthetic pictures and names, no real photos), with the four Work options the app ranks for it at the fixed clock (Wednesday, 10°–14°C). Only the look is designed: tapping changes selected states, not the content. The navigation shell (bottom bar, rail) is today’s; Phase 7 decides it. Shop is not part of these mockups.</p>
</main>
<script src="index.js"></script>
</body>
</html>
'''
