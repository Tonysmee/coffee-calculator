"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Chart.js loaded via CDN script tag in layout ──────────────────────
const FILE_NAME = "coffee_recipes.json";

const CAT_EMOJI  = { "Coffee":"☕","Milk":"🥛","Whipping Cream":"🍦","Sugar Syrup":"🍬","Coconut Syrup":"🥥","Matcha":"🍵","Packaging":"📦","Other":"💧" };
const CAT_COLORS = { "Coffee":"#6F4E37","Milk":"#E8C99A","Whipping Cream":"#F5CBA7","Sugar Syrup":"#F9E79F","Coconut Syrup":"#A9DFBF","Matcha":"#82C45E","Packaging":"#AED6F1","Other":"#D7DBDD","Custom":"#C39BD3","Profit":"#1D9E75" };

const DEFAULT_LIBRARY = [
  { id:"coffee_18g", category:"Coffee",         name:"Espresso shot (18g)",   unit:"shot",  costPerUnit:5.86,   photo:"" },
  { id:"coffee_1g",  category:"Coffee",         name:"Coffee bean",           unit:"g",     costPerUnit:0.3255, photo:"" },
  { id:"milk_ml",    category:"Milk",           name:"Pure Milk",             unit:"ml",    costPerUnit:0.0912, photo:"" },
  { id:"milk_100ml", category:"Milk",           name:"Pure Milk (100ml)",     unit:"100ml", costPerUnit:9.12,   photo:"" },
  { id:"cream_ml",   category:"Whipping Cream", name:"Whipping Cream",        unit:"ml",    costPerUnit:0.078,  photo:"" },
  { id:"cream_10ml", category:"Whipping Cream", name:"Whipping Cream (10ml)", unit:"10ml",  costPerUnit:0.78,   photo:"" },
  { id:"cream_15ml", category:"Whipping Cream", name:"Whipping Cream (15ml)", unit:"15ml",  costPerUnit:1.17,   photo:"" },
  { id:"cream_30ml", category:"Whipping Cream", name:"Whipping Cream (30ml)", unit:"30ml",  costPerUnit:2.34,   photo:"" },
  { id:"sugar_ml",   category:"Sugar Syrup",    name:"Sugar Syrup",           unit:"ml",    costPerUnit:0.0144, photo:"" },
  { id:"sugar_10ml", category:"Sugar Syrup",    name:"Sugar Syrup (10ml)",    unit:"10ml",  costPerUnit:0.144,  photo:"" },
  { id:"sugar_20ml", category:"Sugar Syrup",    name:"Sugar Syrup (20ml)",    unit:"20ml",  costPerUnit:0.289,  photo:"" },
  { id:"sugar_50ml", category:"Sugar Syrup",    name:"Sugar Syrup (50ml)",    unit:"50ml",  costPerUnit:0.722,  photo:"" },
  { id:"sugar_100ml",category:"Sugar Syrup",    name:"Sugar Syrup (100ml)",   unit:"100ml", costPerUnit:1.444,  photo:"" },
  { id:"coco_ml",    category:"Coconut Syrup",  name:"Coconut Syrup",         unit:"ml",    costPerUnit:0.1852, photo:"" },
  { id:"coco_10ml",  category:"Coconut Syrup",  name:"Coconut Syrup (10ml)",  unit:"10ml",  costPerUnit:1.852,  photo:"" },
  { id:"coco_20ml",  category:"Coconut Syrup",  name:"Coconut Syrup (20ml)",  unit:"20ml",  costPerUnit:3.705,  photo:"" },
  { id:"coco_500ml", category:"Coconut Syrup",  name:"Coconut Syrup (500ml)", unit:"500ml", costPerUnit:92.62,  photo:"" },
  { id:"matcha_g",   category:"Matcha",         name:"Matcha",                unit:"g",     costPerUnit:1.40,   photo:"" },
  { id:"matcha_4g",  category:"Matcha",         name:"Matcha (4g)",           unit:"4g",    costPerUnit:5.60,   photo:"" },
  { id:"matcha_10g", category:"Matcha",         name:"Matcha (10g)",          unit:"10g",   costPerUnit:14.00,  photo:"" },
  { id:"cup_plastic",category:"Packaging",      name:"Plastic Cup",           unit:"pc",    costPerUnit:1.00,   photo:"" },
  { id:"lid",        category:"Packaging",      name:"Lid",                   unit:"pc",    costPerUnit:0.50,   photo:"" },
  { id:"straw",      category:"Packaging",      name:"Straw",                 unit:"pc",    costPerUnit:0.30,   photo:"" },
  { id:"paper_cup",  category:"Packaging",      name:"Paper Cup (hot)",       unit:"pc",    costPerUnit:1.50,   photo:"" },
  { id:"sleeve",     category:"Packaging",      name:"Cup Sleeve",            unit:"pc",    costPerUnit:0.50,   photo:"" },
  { id:"ice",        category:"Other",          name:"Ice",                   unit:"serve", costPerUnit:0.50,   photo:"" },
  { id:"water",      category:"Other",          name:"Water",                 unit:"serve", costPerUnit:0.50,   photo:"" },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const emptyRow    = () => ({ id: uid(), name: "", qty: 1, cost: 0 });
const emptyRecipe = () => ({ id: uid(), name: "New Recipe", salePrice: 0, primary: [emptyRow()], secondary: [emptyRow()] });

// ── API call (goes to our own /api/drive — no CORS issues in any browser)
async function callDrive(toolName, toolInput) {
  const res = await fetch("/api/drive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ toolName, toolInput }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result || null;
}

function extractJSON(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function findDriveFile() {
  const raw = await callDrive("search_files", { query: `name = '${FILE_NAME}'`, page_size: 5 });
  const parsed = extractJSON(raw);
  const files = parsed?.files || parsed?.items || [];
  return files[0] || null;
}

// ── Calculations ──────────────────────────────────────────────────────
function calcRecipe(r) {
  const sum = rows => rows.reduce((s, row) => s + (parseFloat(row.qty)||0) * (parseFloat(row.cost)||0), 0);
  const primaryTotal   = sum(r.primary);
  const secondaryTotal = sum(r.secondary);
  const totalCost = primaryTotal + secondaryTotal;
  const sale   = parseFloat(r.salePrice) || 0;
  const profit = sale - totalCost;
  const margin = sale > 0 ? (totalCost / sale) * 100 : 0;
  return { primaryTotal, secondaryTotal, totalCost, profit, margin, sale };
}

// ── Styles (plain objects — works in any browser) ─────────────────────
const S = {
  app:        { maxWidth: 1100, margin: "0 auto", padding: "24px 20px 60px" },
  topbar:     { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 24, flexWrap:"wrap", gap: 12 },
  title:      { fontSize: 22, fontWeight: 700, color: "#1a1a1a", display:"flex", alignItems:"center", gap: 10, margin: 0 },
  card:       { background:"#fff", borderRadius: 16, padding: 24, boxShadow:"0 2px 16px rgba(0,0,0,0.07)", border:"1px solid #eee" },
  field:      { display:"flex", flexDirection:"column", gap: 5 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color:"#ccc", letterSpacing:"0.06em", textTransform:"uppercase" },
  fieldInput: { padding:"10px 13px", border:"1.5px solid #eee", borderRadius: 10, fontSize: 16, fontWeight: 600, background:"#fafafa", color:"#1a1a1a", outline:"none", width:"100%", boxSizing:"border-box" },
  statCard:   { borderRadius: 12, padding:"14px 16px", border:"1px solid #eee" },
  statLabel:  { fontSize: 11, fontWeight: 700, color:"#ccc", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom: 5 },
  statValue:  { fontSize: 22, fontWeight: 700, marginBottom: 3 },
  statSub:    { fontSize: 11, color:"#ccc" },
  sectionHd:  { display:"flex", alignItems:"center", gap: 10, marginBottom: 10 },
  sectionTit: { fontSize: 12, fontWeight: 700, color:"#888", textTransform:"uppercase", letterSpacing:"0.06em" },
  colHd:      { display:"grid", gridTemplateColumns:"40px 1fr 80px 90px 76px 36px", gap: 8, padding:"0 0 6px", borderBottom:"1px solid #f5f5f5", marginBottom: 4 },
  colHdTxt:   { fontSize: 10, fontWeight: 700, color:"#ccc", letterSpacing:"0.05em", textTransform:"uppercase" },
  ingRow:     { display:"grid", gridTemplateColumns:"40px 1fr 80px 90px 76px 36px", gap: 8, alignItems:"center", padding:"7px 0", borderBottom:"1px solid #f9f9f9" },
  ingIcon:    { width: 36, height: 36, borderRadius: 9, background:"#f3f3f3", display:"flex", alignItems:"center", justifyContent:"center", fontSize: 16, flexShrink: 0, overflow:"hidden" },
  ingNameWrap:{ display:"flex", gap: 6, alignItems:"center", minWidth: 0 },
  ingInput:   { flex: 1, minWidth: 0, padding:"7px 10px", border:"1.5px solid #ebebeb", borderRadius: 8, fontSize: 13, background:"#fafafa", color:"#1a1a1a", outline:"none", boxSizing:"border-box" },
  numInput:   { width:"100%", padding:"7px 8px", border:"1.5px solid #ebebeb", borderRadius: 8, fontSize: 13, background:"#fafafa", textAlign:"center", outline:"none", boxSizing:"border-box" },
  ingTotal:   { fontSize: 13, fontWeight: 700, color:"#1a1a1a", textAlign:"right", paddingRight: 4 },
  delBtn:     { width: 30, height: 30, border:"none", background:"none", borderRadius: 7, cursor:"pointer", fontSize: 18, color:"#ccc", display:"flex", alignItems:"center", justifyContent:"center" },
  piePanel:   { background:"#fafafa", border:"1px solid #eee", borderRadius: 14, padding: 18, position:"sticky", top: 20 },
};

function btn(variant = "secondary", extra = {}) {
  const base = { display:"inline-flex", alignItems:"center", gap: 6, padding:"9px 16px", borderRadius: 10, border:"none", fontSize: 13, fontWeight: 600, cursor:"pointer", whiteSpace:"nowrap" };
  const variants = {
    primary:   { background:"#6F4E37", color:"#fff" },
    secondary: { background:"#fff", color:"#555", border:"1.5px solid #eee" },
    danger:    { background:"#fff0f0", color:"#E24B4A", border:"1.5px solid #ffd5d5" },
    ghost:     { background:"none", border:"1.5px dashed #ddd", color:"#888" },
    lib:       { background:"#fdf7f4", color:"#6F4E37", border:"1.5px solid #e8d5c9" },
  };
  return { ...base, ...variants[variant], ...extra };
}

// ── Sub-components ────────────────────────────────────────────────────

function StatusBadge({ type, msg }) {
  const colors = { idle:"#aaa", saving:"#EF9F27", saved:"#1D9E75", loading:"#378ADD", error:"#E24B4A" };
  const c = colors[type] || "#aaa";
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap: 6, padding:"4px 12px", borderRadius: 20, background: c+"18", border:`1px solid ${c}33` }}>
      <span style={{ width: 7, height: 7, borderRadius:"50%", background: c, flexShrink: 0,
        animation: (type==="saving"||type==="loading") ? "pulse 1s infinite" : "none" }} />
      <span style={{ fontSize: 12, fontWeight: 500, color: c }}>{msg}</span>
    </span>
  );
}

function SyncBanner({ visible }) {
  if (!visible) return null;
  return (
    <div style={{ position:"fixed", top: 16, left:"50%", transform:"translateX(-50%)", background:"#378ADD", color:"#fff", padding:"10px 20px", borderRadius: 30, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow:"0 4px 20px rgba(0,0,0,0.2)", display:"flex", alignItems:"center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius:"50%", background:"#fff", animation:"pulse 1s infinite", display:"inline-block" }} />
      Syncing changes from Drive…
    </div>
  );
}

function IngRow({ row, libItem, onChange, onDelete, onPickLib }) {
  const total = ((parseFloat(row.qty)||0) * (parseFloat(row.cost)||0)).toFixed(2);
  const emoji = libItem ? (CAT_EMOJI[libItem.category]||"•") : "✏️";
  const photo = libItem?.photo || "";
  return (
    <div style={S.ingRow}>
      <div style={S.ingIcon}>
        {photo ? <img src={photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius: 9 }} /> : <span>{emoji}</span>}
      </div>
      <div style={S.ingNameWrap}>
        <input style={S.ingInput} type="text" value={row.name} placeholder="Item name…"
          onChange={e => onChange({ ...row, name: e.target.value })}
          onFocus={e => e.target.style.borderColor="#6F4E37"}
          onBlur={e  => e.target.style.borderColor="#ebebeb"} />
        <button style={btn("lib", { padding:"6px 10px", fontSize: 12 })} onClick={onPickLib}>Library</button>
      </div>
      <input style={S.numInput} type="number" value={row.qty} min="0" step="any"
        onChange={e => onChange({ ...row, qty: e.target.value })}
        onFocus={e => e.target.style.borderColor="#6F4E37"}
        onBlur={e  => e.target.style.borderColor="#ebebeb"} />
      <input style={S.numInput} type="number" value={row.cost} min="0" step="any"
        onChange={e => onChange({ ...row, cost: e.target.value })}
        onFocus={e => e.target.style.borderColor="#6F4E37"}
        onBlur={e  => e.target.style.borderColor="#ebebeb"} />
      <div style={S.ingTotal}>฿{total}</div>
      <button style={S.delBtn} onClick={onDelete}
        onMouseEnter={e => { e.currentTarget.style.background="#fff0f0"; e.currentTarget.style.color="#E24B4A"; }}
        onMouseLeave={e => { e.currentTarget.style.background="none";    e.currentTarget.style.color="#ccc"; }}>×</button>
    </div>
  );
}

function Section({ title, dot, rows, library, onChange, onAdd, onOpenLibPicker }) {
  const subtotal = rows.reduce((s,r) => s + (parseFloat(r.qty)||0)*(parseFloat(r.cost)||0), 0);
  const updateRow = (id, u) => onChange(rows.map(r => r.id===id ? u : r));
  const deleteRow = id => onChange(rows.filter(r => r.id!==id));
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={S.sectionHd}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:dot, flexShrink:0 }} />
        <span style={S.sectionTit}>{title}</span>
        <div style={{ flex:1, height:1, background:"#f0f0f0" }} />
        <span style={{ fontSize:12, color:"#888" }}>Subtotal: <strong style={{ color:"#1a1a1a" }}>฿{subtotal.toFixed(2)}</strong></span>
      </div>
      <div style={S.colHd}>
        <span /><span style={S.colHdTxt}>Ingredient Name</span>
        <span style={{ ...S.colHdTxt, textAlign:"center" }}>Qty</span>
        <span style={{ ...S.colHdTxt, textAlign:"center" }}>Cost/unit ฿</span>
        <span style={{ ...S.colHdTxt, textAlign:"right" }}>Total</span>
        <span />
      </div>
      {rows.map(r => (
        <IngRow key={r.id} row={r}
          libItem={library.find(i => i.name===r.name) || null}
          onChange={u => updateRow(r.id, u)}
          onDelete={() => deleteRow(r.id)}
          onPickLib={() => onOpenLibPicker(r.id)} />
      ))}
      <div style={{ display:"flex", gap: 8, marginTop: 10, flexWrap:"wrap" }}>
        <button style={btn("ghost", { padding:"6px 12px", fontSize:13 })} onClick={onAdd}>+ Custom row</button>
        <button style={btn("lib",   { padding:"6px 12px", fontSize:13 })} onClick={() => onOpenLibPicker("new")}>☕ From Library</button>
      </div>
    </div>
  );
}

function PieChart({ recipe, calc, library }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  useEffect(() => {
    const Chart = window.Chart;
    if (!Chart || !canvasRef.current) return;
    const groups = {};
    [...recipe.primary, ...recipe.secondary].forEach(r => {
      const val = (parseFloat(r.qty)||0) * (parseFloat(r.cost)||0);
      if (val <= 0) return;
      const ing = library.find(i => i.name===r.name);
      const cat = ing ? ing.category : "Custom";
      const key = r.name || cat;
      groups[key] = (groups[key]||0) + val;
    });
    const labels=[], data=[], colors=[];
    Object.entries(groups).forEach(([name,val]) => {
      const ing = library.find(i => i.name===name);
      const cat = ing ? ing.category : "Custom";
      labels.push(name||cat); data.push(parseFloat(val.toFixed(2))); colors.push(CAT_COLORS[cat]||CAT_COLORS["Custom"]);
    });
    if (calc.profit > 0) { labels.push("Profit"); data.push(parseFloat(calc.profit.toFixed(2))); colors.push(CAT_COLORS["Profit"]); }
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current=null; }
    if (data.length===0) return;
    chartRef.current = new Chart(canvasRef.current.getContext("2d"), {
      type:"doughnut",
      data:{ labels, datasets:[{ data, backgroundColor:colors, borderWidth:0, hoverOffset:6 }] },
      options:{ cutout:"58%", responsive:true, plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: ctx => ` ฿${ctx.parsed.toFixed(2)} (${((ctx.parsed/data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)` } } } }
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current=null; } };
  });
  const groups2 = {};
  [...recipe.primary, ...recipe.secondary].forEach(r => {
    const val = (parseFloat(r.qty)||0)*(parseFloat(r.cost)||0);
    if (val<=0) return;
    const ing = library.find(i=>i.name===r.name);
    const cat = ing?ing.category:"Custom";
    const key = r.name||cat;
    groups2[key]=(groups2[key]||0)+val;
  });
  const legendItems = Object.entries(groups2).map(([name,val]) => {
    const ing=library.find(i=>i.name===name); const cat=ing?ing.category:"Custom";
    return { name, val, color:CAT_COLORS[cat]||CAT_COLORS["Custom"] };
  });
  if (calc.profit>0) legendItems.push({ name:"Profit", val:calc.profit, color:CAT_COLORS["Profit"] });
  return (
    <div>
      <canvas ref={canvasRef} style={{ maxHeight: 220 }} />
      <div style={{ marginTop: 12, display:"flex", flexDirection:"column", gap: 5 }}>
        {legendItems.length===0 && <div style={{ color:"#ccc", fontSize:13, textAlign:"center", padding:"1rem 0" }}>Add ingredients to see breakdown</div>}
        {legendItems.map((i,idx) => (
          <div key={idx} style={{ display:"flex", alignItems:"center", gap: 8, fontSize:12, color:"#555" }}>
            <div style={{ width:9, height:9, borderRadius:"50%", background:i.color, flexShrink:0 }} />
            <span style={{ flex:1 }}>{i.name}</span>
            <span style={{ fontWeight:600, color:"#1a1a1a" }}>฿{i.val.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Library Picker Modal ──────────────────────────────────────────────
function LibraryPicker({ library, onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const [cat, setCat]       = useState("All");
  const cats    = ["All", ...new Set(library.map(i=>i.category))];
  const filtered = library.filter(i =>
    (cat==="All"||i.category===cat) && i.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding: 16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:480, maxHeight:"85vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 80px rgba(0,0,0,0.22)", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid #f0f0f0", display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:15, fontWeight:700, flex:1 }}>📚 Add from Library</span>
          <button style={btn("secondary",{width:32,height:32,padding:0,justifyContent:"center",borderRadius:8})} onClick={onClose}>×</button>
        </div>
        <div style={{ padding:"12px 20px", borderBottom:"1px solid #f0f0f0", background:"#fafafa" }}>
          <input autoFocus type="text" placeholder="🔍  Search…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e8e8e8", borderRadius:10, fontSize:14, outline:"none", background:"#fff", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:6, padding:"10px 20px", borderBottom:"1px solid #f0f0f0", flexWrap:"wrap", background:"#fafafa" }}>
          {cats.map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ padding:"4px 12px", borderRadius:20, border:`1.5px solid ${c===cat?"#6F4E37":"#e8e8e8"}`, background:c===cat?"#6F4E37":"#fff", color:c===cat?"#fff":"#666", fontSize:12, fontWeight:500, cursor:"pointer" }}>{c}</button>
          ))}
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {filtered.length===0 && <div style={{ padding:"3rem", textAlign:"center", color:"#ccc", fontSize:14 }}>No ingredients found</div>}
          {filtered.map(ing=>(
            <div key={ing.id} onClick={()=>{ onSelect(ing); onClose(); }}
              style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 20px", cursor:"pointer" }}
              onMouseEnter={e=>e.currentTarget.style.background="#fdf7f4"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              <div style={{ width:40, height:40, borderRadius:10, background:"#f3f3f3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, overflow:"hidden" }}>
                {ing.photo ? <img src={ing.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : (CAT_EMOJI[ing.category]||"•")}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500, color:"#1a1a1a" }}>{ing.name}</div>
                <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{ing.category} · per {ing.unit}</div>
              </div>
              <div style={{ fontSize:14, fontWeight:700, color:"#6F4E37" }}>฿{ing.costPerUnit.toFixed(3)}</div>
              <button style={btn("lib",{padding:"5px 12px",fontSize:12})}>Add</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Library Manager Modal ─────────────────────────────────────────────
function LibraryManager({ library, onChange, onClose }) {
  const [search, setSearch]     = useState("");
  const [cat, setCat]           = useState("All");
  const [editing, setEditing]   = useState(null); // null | { ...ing } | { isNew:true }
  const [photoData, setPhotoData] = useState("");
  const cats = ["All", ...new Set([...library.map(i=>i.category), "Coffee","Milk","Whipping Cream","Sugar Syrup","Coconut Syrup","Matcha","Packaging","Other"])];
  const uniqueCats = [...new Set(cats)];
  const filtered = library.filter(i => (cat==="All"||i.category===cat) && i.name.toLowerCase().includes(search.toLowerCase()));

  const startNew  = () => { setEditing({ isNew:true, id:uid(), category:"Coffee", name:"", unit:"", costPerUnit:0, photo:"" }); setPhotoData(""); };
  const startEdit = ing  => { setEditing({ ...ing }); setPhotoData(ing.photo||""); };
  const handlePhoto = e => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{ setPhotoData(ev.target.result); setEditing(prev=>({...prev,photo:ev.target.result})); };
    reader.readAsDataURL(file);
  };
  const saveIng = () => {
    if (!editing?.name?.trim()) { alert("Please enter a name"); return; }
    const updated = { ...editing, photo: photoData };
    if (editing.isNew) { delete updated.isNew; onChange([...library, updated]); }
    else { onChange(library.map(i=>i.id===editing.id?updated:i)); }
    setEditing(null);
  };
  const deleteIng = id => { if (confirm("Delete this ingredient?")) onChange(library.filter(i=>i.id!==id)); };

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:640, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 80px rgba(0,0,0,0.22)", overflow:"hidden" }}>
        <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid #f0f0f0", display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:16, fontWeight:700, flex:1 }}>📚 Ingredient Library</span>
          <button style={btn("primary",{padding:"6px 14px",fontSize:13})} onClick={startNew}>+ Add New</button>
          <button style={btn("secondary",{width:32,height:32,padding:0,justifyContent:"center",borderRadius:8})} onClick={onClose}>×</button>
        </div>

        {/* Inline edit/add form */}
        {editing && (
          <div style={{ padding:"16px 20px", background:"#fdf7f4", borderBottom:"1px solid #f0e0d6" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#6F4E37", marginBottom:12 }}>{editing.isNew?"Add New Ingredient":"Edit Ingredient"}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ gridColumn:"span 2", display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ width:56, height:56, borderRadius:10, overflow:"hidden", background:"#f3f3f3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
                  {photoData ? <img src={photoData} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : (CAT_EMOJI[editing.category]||"•")}
                </div>
                <label style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"1.5px dashed #ddd", borderRadius:8, cursor:"pointer", fontSize:12, color:"#888", background:"#fff" }}>
                  📷 Upload photo
                  <input type="file" accept="image/*" style={{ display:"none" }} onChange={handlePhoto} />
                </label>
              </div>
              {[
                { label:"Name", key:"name", type:"text", placeholder:"e.g. Oat Milk" },
                { label:"Category", key:"category", type:"select", options: uniqueCats.filter(c=>c!=="All") },
                { label:"Unit",     key:"unit", type:"text", placeholder:"ml, g, pc, shot…" },
                { label:"Cost per unit (฿)", key:"costPerUnit", type:"number", placeholder:"0.00" },
              ].map(f=>(
                <div key={f.key}>
                  <div style={{ fontSize:11, fontWeight:700, color:"#aaa", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:4 }}>{f.label}</div>
                  {f.type==="select"
                    ? <select value={editing[f.key]} onChange={e=>setEditing(p=>({...p,[f.key]:e.target.value}))}
                        style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #e8e8e8", borderRadius:8, fontSize:13, background:"#fff", outline:"none", boxSizing:"border-box" }}>
                        {f.options.map(o=><option key={o}>{o}</option>)}
                      </select>
                    : <input type={f.type} value={editing[f.key]} placeholder={f.placeholder} step={f.type==="number"?"any":undefined}
                        onChange={e=>setEditing(p=>({...p,[f.key]:e.target.value}))}
                        style={{ width:"100%", padding:"8px 10px", border:"1.5px solid #e8e8e8", borderRadius:8, fontSize:13, background:"#fff", outline:"none", boxSizing:"border-box" }} />
                  }
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:8, marginTop:12 }}>
              <button style={btn("primary",{padding:"7px 16px",fontSize:13})} onClick={saveIng}>💾 Save</button>
              <button style={btn("secondary",{padding:"7px 16px",fontSize:13})} onClick={()=>setEditing(null)}>Cancel</button>
            </div>
          </div>
        )}

        <div style={{ padding:"12px 20px", borderBottom:"1px solid #f0f0f0", background:"#fafafa" }}>
          <input type="text" placeholder="🔍  Search…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ width:"100%", padding:"9px 12px", border:"1.5px solid #e8e8e8", borderRadius:10, fontSize:14, outline:"none", background:"#fff", boxSizing:"border-box" }} />
        </div>
        <div style={{ display:"flex", gap:6, padding:"10px 20px", borderBottom:"1px solid #f0f0f0", flexWrap:"wrap", background:"#fafafa" }}>
          {["All",...new Set(library.map(i=>i.category))].map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{ padding:"4px 12px", borderRadius:20, border:`1.5px solid ${c===cat?"#6F4E37":"#e8e8e8"}`, background:c===cat?"#6F4E37":"#fff", color:c===cat?"#fff":"#666", fontSize:12, fontWeight:500, cursor:"pointer" }}>{c}</button>
          ))}
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {filtered.length===0 && <div style={{ padding:"3rem", textAlign:"center", color:"#ccc", fontSize:14 }}>No ingredients</div>}
          {filtered.map(ing=>(
            <div key={ing.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 20px", borderBottom:"1px solid #f9f9f9" }}>
              <div style={{ width:40, height:40, borderRadius:10, background:"#f3f3f3", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0, overflow:"hidden" }}>
                {ing.photo ? <img src={ing.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : (CAT_EMOJI[ing.category]||"•")}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500, color:"#1a1a1a" }}>{ing.name}</div>
                <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{ing.category} · per {ing.unit} · <strong style={{ color:"#6F4E37" }}>฿{ing.costPerUnit}</strong></div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button style={btn("secondary",{padding:"5px 10px",fontSize:12})} onClick={()=>startEdit(ing)}>✏️ Edit</button>
                <button style={btn("danger",   {padding:"5px 10px",fontSize:12})} onClick={()=>deleteIng(ing.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────
export default function App() {
  const [recipes,  setRecipes]  = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [library,  setLibrary]  = useState(DEFAULT_LIBRARY);
  const [status,   setStatus_]  = useState({ type:"loading", msg:"Loading…" });
  const [showLibPicker,  setShowLibPicker]  = useState(false);
  const [showLibManager, setShowLibManager] = useState(false);
  const [pickerTarget,   setPickerTarget]   = useState(null); // { section, rowId|"new" }
  const [syncBanner,     setSyncBanner]     = useState(false);
  const lastTs        = useRef(null);
  const userEditing   = useRef(false);
  const editingTimer  = useRef(null);

  const setStatus = (type, msg) => setStatus_({ type, msg });
  const active = recipes.find(r => r.id===activeId) || null;

  // Drive load
  useEffect(() => {
    (async () => {
      try {
        const file = await findDriveFile();
        if (!file) { bootstrap(); return; }
        lastTs.current = file.modifiedTime || null;
        const raw = await callDrive("read_file_content", { file_id: file.id });
        const data = extractJSON(raw);
        if (data?.recipes?.length > 0) {
          setRecipes(data.recipes);
          if (data.library?.length > 0) setLibrary(data.library);
          setActiveId(data.recipes[0].id);
          setStatus("saved","Loaded from Drive ✓");
        } else { bootstrap(); }
      } catch(e) { console.error(e); bootstrap(); }
    })();
  }, []);

  function bootstrap() {
    const r = emptyRecipe();
    setRecipes([r]); setActiveId(r.id);
    setStatus("idle","Ready — save to Drive to persist");
  }

  // Auto-save debounce (save 3s after user stops editing)
  const autoSaveTimer = useRef(null);
  function markEdit() {
    userEditing.current = true;
    clearTimeout(editingTimer.current);
    editingTimer.current = setTimeout(() => { userEditing.current = false; }, 5000);
    // debounced auto-save
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { saveNow(); }, 3000);
  }

  // Polling for remote changes
  useEffect(() => {
    const poll = setInterval(async () => {
      if (userEditing.current) return;
      try {
        const raw = await callDrive("search_files", { query:`name = '${FILE_NAME}'`, page_size:1 });
        const parsed = extractJSON(raw);
        const files = parsed?.files || parsed?.items || [];
        if (!files[0]) return;
        const remoteTs = files[0].modifiedTime;
        if (!lastTs.current) { lastTs.current = remoteTs; return; }
        if (remoteTs === lastTs.current) return;
        // Changed remotely — pull update
        setSyncBanner(true);
        const content = await callDrive("read_file_content", { file_id: files[0].id });
        const data = extractJSON(content);
        if (data?.recipes?.length > 0) {
          setRecipes(data.recipes);
          if (data.library?.length > 0) setLibrary(data.library);
          setActiveId(prev => data.recipes.find(r=>r.id===prev) ? prev : data.recipes[0].id);
          lastTs.current = remoteTs;
          setStatus("saved","Synced ✓");
        }
        setSyncBanner(false);
      } catch(e) { console.warn("poll:", e); setSyncBanner(false); }
    }, 15000);
    return () => clearInterval(poll);
  }, []);

  // Save
  const saveNow = useCallback(async () => {
    setStatus("saving","Saving…");
    try {
      setRecipes(prev => {
        const payload = { recipes: prev, library, updatedAt: new Date().toISOString() };
        (async () => {
          const content = JSON.stringify(payload, null, 2);
          const file = await findDriveFile();
          if (file) await callDrive("create_file", { name:FILE_NAME, content, mime_type:"application/json", file_id:file.id });
          else       await callDrive("create_file", { name:FILE_NAME, content, mime_type:"application/json" });
          // Refresh timestamp
          const raw2 = await callDrive("search_files",{ query:`name='${FILE_NAME}'`,page_size:1 });
          const p2 = extractJSON(raw2); const f2=(p2?.files||[])[0];
          if (f2?.modifiedTime) lastTs.current = f2.modifiedTime;
          setStatus("saved","Saved ✓");
        })();
        return prev;
      });
    } catch(e) { console.error(e); setStatus("error","Save failed — check connection"); }
  }, [library]);

  // Recipe CRUD
  const updateRecipe = (updated) => {
    setRecipes(prev => prev.map(r => r.id===updated.id ? updated : r));
    markEdit();
  };
  const addRecipe = () => {
    const r = emptyRecipe();
    setRecipes(prev => [...prev, r]);
    setActiveId(r.id);
  };
  const deleteRecipe = id => {
    setRecipes(prev => {
      const next = prev.filter(r => r.id!==id);
      if (next.length===0) { const r=emptyRecipe(); setActiveId(r.id); return [r]; }
      if (activeId===id) setActiveId(next[0].id);
      return next;
    });
  };

  // Library Picker logic
  const openPicker = (section, rowId) => {
    setPickerTarget({ section, rowId });
    setShowLibPicker(true);
  };
  const handlePickerSelect = ing => {
    if (!active || !pickerTarget) return;
    const { section, rowId } = pickerTarget;
    const rows = active[section];
    let newRows;
    if (rowId==="new") {
      newRows = [...rows, { id:uid(), name:ing.name, qty:1, cost:ing.costPerUnit }];
    } else {
      newRows = rows.map(r => r.id===rowId ? { ...r, name:ing.name, cost:ing.costPerUnit, qty:1 } : r);
    }
    updateRecipe({ ...active, [section]: newRows });
  };

  if (!active) return <div style={{ padding:40, textAlign:"center", color:"#aaa" }}>Loading…</div>;
  const calc = calcRecipe(active);
  const barColor = calc.margin>80?"#E24B4A":calc.margin>60?"#EF9F27":"#1D9E75";

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} *{box-sizing:border-box} input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}`}</style>
      <SyncBanner visible={syncBanner} />

      <div style={S.app}>
        {/* Topbar */}
        <div style={S.topbar}>
          <h1 style={S.title}>☕ Recipe Calculator <StatusBadge type={status.type} msg={status.msg} /></h1>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <button style={btn("secondary")} onClick={()=>setShowLibManager(true)}>📚 Library</button>
            <button style={btn("secondary")} onClick={addRecipe}>+ New Recipe</button>
            <button style={btn("primary")}   onClick={saveNow}>💾 Save to Drive</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
          {recipes.map(r=>(
            <div key={r.id} style={{ display:"flex", borderRadius:10, overflow:"hidden", boxShadow:`0 0 0 ${r.id===activeId?"2px #6F4E37":"1.5px #e8e8e8"}` }}>
              <button onClick={()=>setActiveId(r.id)} style={{ padding:"8px 14px", border:"none", fontSize:13, fontWeight:r.id===activeId?600:400, background:r.id===activeId?"#6F4E37":"#fafafa", color:r.id===activeId?"#fff":"#666", cursor:"pointer" }}>{r.name||"Untitled"}</button>
              <button onClick={()=>deleteRecipe(r.id)} style={{ padding:"8px 10px", border:"none", fontSize:15, background:r.id===activeId?"#5a3d2b":"#f0f0f0", color:r.id===activeId?"rgba(255,255,255,0.7)":"#aaa", borderLeft:"1px solid rgba(0,0,0,0.08)", cursor:"pointer" }}>×</button>
            </div>
          ))}
        </div>

        {/* Editor card */}
        <div style={S.card}>
          {/* Name + price */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 180px", gap:14, marginBottom:20 }}>
            <div style={S.field}>
              <label style={S.fieldLabel}>Recipe Name</label>
              <input style={S.fieldInput} type="text" value={active.name} placeholder="e.g. Iced Americano"
                onChange={e=>updateRecipe({...active,name:e.target.value})}
                onFocus={e=>e.target.style.borderColor="#6F4E37"} onBlur={e=>e.target.style.borderColor="#eee"} />
            </div>
            <div style={S.field}>
              <label style={S.fieldLabel}>Sale Price (฿)</label>
              <input style={S.fieldInput} type="number" value={active.salePrice} min="0" step="0.01"
                onChange={e=>updateRecipe({...active,salePrice:e.target.value})}
                onFocus={e=>e.target.style.borderColor="#6F4E37"} onBlur={e=>e.target.style.borderColor="#eee"} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
            <div style={{ ...S.statCard, background:"#f8f8f8" }}>
              <div style={S.statLabel}>Total Cost</div>
              <div style={{ ...S.statValue, color:"#1a1a1a" }}>฿{calc.totalCost.toFixed(2)}</div>
              <div style={S.statSub}>all ingredients</div>
            </div>
            <div style={{ ...S.statCard, background:calc.profit>=0?"#f0faf5":"#fff5f5" }}>
              <div style={S.statLabel}>Net Profit</div>
              <div style={{ ...S.statValue, color:calc.profit>=0?"#1D9E75":"#E24B4A" }}>{calc.profit>=0?"+":""}฿{calc.profit.toFixed(2)}</div>
              <div style={S.statSub}>{calc.sale>0?`${(100-calc.margin).toFixed(1)}% of sale`:"—"}</div>
            </div>
            <div style={{ ...S.statCard, background:"#f8f8f8" }}>
              <div style={S.statLabel}>Cost Ratio</div>
              <div style={{ ...S.statValue, color:barColor }}>{calc.margin.toFixed(1)}%</div>
              <div style={S.statSub}>{calc.margin>80?"⚠️ High cost":calc.margin>60?"Watch margin":"✓ Healthy"}</div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ marginBottom:24 }}>
            <div style={{ height:8, borderRadius:4, background:"#efefef", overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(calc.margin,100).toFixed(1)}%`, borderRadius:4, background:barColor, transition:"width 0.4s,background 0.4s" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#ccc", marginTop:5 }}>
              <span>0%</span>
              <span style={{ color:barColor, fontWeight:600 }}>{calc.margin.toFixed(1)}% cost ratio</span>
              <span>100%</span>
            </div>
          </div>

          {/* Two columns */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:24, alignItems:"start" }}>
            <div>
              <Section title="Primary Ingredients"    dot="#6F4E37" rows={active.primary}   library={library}
                onChange={rows=>updateRecipe({...active,primary:rows})}
                onAdd={()=>updateRecipe({...active,primary:[...active.primary,emptyRow()]})}
                onOpenLibPicker={rowId=>openPicker("primary",rowId)} />
              <Section title="Secondary / Packaging"  dot="#1D9E75" rows={active.secondary} library={library}
                onChange={rows=>updateRecipe({...active,secondary:rows})}
                onAdd={()=>updateRecipe({...active,secondary:[...active.secondary,emptyRow()]})}
                onOpenLibPicker={rowId=>openPicker("secondary",rowId)} />
            </div>
            <div style={S.piePanel}>
              <div style={{ fontSize:11, fontWeight:700, color:"#ccc", letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:2 }}>Cost Breakdown</div>
              <div style={{ fontSize:11, color:"#ccc", marginBottom:14 }}>฿{calc.totalCost.toFixed(2)} cost · ฿{calc.sale.toFixed(2)} sale</div>
              <PieChart recipe={active} calc={calc} library={library} />
            </div>
          </div>
        </div>

        <div style={{ marginTop:16, textAlign:"center", fontSize:12, color:"#ccc" }}>
          Auto-saves to <code style={{ fontFamily:"monospace" }}>{FILE_NAME}</code> in your Google Drive · syncs every 15s
        </div>
      </div>

      {showLibPicker  && <LibraryPicker  library={library} onSelect={handlePickerSelect} onClose={()=>setShowLibPicker(false)} />}
      {showLibManager && <LibraryManager library={library} onChange={lib=>{setLibrary(lib);markEdit();}} onClose={()=>setShowLibManager(false)} />}
    </>
  );
}
