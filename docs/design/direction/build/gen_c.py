"""Direction C, "Board": today's screen refined; the flat-lay board stays the hero, occasion in a menu. Medium density."""
from gen_common import *

CSS = r'''
/* Direction C, Board: today's structure and scale, refined and flattened */
.m-wrap{max-width:1240px;margin:0 auto}
.m-day{display:flex;align-items:center;gap:8px;min-height:48px}
.m-day .m-dt{flex:1;min-width:0}
.m-day h2{font-size:26px;line-height:1}
.m-day .m-dt p{margin:4px 0 0;font-size:13px;color:var(--muted)}
.m-wx{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--raised);font-weight:600;font-size:14px;white-space:nowrap}
.m-wx svg{width:18px;height:18px;color:var(--muted)}
/* one row: the occasion menu, then the style chips */
.m-ctl{display:flex;align-items:center;gap:10px;margin:0 -16px;padding:0 16px}
.m-menu{position:relative;flex:none}
.m-menubtn{min-height:44px;display:inline-flex;align-items:center;gap:6px;padding:0 10px 0 14px;border:1.5px solid var(--ink);border-radius:8px;background:var(--raised);color:var(--ink);font-weight:700;font-size:15px;white-space:nowrap}
.m-menubtn svg{width:18px;height:18px}
.m-menubtn[aria-expanded="true"] svg{transform:rotate(180deg)}
.m-list{position:absolute;top:calc(100% + 6px);left:0;z-index:8;min-width:220px;background:var(--raised);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:6px;display:flex;flex-direction:column}
.m-list[hidden]{display:none}
.m-list button{min-height:44px;display:flex;align-items:center;gap:10px;padding:0 12px;border:0;border-radius:8px;background:none;color:var(--ink);font-size:15px;font-weight:500;text-align:left}
.m-list button svg{width:18px;height:18px;visibility:hidden;flex:none}
.m-list button[aria-pressed="true"]{font-weight:700}
.m-list button[aria-pressed="true"] svg{visibility:visible}
.m-divider{flex:none;width:1px;height:28px;background:var(--line)}
.m-styles{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding-right:16px;margin-right:-16px}
.m-styles::-webkit-scrollbar{display:none}
.m-styles button{flex:none;min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--muted);font-weight:600;font-size:14px;white-space:nowrap}
.m-styles button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
/* hero: no card, the board leads */
.m-hero{display:flex;flex-direction:column;gap:12px;min-width:0}
.m-pickh{display:flex;align-items:center;gap:12px}
.m-rank{font-family:var(--f-display);font-weight:800;font-size:24px;line-height:1;width:40px;height:40px;border-radius:10px;display:grid;place-items:center;background:var(--coral);color:var(--coral-ink);flex:none}
.m-pt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.m-pt b{font-size:17px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.m-pt > span{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px}
.m-cta{display:flex;gap:8px}
.m-cta .btn.cta{flex:1}
.m-meta-row{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted)}
.m-adv{margin:0;font-size:14px;color:var(--muted)}
details.m-whyd{border-top:1px solid var(--line);padding-top:4px}
details.m-whyd summary{list-style:none;cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:space-between;font-weight:600;font-size:15px}
details.m-whyd summary::-webkit-details-marker{display:none}
details.m-whyd summary svg{width:18px;height:18px;color:var(--muted)}
details.m-whyd[open] summary svg{transform:rotate(180deg)}
details.m-whyd .m-why{padding:0 0 12px}
.m-side{display:flex;flex-direction:column;gap:12px;min-width:0}
.m-sec{display:flex;align-items:center;gap:8px;margin-top:8px}
.m-sec h3{font-size:16px;flex:1}
/* more options: a strip of small boards, numbered */
.m-strip{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x proximity;margin:0 -16px;padding:0 16px 4px;scrollbar-width:none}
.m-strip::-webkit-scrollbar{display:none}
.m-alt{flex:0 0 44%;scroll-snap-align:start;display:flex;flex-direction:column;gap:6px;border:0;padding:0;background:none;text-align:left;min-width:0}
.m-alt .m-al{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--muted)}
.m-alt .m-al .m-an{font-family:var(--f-display);font-size:18px;font-weight:800;color:var(--ink);line-height:1}
.m-log{align-self:flex-start;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;background:none;border:0;padding:0;min-height:40px;color:var(--ink)}
.m-occlist{display:none}
@media (min-width:700px){
  .m-out{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:28px;align-items:start}
  .m-strip{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible;margin:0;padding:0}
  .m-alt{flex:none}
}
@media (min-width:960px){
  .m-out{grid-template-columns:180px minmax(0,1.15fr) minmax(0,1fr);gap:32px}
  .m-menu,.m-divider{display:none}
  .m-ctl{margin:0;padding:0}
  .m-occlist{display:flex;flex-direction:column;gap:4px;position:sticky;top:12px}
  .m-occlist .m-k{font-size:13px;color:var(--muted);margin:0 0 4px 12px}
  .m-occlist button{min-height:44px;padding:0 14px;border:0;border-radius:8px;background:none;color:var(--muted);font-weight:600;font-size:15px;text-align:left}
  .m-occlist button[aria-pressed="true"]{background:var(--ink);color:var(--bg);font-weight:700}
  .m-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
  /* as today from 960px: the board keeps the screen height and widens, so Wear this stays in view */
  .m-hero > .m-board{aspect-ratio:auto!important;height:clamp(320px,calc(100vh - 330px),600px)}
}
@media (hover:hover) and (pointer:fine){
  .m-occlist button:not([aria-pressed="true"]):hover,.m-list button:hover{background:var(--accent-soft);color:var(--ink)}
}
/* Closet: today's tiles without the card box; flags as one corner mark */
.m-title{display:flex;align-items:center;gap:8px}
.m-title h2{flex:1}
.m-lede{margin:0;font-size:14px;color:var(--muted)}
.m-chips{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}
.m-chips::-webkit-scrollbar{display:none}
.m-chips button{flex:none;min-height:44px;padding:0 16px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--muted);font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.m-chips button .n{font-size:12px;font-weight:500;opacity:.9}
.m-chips button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
@media (min-width:960px){.m-chips{flex-wrap:wrap;overflow:visible;margin:0;padding:0}}
.m-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
@media (min-width:700px){.m-tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (min-width:1200px){.m-tiles{grid-template-columns:repeat(6,minmax(0,1fr))}}
.m-tile{display:flex;flex-direction:column;gap:3px;border:0;padding:0;background:none;text-align:left;min-width:0}
.m-tile .m-g{aspect-ratio:1/1;border-radius:10px;margin-bottom:5px}
.m-tile .m-g img.cut{padding:10%}
.m-tile b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-tile .m-meta{font-size:13px;color:var(--muted)}
.m-mark{position:absolute;left:8px;top:8px;width:28px;height:28px;border-radius:8px;display:grid;place-items:center;background:var(--raised)}
.m-mark svg{width:16px;height:16px}
.m-mark.warn{color:var(--warn)}
.m-mark.bad{color:var(--bad)}
/* Care: one row in its section */
.m-csec{display:flex;align-items:baseline;gap:8px;margin-top:4px}
.m-csec h3{font-size:17px}
.m-csec .n{font-size:14px;color:var(--muted)}
.m-crow{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;padding:12px 0;border-top:1px solid var(--line)}
.m-crow .m-g{width:64px;height:64px;border-radius:10px}
.m-crow b{font-size:15px;display:block}
.m-crow p{margin:2px 0 0;font-size:14px;color:var(--muted)}
.m-crow .m-acts{grid-column:2;display:flex;gap:6px;flex-wrap:wrap}
'''


def outfits():
    o = OPTIONS[0]
    occ_list = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{ICON["check"]}<span class="m-optl" data-t="{x}">{x}</span></button>' for k, x in enumerate(OCC))
    occ_side = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(x)}</button>' for k, x in enumerate(OCC))
    sty = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(x)}</button>' for k, x in enumerate(STYLES))
    alts = ''.join(f'<button class="m-alt" aria-label="Option {a["rank"]}, {e(a["match"])}: {e(", ".join(P[p]["n"] for p in a["pieces"]))}">{board(a, "4:5", label=False, live=False)}'
                   f'<span class="m-al"><span class="m-an">{a["rank"]:02d}</span>{t(a["match"])}</span></button>' for a in OPTIONS[1:])
    return f'''<section class="m-view" data-view="outfits" aria-label="Outfits">
    <div class="m-day">
      <div class="m-dt"><h2>{t("Wednesday")}</h2><p data-t="Good morning">Good morning</p></div>
      <button class="m-wx" aria-label="Weather: 10 to 14 degrees, cloudy. Change">{ICON["wx"]}<span>{WEATHER}</span></button>
      <button class="iconbtn round" aria-label="Outfit diary" data-tl="Outfit diary">{ICON["diary"]}</button>
    </div>
    <div class="m-ctl">
      <div class="m-menu"><button class="m-menubtn" data-menu-toggle aria-expanded="false" aria-haspopup="true" aria-label="Occasion: Work. Change"><span data-menu-label data-t="Work">Work</span>{ICON["down"]}</button>
        <div class="m-list" role="group" aria-label="Occasion" data-group data-menu-list hidden>{occ_list}</div></div>
      <span class="m-divider" aria-hidden="true"></span>
      <div class="m-styles" role="group" aria-label="Style" data-group>{sty}</div>
    </div>
    <div class="m-out">
      <nav class="m-occlist" aria-label="Occasion" data-group><span class="m-k" data-t="Occasion">Occasion</span>{occ_side}</nav>
      <div class="m-hero">
        <div class="m-pickh"><span class="m-rank" aria-hidden="true">1</span><div class="m-pt"><b>{t("Today’s pick")}<span class="stylepill" data-t="Minimal">Minimal</span></b><span>{t(o["match"])} {bars(5)}</span></div>
          <button class="iconbtn" aria-label="Adjust: outer layer, view and palette" data-tl="Adjust">{ICON["adjust"]}</button></div>
        {board(o, "4:5")}
        <div class="m-cta"><button class="btn cta">{t("Wear this")}</button><button class="btn iconb" aria-label="Share this outfit" data-tl="Share this outfit">{ICON["share"]}</button></div>
        <div class="m-meta-row">{swatches()}<span>All-neutral palette</span></div>
        <p class="m-adv">{e(ADVICE)}</p>
        <div class="m-note"><span>3 pieces are still on their floor photo.</span><button class="btn sm">Make cut-outs</button></div>
      </div>
      <div class="m-side">
        <details class="m-whyd" open><summary><span data-t="Why this outfit?">Why this outfit?</span>{ICON["down"]}</summary>{why()}</details>
        <div class="m-sec"><h3 data-t="More options">More options</h3><button class="btn sm" data-t="New ideas">New ideas</button></div>
        <div class="m-strip">{alts}</div>
        <button class="m-log">Wore something else? Log it</button>
      </div>
    </div>
    {foot("C")}
  </section>'''


def closet():
    chips = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(c)}<span class="n">{n}</span></button>' for k, (c, n) in enumerate(CATS))
    tiles = []
    for p in CLOSET:
        x = P[p]; mk = ''
        if x.get('flag'):
            lab, tone = FLAG[x['flag']]; mk = f'<span class="m-mark {tone}">{ICON[x["flag"]]}<span class="m-sr">{e(lab)}</span></span>'
        tiles.append(f'<button class="m-tile"><span class="m-g{" m-cv" if x["kind"] != "photo" else ""}">{img(p)}{mk}</span>'
                     f'<b>{e(x["n"])}</b><span class="m-meta">{t(x["cond"])} · {x["worn"]} wears</span></button>')
    return f'''<section class="m-view" data-view="closet" aria-label="Closet">
    <div class="m-title"><h2 data-t="Closet">Closet</h2><button class="btn sm" data-t="Stats">Stats</button></div>
    <p class="m-lede">Everything you own that is still in rotation. Tap an item to edit it.</p>
    <div class="m-chips" role="group" aria-label="Category" data-group>{chips}</div>
    <div class="m-tiles">{"".join(tiles)}</div>
    {foot("C")}
  </section>'''


def care():
    x = P['rain']
    return f'''<section class="m-view" data-view="care" aria-label="Care">
    <div><h2 data-t="Care &amp; donate">Care &amp; donate</h2><p class="m-lede" style="margin-top:4px">Items flagged by condition, wear and age. Nothing is removed until you confirm it.</p></div>
    <div class="m-csec"><h3>Repair</h3><span class="n">1</span></div>
    <div class="m-crow">{garment("rain")}<div><b>{e(x["n"])}</b><p>Zipper sticks · since Oct 2</p><p>Until fixed, it is suggested only for sport, home and chores.</p></div>
      <div class="m-acts"><button class="btn sm" data-t="Fixed">Fixed</button><button class="btn sm" data-t="Find a tailor">Find a tailor</button><button class="btn sm ghost" data-t="Open">Open</button></div></div>
    {foot("C")}
  </section>'''


def page():
    return (shell_head('Board', 'C', CSS) + '<body data-view="outfits" class="dir-c">\n<div class="app"><div class="m-wrap">\n  ' + shell_top()
            + '\n  ' + outfits() + '\n  ' + closet() + '\n  ' + care() + '\n  ' + shop_view() + '\n</div></div>\n' + shell_nav())
