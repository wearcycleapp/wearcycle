/* Care, "Not getting picked" (Phase 15): ranks outfits for every occasion away from the page, with the same
   logic.js, so the page stays usable while it works (about 2 s on a slow phone). The page sends everything the
   ranking reads: pieces without their pictures, one context per occasion (with its clock), the dress code and the
   department. Answers carry ids only; the page keeps the pieces. */
importScripts('logic.js');
const L = WardrobeLogic;
onmessage = e => {
  const m = e.data;
  L.setDressCode(m.work); L.setDept(m.dept);
  if (m.kind === 'list') {
    const r = L.notPicked(m.items, o => m.ctxs[o], { n: m.n });
    postMessage({ id: m.id, list: r.map(x => ({ id: x.item.id, occs: x.occs })) });
  } else if (m.kind === 'why') {
    const why = m.pins.map(p => {
      const it = m.items.find(i => i.id === p.id);
      const f = it ? L.suggest(m.items, p.occ, m.ctxs[p.occ], { n: 1, layer: m.layer, pin: it }).outfits[0] : null;
      return { id: p.id, has: !!f, neg: f ? ((f.reasons || []).filter(x => x.neg).map(x => x.t)[0] || '') : '' };
    });
    postMessage({ id: m.id, why });
  }
};
