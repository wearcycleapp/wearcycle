"""Direction B, "Lookbook": each ranked outfit is a page you turn; large editorial type; low density."""
from gen_common import *

CSS = r'''
/* Direction B, Lookbook: large condensed type, typographic tabs, one look per page */
.m-wrap{max-width:1240px;margin:0 auto}
.dir-b .m-view{gap:12px}
.m-date{display:flex;align-items:flex-start;gap:12px}
.m-date .m-dt{flex:1;min-width:0}
.m-date h2{font-size:40px;line-height:.95;letter-spacing:.005em}
.m-date p{margin:6px 0 0;font-size:15px;color:var(--muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.m-date p svg{width:18px;height:18px}
/* typographic tabs: selected is ink with a 2px ink underline; the row scrolls on phones */
.m-tabs{display:flex;gap:22px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px;scroll-padding-inline:16px;box-shadow:inset 0 -1px 0 var(--line)}
.m-tabs::-webkit-scrollbar{display:none}
.m-tabs button{flex:none;min-height:46px;border:0;background:none;padding:0;font-family:var(--f-display);font-weight:800;font-size:20px;letter-spacing:.03em;text-transform:uppercase;color:var(--muted);box-shadow:inset 0 -2px 0 transparent;white-space:nowrap}
.m-tabs button[aria-pressed="true"]{color:var(--ink);box-shadow:inset 0 -2px 0 var(--ink)}
.m-tabs button .n{font-family:var(--f-body);font-size:13px;font-weight:600;letter-spacing:0;margin-left:5px;color:var(--muted)}
.m-stabs{display:flex;align-items:center;gap:16px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px}
.m-stabs::-webkit-scrollbar{display:none}
.m-stabs .m-k{font-size:13px;color:var(--muted);flex:none}
.m-stabs button{flex:none;min-height:40px;border:0;background:none;padding:0;font-size:14px;font-weight:600;color:var(--muted);box-shadow:inset 0 -2px 0 transparent;white-space:nowrap}
.m-stabs button[aria-pressed="true"]{color:var(--ink);box-shadow:inset 0 -2px 0 var(--ink)}
.m-sel{display:flex;flex-direction:column;gap:6px}
/* the look rail: pages side by side, the next one peeking; snap one page at a time */
.m-rail{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -16px;padding:0 16px;scroll-padding-inline:16px;scrollbar-width:none;outline:none}
.m-rail::-webkit-scrollbar{display:none}
.m-rail:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.m-page{flex:0 0 calc(100% - 40px);scroll-snap-align:start;display:flex;flex-direction:column;gap:10px;min-width:0}
.m-ph{display:flex;align-items:center;gap:12px;min-height:44px}
.m-num{font-family:var(--f-display);font-weight:800;font-size:28px;line-height:1;min-width:52px;height:44px;padding:0 6px;display:grid;place-items:center;border-radius:8px;border:1px solid var(--line);color:var(--ink);flex:none}
.m-page.first .m-num{background:var(--coral);border-color:var(--coral);color:var(--coral-ink)}
.m-pt{display:flex;flex-direction:column;gap:2px;min-width:0}
.m-pt b{font-size:16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.m-pt > span{font-size:13px;color:var(--muted)}
.m-page .m-board{width:100%}
.m-pager{display:flex;align-items:center;justify-content:center;gap:4px;min-height:40px}
.m-pager .m-arrow{width:44px;height:40px;border:0;background:none;color:var(--ink);display:grid;place-items:center;border-radius:8px}
.m-pager .m-arrow svg{width:22px;height:22px}
.m-dots{display:flex;align-items:center}
.m-dots button{width:24px;height:24px;border:0;background:none;padding:0;display:grid;place-items:center}
.m-dots button i{width:8px;height:8px;border-radius:4px;background:var(--line)}
@media (prefers-reduced-motion:no-preference){.m-dots button i{transition:width .2s ease-out}}
.m-dots button[aria-current="true"] i{width:22px;background:var(--coral)}
.m-pager .m-count{font-size:13px;color:var(--muted);min-width:44px;text-align:center}
.m-cta{display:flex;gap:8px}
.m-cta .btn.cta{flex:1}
.m-why-h{display:flex;align-items:baseline;gap:10px;margin-top:20px}
.m-why-h h3{font-family:var(--f-display);font-weight:800;font-size:24px;line-height:1}
.m-after{display:flex;flex-direction:column;gap:12px}
.m-adv{margin:0;font-size:15px;line-height:1.5;max-width:62ch}
.m-pal{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted)}
.m-log{align-self:flex-start;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;background:none;border:0;padding:0;min-height:40px;color:var(--ink)}
@media (min-width:700px){
  .m-date h2{font-size:52px}
  .m-page{flex-basis:calc(58% - 6px)}
  .m-after{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);column-gap:32px;align-items:start}
  .m-why-h{grid-column:1/-1}
}
/* the spread starts at 1100px (owner's mix, 2026-10-25): at 1200px, iPad landscape (1133x744, 1180x820) put Wear this below the screen */
@media (min-width:1100px){
  .m-date h2{font-size:56px}
  .m-sel{flex-direction:row;align-items:flex-end;gap:32px;box-shadow:inset 0 -1px 0 var(--line)}
  .m-sel .m-tabs{box-shadow:none;margin:0;padding:0;flex:none}
  .m-sel .m-stabs{margin:0 0 3px auto;padding:0}
  /* the spread: every look at once, today's pick largest */
  .m-rail{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;gap:20px;overflow:visible;margin:0;padding:0;align-items:start}
  .m-page{flex:none}
  .m-pager{display:none}
  .m-cta{width:calc((100% - 60px) * 1.6 / 4.6)}
}
/* Closet: gallery tiles, flags as one corner mark */
.m-ttl{display:flex;align-items:flex-end;gap:12px}
.m-ttl h2{flex:1;font-size:40px;line-height:.95}
@media (min-width:700px){.m-ttl h2{font-size:52px}}
.m-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px}
@media (min-width:700px){.m-tiles{grid-template-columns:repeat(3,minmax(0,1fr));gap:24px 16px}}
@media (min-width:1200px){.m-tiles{grid-template-columns:repeat(5,minmax(0,1fr))}}
.m-tile{display:flex;flex-direction:column;gap:6px;border:0;padding:0;background:none;text-align:left;min-width:0}
.m-tile .m-g{aspect-ratio:4/5;border-radius:12px}
.m-tile .m-g img.cut{padding:12%}
.m-tile b{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-tile .m-meta{font-size:14px;color:var(--muted);margin-top:-4px}
.m-mark{position:absolute;right:8px;top:8px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center}
.m-mark svg{width:17px;height:17px}
.m-mark.warn{background:var(--warn-soft);color:var(--warn)}
.m-mark.bad{background:var(--bad-soft);color:var(--bad)}
/* Care: the garment leads the row */
.m-csec h3{font-family:var(--f-display);font-weight:800;font-size:28px;line-height:1;text-transform:uppercase;letter-spacing:.02em}
.m-csec{display:flex;align-items:baseline;gap:10px;margin-top:8px}
.m-csec .n{font-size:15px;color:var(--muted)}
.m-lede{margin:0;font-size:15px;color:var(--muted);max-width:62ch}
.m-crow{display:grid;grid-template-columns:112px minmax(0,1fr);gap:16px;align-items:start}
.m-crow .m-g{width:112px;aspect-ratio:4/5;border-radius:12px}
.m-crow b{font-size:18px;display:block;line-height:1.25}
.m-crow p{margin:6px 0 0;font-size:15px;color:var(--muted)}
.m-crow .m-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
@media (min-width:700px){.m-crow{grid-template-columns:160px minmax(0,1fr)}.m-crow .m-g{width:160px}}
'''


def page_look(o):
    first = o['rank'] == 1
    names = ', '.join(P[p]['n'] for p in o['pieces'] + o['acc'])
    style = f' <span class="stylepill" data-t="{o["style"]}">{o["style"]}</span>' if o.get('style') else ''
    head = (f'<div class="m-ph"><span class="m-num" aria-hidden="true">{o["rank"]:02d}</span><div class="m-pt">'
            f'<b>{t("Today’s pick") if first else t(o["match"])}{style}</b>'
            f'<span>{t(o["match"]) + " " + bars(o["bars"]) if first else bars(o["bars"])}</span></div></div>')
    return f'<article class="m-page{" first" if first else ""}" aria-label="Look {o["rank"]} of 4: {e(names)}">{head}{board(o, "1:1", label=False)}</article>'


def outfits():
    occ = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(x)}</button>' for k, x in enumerate(OCC))
    sty = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(x)}</button>' for k, x in enumerate(STYLES))
    dots = ''.join(f'<button data-dot aria-label="Look {k + 1}"{" aria-current=\"true\"" if k == 0 else ""}><i></i></button>' for k in range(4))
    return f'''<section class="m-view" data-view="outfits" aria-label="Outfits">
    <div class="m-date">
      <div class="m-dt"><h2>{t("Wednesday")}</h2><p>{t("Good morning")}<span aria-hidden="true">·</span>{ICON["wx"]}<span>{WEATHER}</span></p></div>
      <button class="iconbtn round" aria-label="Outfit diary" data-tl="Outfit diary">{ICON["diary"]}</button>
    </div>
    <div class="m-sel">
      <div class="m-tabs" role="group" aria-label="Occasion" data-group>{occ}</div>
      <div class="m-stabs" role="group" aria-label="Style" data-group><span class="m-k" data-t="Style">Style</span>{sty}</div>
    </div>
    <div class="m-rail" data-rail tabindex="0" aria-label="Looks for work, best first. Swipe or use the arrow keys.">{"".join(page_look(o) for o in OPTIONS)}</div>
    <div class="m-pager"><button class="m-arrow" data-step="-1" aria-label="Previous look">{ICON["prev"]}</button><span class="m-dots">{dots}</span><span class="m-count" data-count>1 of 4</span><button class="m-arrow" data-step="1" aria-label="Next look">{ICON["next"]}</button></div>
    <div class="m-cta"><button class="btn cta">{t("Wear this")}</button><button class="btn iconb" aria-label="Share this outfit" data-tl="Share this outfit">{ICON["share"]}</button></div>
    <div class="m-after">
      <div class="m-why-h"><h3 data-t="Why this outfit?">Why this outfit?</h3></div>
      {why()}
      <div style="display:flex;flex-direction:column;gap:12px">
        <p class="m-adv">{e(ADVICE)}</p>
        <div class="m-pal">{swatches()}<span>All-neutral palette</span></div>
        <div class="m-note"><span>3 pieces are still on their floor photo.</span><button class="btn sm">Make cut-outs</button></div>
        <button class="m-log">Wore something else? Log it</button>
      </div>
    </div>
    {foot("B")}
  </section>'''


def closet():
    tabs = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(c)}<span class="n">{n}</span></button>' for k, (c, n) in enumerate(CATS))
    tiles = []
    for p in CLOSET:
        x = P[p]; mk = ''
        if x.get('flag'):
            lab, tone = FLAG[x['flag']]; mk = f'<span class="m-mark {tone}">{ICON[x["flag"]]}<span class="m-sr">{e(lab)}</span></span>'
        tiles.append(f'<button class="m-tile"><span class="m-g{" m-cv" if x["kind"] != "photo" else ""}">{img(p)}{mk}</span>'
                     f'<b>{e(x["n"])}</b><span class="m-meta">{t(x["cond"])}</span></button>')
    return f'''<section class="m-view" data-view="closet" aria-label="Closet">
    <div class="m-ttl"><h2 data-t="Closet">Closet</h2><button class="btn sm" data-t="Stats">Stats</button></div>
    <div class="m-tabs" role="group" aria-label="Category" data-group>{tabs}</div>
    <div class="m-tiles">{"".join(tiles)}</div>
    {foot("B")}
  </section>'''


def care():
    x = P['rain']
    return f'''<section class="m-view" data-view="care" aria-label="Care">
    <div class="m-ttl"><h2 data-t="Care &amp; donate">Care &amp; donate</h2></div>
    <p class="m-lede">Items flagged by condition, wear and age. Nothing is removed until you confirm it.</p>
    <div class="m-csec"><h3>Repair</h3><span class="n">1</span></div>
    <div class="m-crow">{garment("rain")}<div><b>{e(x["n"])}</b><p>Zipper sticks, since Oct 2. Until it is fixed, it is suggested only for sport, home and chores.</p>
      <div class="m-acts"><button class="btn" data-t="Fixed">Fixed</button><button class="btn" data-t="Find a tailor">Find a tailor</button><button class="btn ghost" data-t="Open">Open</button></div></div></div>
    {foot("B")}
  </section>'''


def page():
    return (shell_head('Lookbook', 'B', CSS) + '<body data-view="outfits" class="dir-b">\n<div class="app"><div class="m-wrap">\n  ' + shell_top()
            + '\n  ' + outfits() + '\n  ' + closet() + '\n  ' + care() + '\n  ' + shop_view() + '\n</div></div>\n' + shell_nav())
