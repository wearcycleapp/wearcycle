"""Direction A, "Kit": every piece named and visible, all six occasions in view, options as an index. Dense."""
from gen_common import *

CSS = r'''
/* Direction A, Kit: compact type, display face only for numbers; everything visible, nothing scrolls sideways */
.m-wrap{max-width:1240px;margin:0 auto}
.m-day{display:flex;align-items:center;gap:8px;min-height:44px}
.dir-a .m-view{gap:12px}
.m-day .m-dt{flex:1 1 auto;min-width:0}
.m-day h2{font-size:22px;line-height:1;white-space:nowrap}
.m-day .m-dt p{margin:3px 0 0;font-size:13px;color:var(--muted);display:flex;align-items:center;gap:0 5px;flex-wrap:wrap}
.m-day .m-dt p svg{width:16px;height:16px}
.m-select{min-height:40px;display:inline-flex;align-items:center;gap:6px;padding:4px 10px 4px 12px;border:1px solid var(--line);border-radius:8px;background:var(--raised);font-size:13px;font-weight:600;line-height:1.2;text-align:left;flex:0 1 auto;min-width:0;max-width:52%}
.m-select .m-k{color:var(--muted);font-weight:500;white-space:nowrap}
@media (max-width:419px){.m-select .m-k{display:none}}
.m-select svg{width:16px;height:16px;color:var(--muted)}
.m-seg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
.m-seg button{min-height:40px;border:0;border-radius:8px;background:none;color:var(--muted);font-weight:600;font-size:14px;line-height:1.15;padding:4px 6px;overflow-wrap:anywhere}
.m-seg button[aria-pressed="true"]{background:var(--ink);color:var(--bg);font-weight:700}
.m-pickh{display:flex;align-items:center;gap:10px}
.m-rank{font-family:var(--f-display);font-weight:800;font-size:22px;line-height:1;width:36px;height:36px;border-radius:8px;display:grid;place-items:center;background:var(--coral);color:var(--coral-ink);flex:none}
.m-pt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.m-pt b{font-size:15px}
.m-pt > span{font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap}
/* the kit: top tall on the left, bottom and shoes stacked on the right, accessories in a row; every piece named */
.m-kit{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:8px}
.m-kt{display:flex;flex-direction:column;gap:4px;border:0;padding:0;background:none;text-align:left;min-width:0;cursor:pointer}
.m-kt .m-g{border-radius:10px;flex:1;min-height:0}
.m-kt .m-g img.cut{padding:8%}
.m-kt.top,.m-kt.bottom{grid-column:span 5}
.m-kt.top .m-g,.m-kt.bottom .m-g{aspect-ratio:4/5}
.m-kt.shoes,.m-kt.acc{grid-column:span 2}
.m-kt.shoes .m-g,.m-kt.acc .m-g{aspect-ratio:1/1}
.m-kt.shoes .m-kn{font-size:12px}
.m-kt.acc .m-g svg.glyph{width:56%;height:56%}
.m-kn{font-size:13px;font-weight:600;line-height:1.25;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.m-kn .m-k{display:block;font-size:12px;font-weight:500;color:var(--muted)}
.m-kt.acc .m-kn{font-size:12px;font-weight:500;color:var(--muted)}
.m-why1{font-size:14px}
.m-cta{display:flex;gap:8px}
.m-cta .btn.cta{flex:1}
.m-more{align-self:flex-start;font-size:14px;font-weight:600;text-decoration:underline;text-underline-offset:3px;background:none;border:0;padding:0;min-height:40px;color:var(--ink)}
.m-pal{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted)}
.m-adv{font-size:14px;color:var(--muted);margin:0}
.m-sec{display:flex;align-items:baseline;gap:8px;margin-top:8px}
.m-sec h3{font-size:15px}
.m-sec .n{font-family:var(--f-mono);font-size:12px;color:var(--muted)}
.m-sec .spacer{flex:1}
/* options as an index: one row per option, pieces as small squares, names in words */
.m-index{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}
.m-index li{border-bottom:1px solid var(--line)}
.m-index button{width:100%;display:grid;grid-template-columns:32px auto minmax(0,1fr);grid-template-rows:auto auto;column-gap:10px;row-gap:2px;align-items:center;padding:10px 0;border:0;background:none;text-align:left;min-height:64px}
.m-index .m-on{font-family:var(--f-display);font-weight:800;font-size:22px;grid-row:1/3}
.m-index .m-mini{display:flex;gap:4px;grid-row:1/3}
.m-index .m-mini .m-g{width:40px;height:40px;border-radius:6px}
.m-index .m-mini .m-g svg.glyph{width:70%;height:70%}
.m-index b{font-size:13px;font-weight:600;line-height:1.3;color:var(--ink);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.m-index span.m-ml{font-size:12px;color:var(--muted);display:flex;gap:6px;align-items:center}
/* layout bands */
.m-out{display:flex;flex-direction:column;gap:12px}
.m-col{display:flex;flex-direction:column;gap:12px;min-width:0}
@media (min-width:700px){
  .m-seg{grid-template-columns:repeat(6,minmax(0,1fr))}
  .m-out{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:24px;align-items:start}
  .m-day h2{font-size:26px}
}
@media (min-width:1200px){
  .m-out{grid-template-columns:minmax(0,1.25fr) minmax(0,.9fr) minmax(0,.85fr);gap:32px}
  .m-col.m-c3{grid-column:3;grid-row:1/3}
}
/* Closet: compact filters that wrap (all visible), dense tiles */
.m-chips{display:flex;flex-wrap:wrap;gap:6px}
.m-chips button{min-height:40px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--muted);font-weight:600;font-size:14px;display:inline-flex;align-items:center;gap:6px}
.m-chips button .n{font-family:var(--f-mono);font-size:12px;font-weight:500}
.m-chips button[aria-pressed="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.m-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
@media (min-width:700px){.m-tiles{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media (min-width:1200px){.m-tiles{grid-template-columns:repeat(6,minmax(0,1fr))}}
.m-tile{display:flex;flex-direction:column;gap:4px;border:0;padding:0;background:none;text-align:left;min-width:0}
.m-tile .m-g{aspect-ratio:1/1;border-radius:10px}
.m-tile .m-g img.cut{padding:10%}
.m-tile b{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.m-tile .m-meta{font-size:13px;color:var(--muted)}
.m-flag{position:absolute;left:6px;top:6px;font-size:12px;font-weight:600;padding:2px 8px;border-radius:999px;line-height:1.5}
.m-flag.warn{background:var(--warn-soft);color:var(--warn)}
.m-flag.bad{background:var(--bad-soft);color:var(--bad)}
.m-title{display:flex;align-items:center;gap:8px}
.m-title h2{flex:1;font-size:26px}
.m-lede{margin:0;font-size:14px;color:var(--muted)}
/* Care: one compact row; actions in line from 700px */
.m-crow{display:grid;grid-template-columns:56px minmax(0,1fr);column-gap:12px;row-gap:8px;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.m-crow .m-g{width:56px;height:56px;border-radius:8px}
.m-crow b{font-size:14px;display:block}
.m-crow p{margin:2px 0 0;font-size:13px;color:var(--muted)}
.m-crow .m-acts{grid-column:2;display:flex;gap:6px;flex-wrap:wrap}
@media (min-width:700px){.m-crow{grid-template-columns:56px minmax(0,1fr) auto;align-items:center}.m-crow .m-acts{grid-column:3}}
'''


def kit(opt):
    out = []
    for p in opt['pieces']:
        x = P[p]
        lab = '' if x['cat'] == 'shoes' else f'<span class="m-k" data-t="{CAT[x["cat"]]}">{CAT[x["cat"]]}</span>'
        out.append(f'<button class="m-kt {x["cat"]}{" acc" if x["cat"] == "shoes" else ""}" aria-label="{e(CAT[x["cat"]])}: {e(x["n"])}. Tap to see it">{garment(p)}'
                   f'<span class="m-kn">{lab}{e(x["n"])}</span></button>')
    for p in opt['acc']:
        x = P[p]
        out.append(f'<button class="m-kt acc" aria-label="{e(CAT[x["cat"]])}: {e(x["n"])}. Tap to see it">{garment(p)}<span class="m-kn">{e(x["n"])}</span></button>')
    return '<div class="m-kit">' + ''.join(out) + '</div>'


def index():
    rows = []
    for o in OPTIONS[1:]:
        mini = ''.join(garment(p) for p in o['pieces'])
        rows.append(f'<li><button aria-label="Option {o["rank"]}, {e(o["match"])}: {e(", ".join(P[p]["n"] for p in o["pieces"]))}">'
                    f'<span class="m-on">{o["rank"]:02d}</span><span class="m-mini">{mini}</span>'
                    f'<b>{e(", ".join(P[p]["n"] for p in o["pieces"]))}</b><span class="m-ml">{t(o["match"])} {bars(o["bars"])}</span></button></li>')
    return '<ol class="m-index">' + ''.join(rows) + '</ol>'


def outfits():
    o = OPTIONS[0]
    seg = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(x)}</button>' for k, x in enumerate(OCC))
    return f'''<section class="m-view" data-view="outfits" aria-label="Outfits">
    <div class="m-day">
      <div class="m-dt"><h2>{t("Wednesday")}</h2><p>{ICON["wx"]}<span>{WEATHER}</span> · {t("Good morning")}</p></div>
      <button class="m-select" aria-label="Style: All my styles. Change"><span class="m-k" data-t="Style">Style</span>{t("All my styles")}{ICON["down"]}</button>
      <button class="iconbtn round" aria-label="Outfit diary" data-tl="Outfit diary">{ICON["diary"]}</button>
    </div>
    <div class="m-seg" role="group" aria-label="Occasion" data-group>{seg}</div>
    <div class="m-out">
      <div class="m-col">
        <div class="m-pickh"><span class="m-rank" aria-hidden="true">1</span><div class="m-pt"><b data-t="Today’s pick">Today’s pick</b><span>{t(o["match"])} {bars(5)} · {t("Minimal")}</span></div>
          <button class="iconbtn" aria-label="Adjust: outer layer, view and palette" data-tl="Adjust">{ICON["adjust"]}</button></div>
        {kit(o)}
      </div>
      <div class="m-col">
        <div class="m-cta"><button class="btn cta">{t("Wear this")}</button><button class="btn iconb" aria-label="Share this outfit" data-tl="Share this outfit">{ICON["share"]}</button></div>
        <ul class="m-why m-why1"><li class="neg">{e(REASONS[0][1])}</li></ul>
        <button class="m-more" aria-expanded="false">4 more reasons</button>
        <p class="m-adv">{e(ADVICE)}</p>
        <div class="m-pal">{swatches()}<span>All-neutral palette</span></div>
        <div class="m-note"><span>3 pieces are still on their floor photo.</span><button class="btn sm">Make cut-outs</button></div>
      </div>
      <div class="m-col m-c3">
        <div class="m-sec"><h3 data-t="More options">More options</h3><span class="n">3</span><span class="spacer"></span><button class="btn sm" data-t="New ideas">New ideas</button></div>
        {index()}
        <button class="m-more">Wore something else? Log it</button>
      </div>
    </div>
    {foot("A")}
  </section>'''


def closet():
    chips = ''.join(f'<button data-pick aria-pressed="{str(k == 0).lower()}">{t(c)}<span class="n">{n}</span></button>' for k, (c, n) in enumerate(CATS))
    tiles = []
    for p in CLOSET:
        x = P[p]; fl = ''
        if x.get('flag'):
            lab, tone = FLAG[x['flag']]; fl = f'<span class="m-flag {tone}">{t(lab)}</span>'
        tiles.append(f'<button class="m-tile"><span class="m-g{" m-cv" if x["kind"] != "photo" else ""}">{img(p)}{fl}</span>'
                     f'<b>{e(x["n"])}</b><span class="m-meta">{t(x["cond"])} · {x["worn"]} wears</span></button>')
    return f'''<section class="m-view" data-view="closet" aria-label="Closet">
    <div class="m-title"><h2 data-t="Closet">Closet</h2><button class="btn sm" data-t="Stats">Stats</button></div>
    <div class="m-chips" role="group" aria-label="Category" data-group>{chips}</div>
    <div class="m-tiles">{"".join(tiles)}</div>
    {foot("A")}
  </section>'''


def care():
    x = P['rain']
    return f'''<section class="m-view" data-view="care" aria-label="Care">
    <div class="m-title"><h2 data-t="Care &amp; donate">Care &amp; donate</h2></div>
    <p class="m-lede">Items flagged by condition, wear and age. Nothing is removed until you confirm it.</p>
    <div class="m-sec"><h3>Repair</h3><span class="n">1</span></div>
    <div class="m-crow">{garment("rain")}<div><b>{e(x["n"])}</b><p>Zipper sticks · since Oct 2. Suggested only for sport, home and chores until fixed.</p></div>
      <div class="m-acts"><button class="btn sm" data-t="Fixed">Fixed</button><button class="btn sm" data-t="Find a tailor">Find a tailor</button><button class="btn sm ghost" data-t="Open">Open</button></div></div>
    {foot("A")}
  </section>'''


def page():
    return (shell_head('Kit', 'A', CSS) + '<body data-view="outfits" class="dir-a">\n<div class="app"><div class="m-wrap">\n  ' + shell_top()
            + '\n  ' + outfits() + '\n  ' + closet() + '\n  ' + care() + '\n  ' + shop_view() + '\n</div></div>\n' + shell_nav())
