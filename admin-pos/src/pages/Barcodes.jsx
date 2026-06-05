import React, { useState, useEffect, useRef } from 'react';
import { Barcode, Printer, RefreshCw, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import adminApi from '../utils/adminApi';

const Barcodes = () => {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState({});
  const [counts, setCounts] = useState({});
  const [printMode, setPrintMode] = useState('a4');
  const [searchQ, setSearchQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await adminApi.getProducts();
        const prods = (res.data || []).filter(p => p.is_active !== 0 && p.barcode);
        setProducts(prods);
        const initCounts = {};
        prods.forEach(p => { initCounts[p.id] = 1; });
        setCounts(initCounts);
      } catch (e) {
        alert(e.message || 'Failed to load products.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    (p.barcode || '').toLowerCase().includes(searchQ.toLowerCase())
  );

  const toggleAll = () => {
    const allSelected = filtered.every(p => selected[p.id]);
    const next = {};
    if (!allSelected) filtered.forEach(p => { next[p.id] = true; });
    setSelected(next);
  };

  const toggleOne = (id) => {
    setSelected(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getSelectedCodes = () => {
    const codes = [];
    filtered.forEach(p => {
      if (selected[p.id] && p.barcode) {
        const n = parseInt(counts[p.id]) || 1;
        for (let i = 0; i < Math.min(n, 40); i++) {
          codes.push({ code: p.barcode, price: p.sale_price || p.price, name: p.name });
        }
      }
    });
    return codes;
  };

  const buildA4PrintWindow = (codes) => {
    const labels = [...codes];
    while (labels.length < 40) labels.push(null);

    const cells = labels.map((item, idx) => {
      if (!item) return `<div class="label empty"></div>`;
      const safeCode = item.code.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `<div class="label"><div class="lshop">Rangana Communication</div>${item.price ? `<div class="lprice">Rs. ${parseFloat(item.price).toFixed(2)}</div>` : `<div class="lprice">&nbsp;</div>`}<svg id="s${idx}"></svg><div class="lnum">${item.code}</div></div>`;
    }).join('');

    const inits = labels.map((item, idx) => {
      if (!item) return '';
      const safe = item.code.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `try{JsBarcode('#s${idx}','${safe}',{format:'CODE128',width:1.3,height:32,displayValue:false,margin:0,background:'#fff',lineColor:'#000'});}catch(e){}`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Barcodes A4</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
<style>
  @page{size:A4 portrait;margin:5mm 6mm}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#fff;}
  .hdr{text-align:center;font-size:8pt;color:#555;margin-bottom:3mm;}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:repeat(8,33.5mm);gap:1.5mm;width:100%;}
  .label{border:0.5px solid #bbb;padding:1.5mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
  .label.empty{border:0.5px dashed #ddd;background:#f9f9f9;}
  .lshop{font-size:6pt;font-weight:bold;margin-bottom:0.5mm;color:#222;}
  .lprice{font-size:8pt;font-weight:900;margin-bottom:0.5mm;color:#000;}
  svg{width:100%;height:auto;display:block;max-height:22mm;}
  .lnum{font-family:'Courier New',monospace;font-size:5.5pt;color:#333;margin-top:1mm;letter-spacing:0.5px;}
  @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="hdr">Barcodes &bull; ${codes.length} stickers &bull; ${new Date().toLocaleDateString()}</div>
<div class="grid">${cells}</div>
<script>window.onload=function(){${inits}setTimeout(function(){window.print();},800);};<\/script>
</body></html>`;
  };

  const buildRollPrintWindow = (codes) => {
    let rows = '';
    for (let i = 0; i < codes.length; i += 2) {
      const pair = [codes[i], codes[i + 1] || null];
      const cells = pair.map((item, idx) => {
        if (!item) return `<div class="sticker empty"></div>`;
        const globalIdx = i + idx;
        return `<div class="sticker"><div class="s-shop">Rangana Communication</div>${item.price ? `<div class="s-price">Rs. ${parseFloat(item.price).toFixed(2)}</div>` : ''}<svg id="sr${globalIdx}"></svg><div class="s-num">${item.code}</div></div>`;
      }).join('');
      rows += `<div class="sticker-row">${cells}</div>`;
    }

    const inits = codes.map((item, idx) => {
      const safe = item.code.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `try{JsBarcode('#sr${idx}','${safe}',{format:'CODE128',width:1.3,height:24,displayValue:false,margin:0,background:'#fff',lineColor:'#000'});}catch(e){}`;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Barcodes Roll</title>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
<style>
  @page{size:80mm auto;margin:0;}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;background:#fff;width:80mm;}
  .sticker-row{display:flex;width:80mm;height:25mm;overflow:hidden;page-break-inside:avoid;}
  .sticker{width:40mm;height:22mm;margin-bottom:3mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 1.5mm;}
  .sticker.empty{visibility:hidden;}
  .s-shop{font-size:6.5pt;font-weight:bold;margin-bottom:0.3mm;color:#222;line-height:1;}
  .s-price{font-size:7.5pt;font-weight:900;margin-bottom:0.3mm;color:#000;line-height:1;}
  svg{width:100%;max-width:34mm;height:auto;max-height:9mm;display:block;}
  .s-num{font-family:'Courier New',monospace;font-size:6pt;font-weight:bold;margin-top:0.3mm;line-height:1;}
  @media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>${rows}
<script>window.onload=function(){${inits}setTimeout(function(){window.print();},800);};<\/script>
</body></html>`;
  };

  const doPrint = () => {
    const codes = getSelectedCodes();
    if (!codes.length) { alert('Select at least one product with a barcode and set a count.'); return; }
    if (printMode === 'a4' && codes.length > 40) { alert('Max 40 per A4 sheet. Reduce selection.'); return; }

    setGenerating(true);
    const html = printMode === 'a4' ? buildA4PrintWindow(codes) : buildRollPrintWindow(codes);
    const pw = window.open('', '_blank', 'width=900,height=800');
    if (!pw) { alert('Pop-up blocked. Please allow pop-ups and retry.'); setGenerating(false); return; }
    pw.document.write(html);
    pw.document.close();
    setTimeout(() => setGenerating(false), 1000);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const totalLabels = getSelectedCodes().length;
  const allSelected = filtered.length > 0 && filtered.every(p => selected[p.id]);

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Barcode className="text-cyan-400" size={28} />
            Barcode <span className="text-cyan-400">Stickers</span>
          </h2>
          <p className="text-gray-500 mt-1 font-medium">Generate and print barcode stickers for your products.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Print mode toggle */}
          <div className="flex bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden">
            {['a4', 'roll'].map(mode => (
              <button
                key={mode}
                onClick={() => setPrintMode(mode)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${printMode === mode ? 'bg-cyan-500/20 text-cyan-400 border-r border-gray-800' : 'text-gray-500 hover:text-white border-r border-gray-800'}`}
              >
                {mode === 'a4' ? '📄 A4 (5×8)' : '🧾 Roll (2-col)'}
              </button>
            ))}
          </div>
          <button
            onClick={doPrint}
            disabled={generating || !selectedCount}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(0,242,254,0.25)]"
          >
            <Printer size={16} />
            {generating ? 'Opening...' : `Print ${totalLabels > 0 ? `(${totalLabels})` : ''}`}
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500 font-bold bg-[#0a0a0a] border border-gray-800 rounded-xl px-4 py-3">
        <span className="text-cyan-400">{selectedCount} products selected</span>
        <span>·</span>
        <span className="text-white">{totalLabels} labels total</span>
        {printMode === 'a4' && totalLabels > 40 && <span className="text-red-400">⚠️ Max 40 for A4</span>}
      </div>

      {/* Search + Select All */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search products or barcode..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-gray-800 text-white rounded-xl px-4 py-2.5 focus:border-cyan-500 outline-none text-sm placeholder-gray-600"
          />
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 bg-[#0a0a0a] border border-gray-800 hover:border-cyan-500 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
        >
          {allSelected ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} />}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-cyan-400 mr-3" size={24} />
          <span className="text-gray-400">Loading products...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <Barcode size={48} className="mx-auto mb-3 opacity-30" />
          <p>No products with barcodes found.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map(p => (
            <div
              key={p.id}
              onClick={() => toggleOne(p.id)}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all ${selected[p.id] ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-800 bg-[#0a0a0a] hover:border-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all ${selected[p.id] ? 'bg-cyan-500' : 'border border-gray-700'}`}>
                {selected[p.id] && <span className="text-black font-black text-xs">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">{p.name}</div>
                <div className="text-xs text-gray-500 font-mono">{p.barcode}</div>
              </div>
              <div className="text-sm font-black text-cyan-400 flex-shrink-0">
                Rs. {(p.sale_price || p.price || 0).toFixed(2)}
              </div>
              {/* Count input */}
              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setCounts(c => ({ ...c, [p.id]: Math.max(1, (c[p.id] || 1) - 1) }))}
                  className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold flex items-center justify-center text-lg leading-none"
                >−</button>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={counts[p.id] || 1}
                  onChange={e => setCounts(c => ({ ...c, [p.id]: Math.min(40, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="w-12 text-center bg-[#0a0a0a] border border-gray-800 text-white rounded-lg py-1 text-sm font-bold outline-none"
                />
                <button
                  onClick={() => setCounts(c => ({ ...c, [p.id]: Math.min(40, (c[p.id] || 1) + 1) }))}
                  className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-bold flex items-center justify-center text-lg leading-none"
                >+</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Barcodes;
