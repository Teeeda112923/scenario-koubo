import { useState, useEffect, useCallback, useRef, useContext, createContext } from "react";
import { supabase } from "./supabase";

// ─── テーマContext ────────────────────────────────────────
const ThemeCtx = createContext(true); // true = dark
const THEME_STORE = "scenario_koubo_theme";

// ペンカラー（ナイト / デイ）
const DRAW_COLORS_DARK = [
  { v: "#f5f5f4", label: "白" },
  { v: "#fbbf24", label: "黄" },
  { v: "#f87171", label: "赤" },
  { v: "#60a5fa", label: "青" },
  { v: "#4ade80", label: "緑" },
  { v: "#c084fc", label: "紫" },
];
const DRAW_COLORS_LIGHT = [
  { v: "#1a1a1a", label: "黒" },
  { v: "#d97706", label: "橙" },
  { v: "#dc2626", label: "赤" },
  { v: "#2563eb", label: "青" },
  { v: "#16a34a", label: "緑" },
  { v: "#9333ea", label: "紫" },
];
const CANVAS_BG_DARK  = "#111827";
const CANVAS_BG_LIGHT = "#f9fafb";

// ─── ユーティリティ ───────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 9);
const STORAGE_KEY = "scenario_koubo_v1";
const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || { projects: [] }; }
  catch { return { projects: [] }; }
};
const save = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

// ─── 初期データファクトリ ─────────────────────────────────
const createProject = (title = "新しい作品") => ({
  id: genId(), title, genre: "", status: "企画中",
  createdAt: new Date().toISOString(),
  overview: { theme: "", antiTheme: "", remarks: "" },
  tenchiJin: { ten: "", chi: "", jin: "" },
  characters: [],
  structure: { mode: "起承転結", ki: "", sho: "", ten_: "", ketsu: "", act1: "", act2a: "", midpoint: "", act2b: "", act3: "" },
  hakogaki: {
    useEpisode: false,
    useEmotionCurve: false,
    acts: [
      { id: genId(), name: "第一幕", episodes: [], scenes: [] },
      { id: genId(), name: "第二幕", episodes: [], scenes: [] },
      { id: genId(), name: "第三幕", episodes: [], scenes: [] },
    ]
  },
  notes: [],
  sketches: [],
});
const createCharacter = () => ({
  id: genId(), name: "", age: "", role: "主要",
  appearance: "", personality: "", motivation: "", secret: "", relation: "", arcStart: "", arcEnd: "",
  drawingDataUrl: null,
  // 各フィールドの手書きデータ
  name_d: null, age_d: null, appearance_d: null, personality_d: null,
  motivation_d: null, secret_d: null, relation_d: null, arcStart_d: null, arcEnd_d: null,
});
const createScene    = () => ({ id: genId(), location: "", time: "昼", characters: "", content: "", purpose: "", type: "daily", emotion: 0, drawingDataUrl: null });
const createSketch   = (title = "") => ({ id: genId(), title, drawingDataUrl: null, createdAt: new Date().toISOString() });
const createEpisode = (n = 1) => ({ id: genId(), name: `エピソード${n}`, scenes: [] });

// ─── スタイル定数 ─────────────────────────────────────────
const cx = {
  page:    "min-h-screen bg-gray-950 text-gray-100",
  card:    "bg-gray-900 border border-gray-800 rounded-lg p-4",
  btn:     "px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer",
  pri:     "bg-amber-600 hover:bg-amber-500 text-black",
  ghost:   "border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white bg-transparent",
  danger:  "text-red-400 hover:text-red-300 hover:bg-red-900/20 bg-transparent border-0",
  input:   "w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-600",
  ta:      "w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-amber-600 resize-none",
  lbl:     "block text-xs text-gray-400 mb-1 uppercase tracking-wider",
  tab:     "px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer",
  tabOn:   "border-amber-500 text-amber-400",
  tabOff:  "border-transparent text-gray-500 hover:text-gray-300",
  badge:   "px-2 py-0.5 rounded-full text-xs",
};

const STATUS_COLOR = {
  "企画中": "bg-blue-900/50 text-blue-300",
  "執筆中": "bg-amber-900/50 text-amber-300",
  "完成":   "bg-green-900/50 text-green-300",
};

const SCENE_TYPE = {
  daily:      { label: "日常",           dot: "bg-gray-500" },
  conflict:   { label: "対立",           dot: "bg-red-500" },
  turning:    { label: "転換",           dot: "bg-purple-500" },
  climax:     { label: "クライマックス", dot: "bg-orange-500" },
  resolution: { label: "解決",           dot: "bg-green-500" },
};

// ═══════════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════════
function HomeScreen({ data, setData, onOpen, syncState, syncMsg, isOnline, onManualFetch, user, onSignOut, isDark, onToggleTheme }) {
  const [newTitle, setNewTitle] = useState("");
  const fileRef = useRef();

  const addProject = () => {
    const p = createProject(newTitle.trim() || "新しい作品");
    setData(d => ({ ...d, projects: [...d.projects, p] }));
    setNewTitle("");
    onOpen(p.id);
  };

  const delProject = (id) => {
    if (!confirm("この作品を削除しますか？")) return;
    setData(d => ({ ...d, projects: d.projects.filter(p => p.id !== id) }));
  };

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "scenario_koubo_backup.json" });
    a.click();
  };

  const importData = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imp = JSON.parse(ev.target.result);
        if (imp.projects) setData(imp);
        else alert("形式が正しくありません");
      } catch { alert("読み込みに失敗しました"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className={cx.page}>
      {/* ヘッダー */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-amber-400 tracking-widest">🎬 シナハコ</h1>
          <p className="text-xs text-gray-500 mt-0.5">映画・ドラマ脚本制作ツール</p>
        </div>
        <div className="flex gap-2 items-center">
          <button title={isDark ? "デイモードに切り替え" : "ナイトモードに切り替え"}
            className={`${cx.btn} ${cx.ghost} text-base px-2 py-1`}
            onClick={onToggleTheme}>{isDark ? "☀" : "🌙"}</button>
          <SyncBadge syncState={syncState} syncMsg={syncMsg} isOnline={isOnline}
            onManualFetch={onManualFetch} user={user} onSignOut={onSignOut} />
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={importData} />
          <button className={`${cx.btn} ${cx.ghost}`} onClick={() => fileRef.current.click()}>📥 インポート</button>
          <button className={`${cx.btn} ${cx.ghost}`} onClick={exportAll}>📤 エクスポート</button>
        </div>
      </div>

      <div className="p-6 max-w-2xl mx-auto">
        {/* 新規作成 */}
        <div className="flex gap-2 mb-6">
          <input className={`${cx.input} flex-1`} placeholder="作品タイトルを入力..."
            value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addProject()} />
          <button className={`${cx.btn} ${cx.pri} whitespace-nowrap`} onClick={addProject}>＋ 新規作成</button>
        </div>

        {/* 一覧 */}
        {data.projects.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            <div className="text-5xl mb-4">🎞</div>
            <p className="text-sm">作品がありません。新しいプロジェクトを作成してください。</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.projects.map(p => (
              <div key={p.id} className={`${cx.card} flex items-center gap-3 cursor-pointer hover:border-gray-600 transition-colors`}
                onClick={() => onOpen(p.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white truncate">{p.title || "無題"}</span>
                    <span className={`${cx.badge} ${STATUS_COLOR[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex gap-3 flex-wrap">
                    {p.genre && <span>🎭 {p.genre}</span>}
                    <span>👥 登場人物 {p.characters.length}人</span>
                    <span>📦 幕 {p.hakogaki.acts.length}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>
                <button className={`${cx.btn} ${cx.danger} flex-shrink-0 text-xs`}
                  onClick={e => { e.stopPropagation(); delProject(p.id); }}>削除</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フッター */}
      <footer className="mt-auto border-t border-gray-800 py-4 text-center">
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} シナハコ
        </p>
      </footer>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROJECT (タブ親)
// ═══════════════════════════════════════════════════════════
const TABS = (useEmotionCurve) => [
  { id: "overview",     label: "📋 概要" },
  { id: "tenchiJin",    label: "☰ 天地人" },
  { id: "characters",   label: "👥 登場人物" },
  { id: "structure",    label: "📐 起承転結" },
  { id: "hakogaki",     label: "📦 箱書き" },
  ...(useEmotionCurve ? [{ id: "emotionCurve", label: "〰 感情曲線" }] : []),
  { id: "notes",        label: "📝 設定メモ" },
  { id: "sketches",     label: "✏ スケッチ" },
];

function ProjectScreen({ project, updateProject, activeTab, setActiveTab, onBack, syncState, syncMsg, isOnline, onManualFetch, user, onSignOut, isDark, onToggleTheme }) {
  return (
    <div className={cx.page}>
      {/* ヘッダー */}
      <div className="border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button className={`${cx.btn} ${cx.ghost} text-xs`} onClick={onBack}>← 一覧</button>
        <input className="bg-transparent font-bold text-white text-lg focus:outline-none flex-1 min-w-0"
          value={project.title} onChange={e => updateProject(p => ({ ...p, title: e.target.value }))}
          placeholder="作品タイトル" />
        <input className="bg-transparent text-sm text-gray-400 focus:outline-none w-28 hidden sm:block"
          value={project.genre} onChange={e => updateProject(p => ({ ...p, genre: e.target.value }))}
          placeholder="ジャンル" />
        <select className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          value={project.status} onChange={e => updateProject(p => ({ ...p, status: e.target.value }))}>
          {Object.keys(STATUS_COLOR).map(s => <option key={s}>{s}</option>)}
        </select>
        <button title={isDark ? "デイモードに切り替え" : "ナイトモードに切り替え"}
          className={`${cx.btn} ${cx.ghost} text-base px-2 py-1`}
          onClick={onToggleTheme}>{isDark ? "☀" : "🌙"}</button>
        <SyncBadge syncState={syncState} syncMsg={syncMsg} isOnline={isOnline}
          onManualFetch={onManualFetch} user={user} onSignOut={onSignOut} />
      </div>
      {/* タブ */}
      <div className="border-b border-gray-800 px-3 flex overflow-x-auto">
        {TABS(project.hakogaki.useEmotionCurve).map(t => (
          <button key={t.id} className={`${cx.tab} ${activeTab === t.id ? cx.tabOn : cx.tabOff}`}
            onClick={() => setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {/* コンテンツ */}
      <div className="p-4 overflow-y-auto" style={{ height: "calc(100vh - 108px)" }}>
        {activeTab === "overview"     && <Overview     project={project} updateProject={updateProject} />}
        {activeTab === "tenchiJin"    && <TenchiJin    project={project} updateProject={updateProject} />}
        {activeTab === "characters"   && <Characters   project={project} updateProject={updateProject} />}
        {activeTab === "structure"    && <Structure    project={project} updateProject={updateProject} />}
        {activeTab === "hakogaki"     && <Hakogaki     project={project} updateProject={updateProject} />}
        {activeTab === "emotionCurve" && <EmotionCurve project={project} updateProject={updateProject} />}
        {activeTab === "notes"        && <Notes        project={project} updateProject={updateProject} />}
        {activeTab === "sketches"      && <Sketches     project={project} updateProject={updateProject} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 概要（テーマ・アンチテーマ・備考）
// ═══════════════════════════════════════════════════════════
function Overview({ project, updateProject }) {
  const ov = project.overview || {};
  const set = (k, v) => updateProject(p => ({ ...p, overview: { ...(p.overview || {}), [k]: v } }));

  const items = [
    { key: "theme",     icon: "💡", label: "テーマ",       hint: "この作品が伝えたい核心的なメッセージ・問い・価値観",              placeholder: "例: 愛することは失うことへの恐怖を乗り越えることだ", rows: 4 },
    { key: "antiTheme", icon: "⚡", label: "アンチテーマ", hint: "主人公が最初に信じている誤った考え方・テーマと対立する価値観",    placeholder: "例: 傷つくくらいなら最初から愛さない方がいい",       rows: 4 },
    { key: "remarks",   icon: "📌", label: "備考",         hint: "参考作品・企画メモ・制作上の注意点など自由に",                    placeholder: "自由に書いてください",                               rows: 6 },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {items.map(({ key, icon, label, hint, placeholder, rows }) => (
        <DrawSection key={key}
          icon={icon} label={label} hint={hint} placeholder={placeholder} rows={rows}
          textValue={ov[key] || ""}
          onTextChange={v => set(key, v)}
          drawDataUrl={ov[key + "_drawing"] || null}
          onDrawSave={dataUrl => set(key + "_drawing", dataUrl)}
          onDrawClear={() => set(key + "_drawing", null)}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 天地人
// ═══════════════════════════════════════════════════════════
function TenchiJin({ project, updateProject }) {
  const set = (k, v) => updateProject(p => ({ ...p, tenchiJin: { ...p.tenchiJin, [k]: v } }));
  const t = project.tenchiJin;
  const items = [
    { key: "ten",  icon: "☰", label: "天（いつ）",    hint: "いつの時代の話か・時代背景・時間軸",     rows: 5 },
    { key: "chi",  icon: "⬡", label: "地（どこ）",   hint: "どこが舞台か・場所・空間・環境",          rows: 5 },
    { key: "jin",  icon: "◉", label: "人（誰）",     hint: "誰の話か・主人公・登場人物・関係性",      rows: 5 },
  ];
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {items.map(({ key, icon, label, hint, rows }) => (
        <DrawSection key={key}
          icon={icon} label={label} hint={hint} rows={rows}
          textValue={t[key] || ""}
          onTextChange={v => set(key, v)}
          drawDataUrl={t[key + "_drawing"] || null}
          onDrawSave={dataUrl => set(key + "_drawing", dataUrl)}
          onDrawClear={() => set(key + "_drawing", null)}
        />
      ))}
    </div>
  );
}
// ═══════════════════════════════════════════════════════════
// インク領域のみを切り出すヘルパー（保存時に呼ぶ）
// ═══════════════════════════════════════════════════════════
function cropToInk(dataUrl, bgHex) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const W = img.naturalWidth || img.width;
      const H = img.naturalHeight || img.height;
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      let imageData;
      try { imageData = ctx.getImageData(0, 0, W, H); }
      catch { resolve(dataUrl); return; }
      const { data } = imageData;
      const bgR = parseInt(bgHex.slice(1,3),16);
      const bgG = parseInt(bgHex.slice(3,5),16);
      const bgB = parseInt(bgHex.slice(5,7),16);
      let x0=W, x1=-1, y0=H, y1=-1;
      for (let y=0; y<H; y++) {
        for (let x=0; x<W; x++) {
          const i=(y*W+x)*4;
          if (Math.abs(data[i]-bgR)+Math.abs(data[i+1]-bgG)+Math.abs(data[i+2]-bgB) > 50) {
            if (x<x0) x0=x; if (x>x1) x1=x;
            if (y<y0) y0=y; if (y>y1) y1=y;
          }
        }
      }
      if (x1<0) { resolve(dataUrl); return; }
      const pad = Math.max(12, Math.floor(Math.min(W,H)*0.03));
      const cx0=Math.max(0,x0-pad), cy0=Math.max(0,y0-pad);
      const cx1=Math.min(W-1,x1+pad), cy1=Math.min(H-1,y1+pad);
      const cW=cx1-cx0+1, cH=cy1-cy0+1;
      const out=document.createElement("canvas");
      out.width=cW; out.height=cH;
      const octx=out.getContext("2d");
      octx.fillStyle=bgHex;
      octx.fillRect(0,0,cW,cH);
      octx.drawImage(canvas, cx0, cy0, cW, cH, 0, 0, cW, cH);
      resolve(out.toDataURL("image/jpeg",0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function CroppedNameImage({ src, alt, className }) {
  const isDark  = useContext(ThemeCtx);
  const bgHex   = isDark ? CANVAS_BG_DARK : CANVAS_BG_LIGHT;
  const [displaySrc, setDisplaySrc] = useState(null);

  useEffect(() => {
    if (!src) { setDisplaySrc(null); return; }
    cropToInk(src, bgHex).then(setDisplaySrc);
  }, [src, bgHex]);

  if (!displaySrc) return <div className={className} />;
  return <img src={displaySrc} alt={alt} className={className} />;
}

// ═══════════════════════════════════════════════════════════
// 登場人物
// ═══════════════════════════════════════════════════════════
function Characters({ project, updateProject }) {
  const isDark = useContext(ThemeCtx);
  const bgHex  = isDark ? CANVAS_BG_DARK : CANVAS_BG_LIGHT;
  const [editId,    setEditId]    = useState(null);
  const [charDrawId, setCharDrawId] = useState(null);

  const add = () => {
    const c = createCharacter();
    updateProject(p => ({ ...p, characters: [...p.characters, c] }));
    setEditId(c.id);
  };
  const del = (id) => {
    if (!confirm("削除しますか？")) return;
    updateProject(p => ({ ...p, characters: p.characters.filter(c => c.id !== id) }));
    if (editId === id) setEditId(null);
  };
  const setC = (id, k, v) => updateProject(p => ({
    ...p, characters: p.characters.map(c => c.id === id ? { ...c, [k]: v } : c)
  }));

  const editing = project.characters.find(c => c.id === editId);
  const ROLES = ["主要", "サブ", "敵対", "メンター", "脇役"];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-400">{project.characters.length}人</span>
        <button className={`${cx.btn} ${cx.pri}`} onClick={add}>＋ 追加</button>
      </div>

      {/* カード一覧 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {project.characters.map(c => (
          <div key={c.id}
            className={`${cx.card} cursor-pointer transition-colors ${editId === c.id ? "border-amber-600" : "hover:border-gray-600"}`}
            onClick={() => setEditId(editId === c.id ? null : c.id)}>
            <div className="flex justify-between items-start mb-1">
              <div className="flex-1 min-w-0">
                {c.name_d ? (
                  <CroppedNameImage src={c.name_d} alt="名前（手書き）" className="w-full h-auto mb-0.5" />
                ) : (
                  <div className="font-semibold text-white text-sm">{c.name || "名前未設定"}</div>
                )}
                <div className="text-xs text-gray-500">{c.age && `${c.age}歳 `}{c.role}</div>
              </div>
              <button className={`${cx.btn} ${cx.danger} text-xs px-1 py-0`}
                onClick={e => { e.stopPropagation(); del(c.id); }}>✕</button>
            </div>
            {c.motivation && <p className="text-xs text-gray-400 line-clamp-2 mt-1">{c.motivation}</p>}
            {(c.arcStart || c.arcEnd) && (
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                <span>{c.arcStart || "―"}</span>
                <span className="text-amber-800">→</span>
                <span>{c.arcEnd || "―"}</span>
              </div>
            )}
            {c.drawingDataUrl && (
              <div className="mt-2 rounded overflow-hidden border border-gray-700">
                <img src={c.drawingDataUrl} alt="スケッチ" className="w-full object-contain max-h-20 bg-gray-900" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 編集パネル */}
      {editing && (
        <div className={cx.card}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-amber-400 text-sm">キャラクター編集</span>
            <button className="text-gray-500 hover:text-white text-xs" onClick={() => setEditId(null)}>✕ 閉じる</button>
          </div>
          <div className="space-y-3">
            {/* 役割（セレクトのみ） */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={cx.lbl}>役割</label>
                <select className={cx.input} value={editing.role} onChange={e => setC(editing.id, "role", e.target.value)}>
                  {ROLES.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* DrawSectionフィールド */}
            {[
              { k: "name",        dk: "name_d",        lbl: "名前",                    rows: 2 },
              { k: "age",         dk: "age_d",         lbl: "年齢",                    rows: 2 },
              { k: "appearance",  dk: "appearance_d",  lbl: "外見・印象",              rows: 3 },
              { k: "personality", dk: "personality_d", lbl: "性格",                    rows: 3 },
              { k: "motivation",  dk: "motivation_d",  lbl: "動機（何が欲しいか）",    rows: 3 },
              { k: "secret",      dk: "secret_d",      lbl: "秘密・隠された面",        rows: 3 },
              { k: "relation",    dk: "relation_d",    lbl: "主人公との関係",           rows: 2 },
              { k: "arcStart",    dk: "arcStart_d",    lbl: "物語開始の状態（弧 起）", rows: 2 },
              { k: "arcEnd",      dk: "arcEnd_d",      lbl: "物語終了の状態（弧 結）", rows: 2 },
            ].map(({ k, dk, lbl, rows }) => (
              <DrawSection key={k}
                label={lbl} rows={rows}
                textValue={editing[k] || ""}
                onTextChange={v => setC(editing.id, k, v)}
                drawDataUrl={editing[dk] || null}
                onDrawSave={dk === "name_d"
                  ? dataUrl => cropToInk(dataUrl, bgHex).then(cropped => setC(editing.id, dk, cropped))
                  : dataUrl => setC(editing.id, dk, dataUrl)}
                onDrawClear={() => setC(editing.id, dk, null)}
              />
            ))}

            {/* ラフスケッチ */}
            <DrawSection
              label="ラフスケッチ" rows={5}
              hint="外見・服装・イメージボードなど自由に"
              textValue=""
              onTextChange={() => {}}
              drawDataUrl={editing.drawingDataUrl}
              onDrawSave={dataUrl => setC(editing.id, "drawingDataUrl", dataUrl)}
              onDrawClear={() => setC(editing.id, "drawingDataUrl", null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 起承転結 / 三幕構成
// ═══════════════════════════════════════════════════════════
function Structure({ project, updateProject }) {
  const st = project.structure;
  const set = (k, v) => updateProject(p => ({ ...p, structure: { ...p.structure, [k]: v } }));

  const KSKT = [
    { k: "ki",    label: "起", hint: "状況設定・主人公の日常・世界の提示" },
    { k: "sho",   label: "承", hint: "展開・問題の深化・目標の明確化" },
    { k: "ten_",  label: "転", hint: "急転直下・予期せぬ変化・最大の危機" },
    { k: "ketsu", label: "結", hint: "解決・主人公の変化・新たな日常" },
  ];
  const ACT3 = [
    { k: "act1",     label: "第一幕 — セットアップ",   hint: "日常・目標の設定・triggering event" },
    { k: "act2a",    label: "第二幕前半",               hint: "新世界への適応・障害と試練" },
    { k: "midpoint", label: "ミッドポイント",           hint: "虚偽の勝利 or 致命的な敗北" },
    { k: "act2b",    label: "第二幕後半",               hint: "全てが崩壊・最暗部（all is lost）" },
    { k: "act3",     label: "第三幕 — 解決",            hint: "クライマックス・変容・新たな日常" },
  ];
  const items = st.mode === "起承転結" ? KSKT : ACT3;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex gap-2 mb-4">
        {["起承転結", "三幕構成"].map(m => (
          <button key={m} className={`${cx.btn} ${st.mode === m ? cx.pri : cx.ghost}`}
            onClick={() => set("mode", m)}>{m}</button>
        ))}
      </div>
      <div className="space-y-3">
        {items.map(({ k, label, hint }) => (
          <DrawSection key={k}
            label={label} hint={hint} rows={4}
            textValue={st[k] || ""}
            onTextChange={v => set(k, v)}
            drawDataUrl={st[k + "_drawing"] || null}
            onDrawSave={dataUrl => set(k + "_drawing", dataUrl)}
            onDrawClear={() => set(k + "_drawing", null)}
          />
        ))}
      </div>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════
// 箱書き（幕 → [エピソード] → シーン）
// ═══════════════════════════════════════════════════════════
function Hakogaki({ project, updateProject }) {
  const hk = project.hakogaki;
  const [openActs, setOpenActs] = useState(() => Object.fromEntries(hk.acts.map(a => [a.id, true])));
  const [openEps,  setOpenEps]  = useState({});
  const [editing,  setEditing]  = useState(null); // { actId, epId|null, sceneId }
  const [sceneDrawing, setSceneDrawing] = useState(null); // { actId, epId, sceneId }
  const [actDrawing,   setActDrawing]   = useState(null); // actId
  const [epDrawing,    setEpDrawing]    = useState(null); // { actId, epId }

  const setHk = (val) => updateProject(p => ({ ...p, hakogaki: val }));
  const updAct = (actId, fn) => setHk({ ...hk, acts: hk.acts.map(a => a.id === actId ? fn(a) : a) });

  // 幕
  const addAct = () => {
    const a = { id: genId(), name: `第${hk.acts.length + 1}幕`, episodes: [], scenes: [] };
    setHk({ ...hk, acts: [...hk.acts, a] });
    setOpenActs(o => ({ ...o, [a.id]: true }));
  };
  const delAct = (id) => {
    if (!confirm("この幕を削除しますか？")) return;
    setHk({ ...hk, acts: hk.acts.filter(a => a.id !== id) });
  };

  // エピソード
  const addEp = (actId) => {
    const act = hk.acts.find(a => a.id === actId);
    const ep = createEpisode(act.episodes.length + 1);
    updAct(actId, a => ({ ...a, episodes: [...a.episodes, ep] }));
    setOpenEps(o => ({ ...o, [ep.id]: true }));
  };
  const delEp = (actId, epId) => {
    if (!confirm("このエピソードを削除しますか？")) return;
    updAct(actId, a => ({ ...a, episodes: a.episodes.filter(e => e.id !== epId) }));
  };
  const renameEp = (actId, epId, name) => updAct(actId, a => ({
    ...a, episodes: a.episodes.map(e => e.id === epId ? { ...e, name } : e)
  }));

  // シーン
  const addScene = (actId, epId) => {
    const sc = createScene();
    if (epId) updAct(actId, a => ({ ...a, episodes: a.episodes.map(e => e.id === epId ? { ...e, scenes: [...e.scenes, sc] } : e) }));
    else       updAct(actId, a => ({ ...a, scenes: [...a.scenes, sc] }));
    setEditing({ actId, epId, sceneId: sc.id });
  };
  const delScene = (actId, epId, sceneId) => {
    if (!confirm("このシーンを削除しますか？")) return;
    const rm = (arr) => arr.filter(s => s.id !== sceneId);
    if (epId) updAct(actId, a => ({ ...a, episodes: a.episodes.map(e => e.id === epId ? { ...e, scenes: rm(e.scenes) } : e) }));
    else       updAct(actId, a => ({ ...a, scenes: rm(a.scenes) }));
    if (editing?.sceneId === sceneId) setEditing(null);
  };
  const setSceneField = (actId, epId, sceneId, k, v) => {
    const upd = (arr) => arr.map(s => s.id === sceneId ? { ...s, [k]: v } : s);
    if (epId) updAct(actId, a => ({ ...a, episodes: a.episodes.map(e => e.id === epId ? { ...e, scenes: upd(e.scenes) } : e) }));
    else       updAct(actId, a => ({ ...a, scenes: upd(a.scenes) }));
  };

  // 編集中のシーンオブジェクト取得
  const getEditSc = () => {
    if (!editing) return null;
    const act = hk.acts.find(a => a.id === editing.actId);
    if (!act) return null;
    const pool = editing.epId ? (act.episodes.find(e => e.id === editing.epId)?.scenes || []) : act.scenes;
    return pool.find(s => s.id === editing.sceneId) || null;
  };
  const editSc = getEditSc();

  return (
    <div className="w-full">
      {/* オプション行 */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={hk.useEpisode} onChange={() => setHk({ ...hk, useEpisode: !hk.useEpisode })}
              className="accent-amber-500 w-4 h-4" />
            エピソード層（幕→EP→シーン）
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none">
            <input type="checkbox" checked={!!hk.useEmotionCurve} onChange={() => setHk({ ...hk, useEmotionCurve: !hk.useEmotionCurve })}
              className="accent-amber-500 w-4 h-4" />
            感情曲線
          </label>
        </div>
        <button className={`${cx.btn} ${cx.ghost} text-xs`} onClick={addAct}>＋ 幕を追加</button>
      </div>

      {/* 手書きモーダル — 幕 */}
      {actDrawing && (() => {
        const act = hk.acts.find(a => a.id === actDrawing);
        return (
          <DrawingModal
            initialDataUrl={act?.drawingDataUrl || null}
            onSave={dataUrl => updAct(actDrawing, a => ({ ...a, drawingDataUrl: dataUrl }))}
            onClose={() => setActDrawing(null)}
          />
        );
      })()}
      {/* 手書きモーダル — エピソード */}
      {epDrawing && (() => {
        const act = hk.acts.find(a => a.id === epDrawing.actId);
        const ep  = act?.episodes.find(e => e.id === epDrawing.epId);
        return (
          <DrawingModal
            initialDataUrl={ep?.drawingDataUrl || null}
            onSave={dataUrl => updAct(epDrawing.actId, a => ({
              ...a, episodes: a.episodes.map(e => e.id === epDrawing.epId ? { ...e, drawingDataUrl: dataUrl } : e)
            }))}
            onClose={() => setEpDrawing(null)}
          />
        );
      })()}
      {/* 左右分割レイアウト */}
      <div className="flex gap-3" style={{ minHeight: "60vh" }}>
        {/* 左：幕リスト */}
        <div className="w-2/5 flex-shrink-0 space-y-2 overflow-y-auto">
        {hk.acts.map(act => (
          <div key={act.id} className="border border-gray-800 rounded-lg overflow-hidden">
            {/* 幕ヘッダー */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/60">
              <button className="text-gray-400 text-xs w-4" onClick={() => setOpenActs(o => ({ ...o, [act.id]: !o[act.id] }))}>
                {openActs[act.id] !== false ? "▼" : "▶"}
              </button>
              <input className="bg-transparent font-semibold text-amber-400 flex-1 focus:outline-none text-sm"
                value={act.name} onChange={e => updAct(act.id, a => ({ ...a, name: e.target.value }))} />
              <div className="flex gap-1">
                {hk.useEpisode && (
                  <button className={`${cx.btn} ${cx.ghost} text-xs py-0.5 px-2`} onClick={() => addEp(act.id)}>＋ EP</button>
                )}
                <button className={`${cx.btn} ${cx.ghost} text-xs py-0.5 px-2`} onClick={() => addScene(act.id, null)}>＋ シーン</button>
                <button title="手書きメモ" className={`${cx.btn} ${act.drawingDataUrl ? "text-amber-400 border-amber-800" : cx.ghost} text-xs py-0.5 px-2`}
                  onClick={() => setActDrawing(act.id)}>✏</button>
                <button className={`${cx.btn} ${cx.danger} text-xs px-1 py-0.5`} onClick={() => delAct(act.id)}>✕</button>
              </div>
            </div>

            {openActs[act.id] !== false && (
              <div className="p-2 space-y-2">
                {/* エピソード */}
                {hk.useEpisode && act.episodes.map(ep => (
                  <div key={ep.id} className="border border-gray-700 rounded">
                    <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/30">
                      <button className="text-gray-500 text-xs w-4" onClick={() => setOpenEps(o => ({ ...o, [ep.id]: !o[ep.id] }))}>
                        {openEps[ep.id] !== false ? "▼" : "▶"}
                      </button>
                      <input className="bg-transparent text-sm text-purple-300 flex-1 focus:outline-none"
                        value={ep.name} onChange={e => renameEp(act.id, ep.id, e.target.value)} />
                      <button className={`${cx.btn} ${cx.ghost} text-xs py-0 px-2`} onClick={() => addScene(act.id, ep.id)}>＋ シーン</button>
                      <button title="手書きメモ" className={`${cx.btn} ${ep.drawingDataUrl ? "text-amber-400 border-amber-800" : cx.ghost} text-xs py-0 px-2`}
                        onClick={() => setEpDrawing({ actId: act.id, epId: ep.id })}>✏</button>
                      <button className={`${cx.btn} ${cx.danger} text-xs px-1 py-0`} onClick={() => delEp(act.id, ep.id)}>✕</button>
                    </div>
                    {openEps[ep.id] !== false && (
                      <div className="p-1.5 space-y-1">
                        {ep.scenes.length === 0 && <p className="text-xs text-gray-600 text-center py-2">シーンがありません</p>}
                        {ep.scenes.map(sc => (
                          <SceneRow key={sc.id} sc={sc} active={editing?.sceneId === sc.id}
                            onClick={() => setEditing({ actId: act.id, epId: ep.id, sceneId: sc.id })}
                            onDel={() => delScene(act.id, ep.id, sc.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* 直接シーン（エピソード層なし or 幕直下） */}
                {act.scenes.length === 0 && !hk.useEpisode && (
                  <p className="text-xs text-gray-600 text-center py-2">シーンがありません</p>
                )}
                {act.scenes.map(sc => (
                  <SceneRow key={sc.id} sc={sc} active={editing?.sceneId === sc.id}
                    onClick={() => setEditing({ actId: act.id, epId: null, sceneId: sc.id })}
                    onDel={() => delScene(act.id, null, sc.id)} />
                ))}
              </div>
            )}
          </div>
        ))}
        </div>{/* 左パネル終わり */}

        {/* 右：シーン編集パネル */}
        <div className="flex-1 overflow-y-auto">
          {editSc && editing ? (
            <div className={cx.card}>
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-amber-400 text-sm">シーン編集</span>
                <button className="text-gray-500 hover:text-white text-xs" onClick={() => setEditing(null)}>✕ 閉じる</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cx.lbl}>場所</label>
              <input className={cx.input} value={editSc.location} placeholder="例: 主人公の部屋"
                onChange={e => setSceneField(editing.actId, editing.epId, editSc.id, "location", e.target.value)} />
            </div>
            <div>
              <label className={cx.lbl}>時間帯</label>
              <select className={cx.input} value={editSc.time}
                onChange={e => setSceneField(editing.actId, editing.epId, editSc.id, "time", e.target.value)}>
                {["朝", "昼", "夕方", "夜", "深夜", "未明", "不明"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={cx.lbl}>シーン種別</label>
              <select className={cx.input} value={editSc.type}
                onChange={e => setSceneField(editing.actId, editing.epId, editSc.id, "type", e.target.value)}>
                {Object.entries(SCENE_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={cx.lbl}>登場人物</label>
              <input className={cx.input} value={editSc.characters} placeholder="例: 主人公、田中"
                onChange={e => setSceneField(editing.actId, editing.epId, editSc.id, "characters", e.target.value)} />
            </div>
            <div className="col-span-2">
              <DrawSection
                label="内容（このシーンで起きること）" rows={3}
                textValue={editSc.content}
                onTextChange={v => setSceneField(editing.actId, editing.epId, editSc.id, "content", v)}
                drawDataUrl={editSc.drawingDataUrl}
                onDrawSave={dataUrl => setSceneField(editing.actId, editing.epId, editSc.id, "drawingDataUrl", dataUrl)}
                onDrawClear={() => setSceneField(editing.actId, editing.epId, editSc.id, "drawingDataUrl", null)}
              />
            </div>
            <div className="col-span-2">
              <label className={cx.lbl}>目的（物語上このシーンが必要な理由）</label>
              <textarea className={cx.ta} rows={2} value={editSc.purpose}
                onChange={e => setSceneField(editing.actId, editing.epId, editSc.id, "purpose", e.target.value)} />
            </div>
            {hk.useEmotionCurve && (
              <div className="col-span-2">
                <label className={cx.lbl}>感情値（主人公の感情状態: -5 〜 +5）</label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12 text-right">絶望 −5</span>
                  <input type="range" min={-5} max={5} step={1}
                    className="flex-1 accent-amber-500"
                    value={editSc.emotion ?? 0}
                    onChange={e => setSceneField(editing.actId, editing.epId, editSc.id, "emotion", Number(e.target.value))} />
                  <span className="text-xs text-gray-500 w-12">+5 高揚</span>
                  <span className={`text-sm font-bold w-6 text-center ${(editSc.emotion ?? 0) > 0 ? "text-amber-400" : (editSc.emotion ?? 0) < 0 ? "text-blue-400" : "text-gray-400"}`}>
                    {(editSc.emotion ?? 0) > 0 ? `+${editSc.emotion}` : editSc.emotion}
                  </span>
                </div>
              </div>
            )}

              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-600 border border-dashed border-gray-800 rounded-lg">
              <div className="text-4xl mb-3">👆</div>
              <p className="text-sm">左のシーンをタップして編集</p>
            </div>
          )}
        </div>{/* 右パネル終わり */}
      </div>{/* 左右分割終わり */}
      {sceneDrawing && (() => {
        const act = hk.acts.find(a => a.id === sceneDrawing.actId);
        const pool = sceneDrawing.epId
          ? (act?.episodes.find(e => e.id === sceneDrawing.epId)?.scenes || [])
          : (act?.scenes || []);
        const sc = pool.find(s => s.id === sceneDrawing.sceneId);
        return (
          <DrawingModal
            initialDataUrl={sc?.drawingDataUrl}
            onSave={dataUrl => setSceneField(sceneDrawing.actId, sceneDrawing.epId, sceneDrawing.sceneId, "drawingDataUrl", dataUrl)}
            onClose={() => setSceneDrawing(null)}
          />
        );
      })()}
    </div>
  );
}

function SceneRow({ sc, active, onClick, onDel }) {
  const t = SCENE_TYPE[sc.type] || SCENE_TYPE.daily;
  return (
    <div className={`flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors border ${active ? "bg-gray-700 border-amber-700" : "bg-gray-800/40 hover:bg-gray-800 border-transparent"}`}
      onClick={onClick}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.dot}`} title={t.label}></span>
      <span className="text-xs text-amber-400/70 flex-shrink-0 w-14 truncate">{sc.location || "—"}</span>
      <span className="text-xs text-gray-400 flex-1 min-w-0 truncate">{sc.content || "（タップして編集）"}</span>
      {sc.drawingDataUrl && <span className="text-xs text-amber-600 flex-shrink-0">✏</span>}
      <span className="text-xs text-gray-600 flex-shrink-0">{sc.time}</span>
      {active && <span className="text-xs text-amber-400 flex-shrink-0">▼編集中</span>}
      <button className="text-gray-600 hover:text-red-400 text-xs flex-shrink-0 ml-1 bg-transparent border-0 cursor-pointer"
        onClick={e => { e.stopPropagation(); onDel(); }}>✕</button>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// 手書き/テキスト トグル
// ═══════════════════════════════════════════════════════════
function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-800 rounded-full p-0.5 select-none">
      {[["draw","✏ 手書き"],["text","⌨ テキスト"]].map(([m, label]) => (
        <button key={m}
          className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${mode === m ? (m === "draw" ? "bg-amber-600 text-black" : "bg-gray-600 text-white") : "text-gray-500 hover:text-gray-300 bg-transparent"}`}
          onClick={() => onChange(m)}>{label}</button>
      ))}
    </div>
  );
}

// 手書き+テキスト 統合セクションカード
function DrawSection({ cardClass="", icon, label, hint, textValue, onTextChange, placeholder, rows=4, drawDataUrl, onDrawSave, onDrawClear }) {
  const [mode, setMode] = useState("draw");
  const [showModal, setShowModal] = useState(false);

  return (
    <div className={cardClass || cx.card}>
      {showModal && (
        <DrawingModal
          initialDataUrl={drawDataUrl}
          onSave={dataUrl => { onDrawSave(dataUrl); setShowModal(false); }}
          onClose={() => setShowModal(false)}
        />
      )}
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {icon && <span className="text-amber-500 text-lg font-bold">{icon}</span>}
          <span className="font-semibold text-white text-sm">{label}</span>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}

      {/* 手書きモード */}
      {mode === "draw" && (
        <div>
          {drawDataUrl ? (
            <div className="relative rounded overflow-hidden border border-gray-700 cursor-pointer mb-2"
              onClick={() => setShowModal(true)}>
              <img src={drawDataUrl} alt="手書きメモ" className="w-full object-contain max-h-64 bg-gray-900" />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded">✏ 編集</span>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-gray-700 rounded h-32 flex flex-col items-center justify-center cursor-pointer hover:border-amber-600 transition-colors mb-2"
              onClick={() => setShowModal(true)}>
              <span className="text-3xl mb-1">✏</span>
              <span className="text-xs text-gray-500">タップして描く</span>
            </div>
          )}
          <div className="flex gap-1 justify-end">
            <button className={`${cx.btn} ${cx.ghost} text-xs py-0.5 px-2`} onClick={() => setShowModal(true)}>
              {drawDataUrl ? "✏ 編集" : "✏ 描く"}
            </button>
            {drawDataUrl && (
              <button className={`${cx.btn} ${cx.danger} text-xs py-0.5 px-2`} onClick={onDrawClear}>削除</button>
            )}
          </div>
        </div>
      )}

      {/* テキストモード */}
      {mode === "text" && (
        <textarea className={cx.ta} rows={rows} value={textValue || ""}
          onChange={e => onTextChange(e.target.value)} placeholder={placeholder || hint} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 手書き — DrawingModal
// ═══════════════════════════════════════════════════════════
const DRAW_SIZES = [
  { v: 2,  label: "細" },
  { v: 5,  label: "中" },
  { v: 12, label: "太" },
];

function DrawingModal({ initialDataUrl, onSave, onClose }) {
  // テーマに応じてキャンバス背景とペンカラーを切り替え
  const isDark      = useContext(ThemeCtx);
  const BG_COLOR    = isDark ? CANVAS_BG_DARK  : CANVAS_BG_LIGHT;
  const DRAW_COLORS = isDark ? DRAW_COLORS_DARK : DRAW_COLORS_LIGHT;
  const canvasRef       = useRef(null);
  const ctxRef          = useRef(null);   // DPR対応済みcontext
  const dprRef          = useRef(1);      // devicePixelRatio
  const isDrawing       = useRef(false);
  const capturedPtrType = useRef(null);
  const strokePts       = useRef([]);
  const [tool,    setTool]    = useState("pen");
  const [color,   setColor]   = useState(DRAW_COLORS[0].v);
  const [size,    setSize]    = useState(DRAW_SIZES[1].v);
  const [history, setHistory] = useState([]);
  const [canUndo, setCanUndo] = useState(false);

  // ─── DPR対応初期化（記事の方法2準拠）───────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr  = window.devicePixelRatio || 1;
    dprRef.current = dpr;
    const rect = canvas.getBoundingClientRect();

    // キャンバスの物理解像度をDPR倍に設定
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);   // 以後の描画はCSS座標系で行う
    ctxRef.current = ctx;

    // 背景塗り
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 既存データの読み込み
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initialDataUrl;
    }
  }, []);

  // ─── ヒストリー管理 ──────────────────────────────────
  const pushHistory = () => {
    const snap = canvasRef.current.toDataURL("image/jpeg", 0.6);
    setHistory(h => { const n = [...h.slice(-20), snap]; setCanUndo(n.length > 0); return n; });
  };

  const undo = () => {
    setHistory(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      const next = h.slice(0, -1);
      setCanUndo(next.length > 0);
      const canvas = canvasRef.current;
      const rect   = canvas.getBoundingClientRect();
      const img    = new Image();
      img.onload = () => {
        const ctx = ctxRef.current;
        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = prev;
      return next;
    });
  };

  const clear = () => {
    pushHistory();
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const ctx    = ctxRef.current;
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  // ─── 座標変換（DPR補正済み・CSS座標系）───────────────
  // getBoundingClientRect()はCSS座標なのでDPR不要
  const toXY = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      p: Math.max(e.pressure > 0 ? e.pressure : 0.5, 0.1),
      t: Date.now(),
    };
  };

  // ─── MyScript方式ストローク描画 ────────────────────
  const angleAxe = (p1, p2) => Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const linkPts  = (pt, angle, width) => {
    const r = pt.p * width;
    return [
      { x: pt.x - Math.sin(angle) * r, y: pt.y + Math.cos(angle) * r },
      { x: pt.x + Math.sin(angle) * r, y: pt.y - Math.cos(angle) * r },
    ];
  };
  const midPt = (p1, p2) => ({
    x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2,
    p: (p1.p + p2.p) / 2, t: (p1.t + p2.t) / 2,
  });

  const drawStroke = (pts, col, width) => {
    if (!pts.length) return;
    const ctx = ctxRef.current;
    const n   = pts.length;
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = col;
    if (n < 3) {
      ctx.arc(pts[0].x, pts[0].y, width * (pts[0].p || 0.5), 0, Math.PI * 2, true);
    } else {
      const p0 = pts[0];
      ctx.arc(p0.x, p0.y, width * p0.p, 0, Math.PI * 2, true);
      const seg2 = midPt(pts[0], pts[1]);
      const lk0  = linkPts(pts[0], angleAxe(pts[0], seg2), width);
      const lk2  = linkPts(seg2,   angleAxe(pts[0], seg2), width);
      ctx.moveTo(lk0[0].x, lk0[0].y);
      ctx.lineTo(lk2[0].x, lk2[0].y); ctx.lineTo(lk2[1].x, lk2[1].y); ctx.lineTo(lk0[1].x, lk0[1].y);
      for (let i = 0; i < n - 2; i++) {
        const begin = midPt(pts[i], pts[i+1]), end = midPt(pts[i+1], pts[i+2]), ctrl = pts[i+1];
        const l1 = linkPts(begin, angleAxe(begin, ctrl), width);
        const l2 = linkPts(end,   angleAxe(ctrl,  end),  width);
        const l3 = linkPts(ctrl,  angleAxe(begin, end),  width);
        ctx.moveTo(l1[0].x, l1[0].y);
        ctx.quadraticCurveTo(l3[0].x, l3[0].y, l2[0].x, l2[0].y);
        ctx.lineTo(l2[1].x, l2[1].y);
        ctx.quadraticCurveTo(l3[1].x, l3[1].y, l1[1].x, l1[1].y);
      }
      const bl = midPt(pts[n-2], pts[n-1]);
      const lkb = linkPts(bl, angleAxe(pts[n-2], pts[n-1]), width);
      const lke = linkPts(pts[n-1], angleAxe(pts[n-2], pts[n-1]), width);
      ctx.moveTo(lkb[0].x, lkb[0].y);
      ctx.lineTo(lke[0].x, lke[0].y); ctx.lineTo(lke[1].x, lke[1].y); ctx.lineTo(lkb[1].x, lkb[1].y);
      const angle = angleAxe(pts[n-2], pts[n-1]);
      const lkf = linkPts(pts[n-1], angle, width);
      ctx.moveTo(lkf[0].x, lkf[0].y);
      for (let i = 1; i <= 6; i++) {
        const na = angle - (i * Math.PI / 6);
        ctx.lineTo(pts[n-1].x - pts[n-1].p * width * Math.sin(na), pts[n-1].y + pts[n-1].p * width * Math.cos(na));
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // ─── ジェスチャー検出 ──────────────────────────────

  // 既存描画との被さり度チェック（0〜1）
  const getInkCoverage = (pts) => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const dpr = dprRef.current;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x1 = Math.max(0, Math.floor(Math.min(...xs) * dpr));
    const y1 = Math.max(0, Math.floor(Math.min(...ys) * dpr));
    const x2 = Math.min(canvas.width,  Math.ceil(Math.max(...xs) * dpr));
    const y2 = Math.min(canvas.height, Math.ceil(Math.max(...ys) * dpr));
    const w = x2 - x1, h = y2 - y1;
    if (w <= 0 || h <= 0) return 0;
    try {
      const imgData = canvas.getContext("2d").getImageData(x1, y1, w, h);
      const data = imgData.data;
      // 背景色をパース
      const bgHex = BG_COLOR.replace("#", "");
      const bgR = parseInt(bgHex.slice(0, 2), 16);
      const bgG = parseInt(bgHex.slice(2, 4), 16);
      const bgB = parseInt(bgHex.slice(4, 6), 16);
      // グリッドサンプリング（最大60×60点）
      const step = Math.max(1, Math.floor(Math.min(w, h) / 60));
      let ink = 0, total = 0;
      for (let py = 0; py < h; py += step) {
        for (let px = 0; px < w; px += step) {
          const idx = (py * w + px) * 4;
          const diff = Math.abs(data[idx] - bgR) + Math.abs(data[idx+1] - bgG) + Math.abs(data[idx+2] - bgB);
          if (diff > 40) ink++;
          total++;
        }
      }
      return total > 0 ? ink / total : 0;
    } catch { return 0; }
  };

  const isScratch = (pts) => {
    if (pts.length < 5) return false;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const bw  = Math.max(...xs) - Math.min(...xs);
    const bh  = Math.max(...ys) - Math.min(...ys);
    const bb  = Math.max(bw, bh);
    let len = 0, xRev = 0, yRev = 0;
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
      if (i >= 2) {
        const dx1 = pts[i-1].x - pts[i-2].x, dx2 = pts[i].x - pts[i-1].x;
        const dy1 = pts[i-1].y - pts[i-2].y, dy2 = pts[i].y - pts[i-1].y;
        // 最低2px以上（遅いスライドでも検出）
        if (dx1 * dx2 < 0 && Math.abs(dx1) > 2 && Math.abs(dx2) > 2) xRev++;
        if (dy1 * dy2 < 0 && Math.abs(dy1) > 2 && Math.abs(dy2) > 2) yRev++;
      }
    }
    const totalRev = xRev + yRev;
    if (bb < 60) return false;

    // 被さり度に応じて閾値を緩める
    const coverage = getInkCoverage(pts);
    if (coverage > 0.08) {
      // 描画と重なっている → 緩い条件
      return len > bb * 0.8 && totalRev >= 2;
    }
    // 描画と重なっていない → 厳しい条件（誤検知防止）
    return len > bb * 1.5 && totalRev >= 3;
  };

  const isStrikeThrough = (pts) => {
    if (pts.length < 4) return false;
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const bw = Math.max(...xs) - Math.min(...xs);
    const bh = Math.max(...ys) - Math.min(...ys);

    // 横線判定: 横幅が縦幅の6倍以上 かつ 最低200px
    const isHoriz = bw >= 200 && bh <= bw * 0.16;
    // 縦線判定: 縦幅が横幅の6倍以上 かつ 最低200px
    const isVert  = bh >= 200 && bw <= bh * 0.16;
    if (!isHoriz && !isVert) return false;

    // 反転チェック（往復でないこと）
    let xRev = 0, yRev = 0;
    for (let i = 2; i < pts.length; i++) {
      const sdx1 = pts[i-1].x - pts[i-2].x, sdx2 = pts[i].x - pts[i-1].x;
      const sdy1 = pts[i-1].y - pts[i-2].y, sdy2 = pts[i].y - pts[i-1].y;
      if (sdx1 * sdx2 < 0 && Math.abs(sdx1) > 4 && Math.abs(sdx2) > 4) xRev++;
      if (sdy1 * sdy2 < 0 && Math.abs(sdy1) > 4 && Math.abs(sdy2) > 4) yRev++;
    }
    if (isHoriz && xRev >= 2) return false;
    if (isVert  && yRev >= 2) return false;

    // 直線に近いか（始点→終点からのずれが10%以内）
    const dx = pts[pts.length-1].x - pts[0].x, dy = pts[pts.length-1].y - pts[0].y;
    const lineLen = Math.hypot(dx, dy);
    if (lineLen < 150) return false;
    let maxDist = 0;
    for (const pt of pts) {
      maxDist = Math.max(maxDist, Math.abs(dy * pt.x - dx * pt.y + pts[pts.length-1].x * pts[0].y - pts[pts.length-1].y * pts[0].x) / lineLen);
    }
    return maxDist < lineLen * 0.1;
  };

  const getScratchArea = (pts) => ({
    x: Math.min(...pts.map(p=>p.x)) - 15,
    y: Math.min(...pts.map(p=>p.y)) - 25,
    w: Math.max(...pts.map(p=>p.x)) - Math.min(...pts.map(p=>p.x)) + 30,
    h: Math.max(...pts.map(p=>p.y)) - Math.min(...pts.map(p=>p.y)) + 50,
  });

  const getStrikeThroughArea = (pts) => {
    const xs = pts.map(p=>p.x), ys = pts.map(p=>p.y);
    const bw = Math.max(...xs) - Math.min(...xs);
    const bh = Math.max(...ys) - Math.min(...ys);
    const isVert = bh > bw;
    return isVert
      ? { // 縦線: 左右に余裕、上下はぴったり
          x: Math.min(...xs) - 60, y: Math.min(...ys) - 10,
          w: bw + 120,             h: bh + 20 }
      : { // 横線: 上下に余裕、左右はぴったり
          x: Math.min(...xs) - 10, y: Math.min(...ys) - 60,
          w: bw + 20,              h: bh + 120 };
  };

  // ─── PointerEventハンドラ（MyScript方式）──────────
  const onPointerDown = (e) => {
    e.preventDefault();
    if (e.pointerType === "touch") return;
    if (e.button !== 0 || e.buttons !== 1) return;
    capturedPtrType.current = e.pointerType;
    isDrawing.current = true;
    strokePts.current = [];
    canvasRef.current.setPointerCapture(e.pointerId);
    pushHistory();
    const pt = toXY(e);
    strokePts.current.push(pt);
    if (tool !== "eraser") drawStroke([pt], color, size * 2);
  };

  const onPointerMove = (e) => {
    if (!isDrawing.current || e.pointerType !== capturedPtrType.current) return;
    e.preventDefault();
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events) {
      const pt = toXY(ev);
      strokePts.current.push(pt);
      if (tool === "eraser") {
        const ctx = ctxRef.current;
        ctx.fillStyle = BG_COLOR;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size * 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (strokePts.current.length >= 2) {
        drawStroke(strokePts.current.slice(-4), color, size * 2);
      }
    }
  };

  const onPointerUp = (e) => {
    if (!isDrawing.current || e.pointerType !== capturedPtrType.current) return;
    isDrawing.current = false;
    capturedPtrType.current = null;
    const pts = strokePts.current;
    strokePts.current = [];
    if (tool === "pen") {
      let area = null;
      if (isScratch(pts))            area = getScratchArea(pts);
      else if (isStrikeThrough(pts)) area = getStrikeThroughArea(pts);

      if (area) {
        // ジェスチャー消去: 直接BG_COLORで塗りつぶす（非同期なし）
        // ジェスチャーストローク自体も含めて消去されるのでシンプルで確実
        const ctx = ctxRef.current;
        ctx.fillStyle = BG_COLOR;
        ctx.fillRect(area.x, area.y, area.w, area.h);
      }
    }
  };

  const handleSave = () => {
    onSave(canvasRef.current.toDataURL("image/jpeg", 0.85));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" style={{ touchAction: "none" }}>
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-wrap">
        <div className="flex gap-1">
          {[{ id:"pen", icon:"✏️", label:"ペン" },{ id:"eraser", icon:"⬜", label:"消しゴム" }].map(t => (
            <button key={t.id} className={`${cx.btn} text-xs py-1 px-2 ${tool===t.id?cx.pri:cx.ghost}`}
              onPointerDown={e=>{e.stopPropagation();setTool(t.id);}}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-gray-700" />
        <div className="flex gap-1">
          {DRAW_COLORS.map(c => (
            <button key={c.v} title={c.label}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${color===c.v?"border-white scale-125":"border-transparent"}`}
              style={{background:c.v}}
              onPointerDown={e=>{e.stopPropagation();setColor(c.v);setTool("pen");}}/> 
          ))}
        </div>
        <div className="w-px h-5 bg-gray-700" />
        <div className="flex gap-1">
          {DRAW_SIZES.map(s => (
            <button key={s.v} className={`${cx.btn} text-xs py-1 px-2 ${size===s.v?cx.pri:cx.ghost}`}
              onPointerDown={e=>{e.stopPropagation();setSize(s.v);}}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-gray-700" />
        <span className="text-xs text-gray-500 hidden sm:block">乱書き・横線で消去</span>
        <div className="w-px h-5 bg-gray-700 hidden sm:block" />
        <button className={`${cx.btn} ${cx.ghost} text-xs py-1 px-2 ${!canUndo?"opacity-30":""}`}
          onPointerDown={e=>{e.stopPropagation();undo();}} disabled={!canUndo}>↩ 戻す</button>
        <button className={`${cx.btn} ${cx.ghost} text-xs py-1 px-2`}
          onPointerDown={e=>{e.stopPropagation();clear();}}>🗑 全消し</button>
        <div className="flex-1" />
        <button className={`${cx.btn} ${cx.ghost} text-xs`}
          onClick={e=>{e.stopPropagation();onClose();}}>キャンセル</button>
        <button className={`${cx.btn} ${cx.pri} text-xs`}
          onClick={e=>{e.stopPropagation();handleSave();}}>💾 保存</button>
      </div>
      {/* キャンバス — objectFitなし・DPR対応 */}
      <div className="flex-1 overflow-hidden bg-gray-950 p-2">
        <canvas ref={canvasRef}
          style={{ width:"100%", height:"100%", display:"block", touchAction:"none", WebkitTouchCallout:"none" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}


// サムネイル表示 + 編集ボタン
function DrawingThumb({ dataUrl, onEdit, onClear, label = "手書きメモ" }) {
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <label className={cx.lbl}>{label}</label>
        <div className="flex gap-1">
          <button className={`${cx.btn} ${cx.ghost} text-xs py-0.5 px-2`} onClick={onEdit}>
            {dataUrl ? "✏ 編集" : "✏ 描く"}
          </button>
          {dataUrl && (
            <button className={`${cx.btn} ${cx.danger} text-xs py-0.5 px-1`} onClick={onClear}>✕</button>
          )}
        </div>
      </div>
      {dataUrl ? (
        <div className="relative rounded overflow-hidden border border-gray-700 cursor-pointer" onClick={onEdit}>
          <img src={dataUrl} alt="手書きメモ" className="w-full object-contain max-h-48 bg-gray-900" />
        </div>
      ) : (
        <div className="border border-dashed border-gray-700 rounded h-16 flex items-center justify-center cursor-pointer hover:border-gray-500 transition-colors"
          onClick={onEdit}>
          <span className="text-xs text-gray-600">タップして描く</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 専用スケッチタブ
// ═══════════════════════════════════════════════════════════
function Sketches({ project, updateProject }) {
  const sketches = project.sketches || [];
  const [drawTarget, setDrawTarget] = useState(null); // sketchId

  const addSketch = () => {
    const s = createSketch(`スケッチ ${sketches.length + 1}`);
    updateProject(p => ({ ...p, sketches: [...(p.sketches || []), s] }));
    setDrawTarget(s.id);
  };
  const delSketch = (id) => {
    if (!confirm("このスケッチを削除しますか？")) return;
    updateProject(p => ({ ...p, sketches: (p.sketches || []).filter(s => s.id !== id) }));
  };
  const setSketchField = (id, k, v) => updateProject(p => ({
    ...p, sketches: (p.sketches || []).map(s => s.id === id ? { ...s, [k]: v } : s)
  }));

  const openTarget = sketches.find(s => s.id === drawTarget);

  return (
    <div className="max-w-3xl mx-auto">
      {drawTarget && openTarget && (
        <DrawingModal
          initialDataUrl={openTarget.drawingDataUrl}
          onSave={dataUrl => setSketchField(drawTarget, "drawingDataUrl", dataUrl)}
          onClose={() => setDrawTarget(null)}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-400">{sketches.length}枚</span>
        <button className={`${cx.btn} ${cx.pri}`} onClick={addSketch}>＋ 新しいスケッチ</button>
      </div>

      {sketches.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <div className="text-5xl mb-4">✏️</div>
          <p className="text-sm">スケッチがありません。「＋ 新しいスケッチ」で追加してください。</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {sketches.map(s => (
          <div key={s.id} className={cx.card}>
            <div className="flex items-center gap-2 mb-2">
              <input className="bg-transparent flex-1 text-sm font-medium text-white focus:outline-none"
                value={s.title} onChange={e => setSketchField(s.id, "title", e.target.value)}
                placeholder="タイトル" />
              <button className={`${cx.btn} ${cx.danger} text-xs px-1 py-0`}
                onClick={() => delSketch(s.id)}>✕</button>
            </div>
            {s.drawingDataUrl ? (
              <div className="relative rounded overflow-hidden border border-gray-700 cursor-pointer mb-2"
                onClick={() => setDrawTarget(s.id)}>
                <img src={s.drawingDataUrl} alt={s.title} className="w-full object-contain bg-gray-900" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                  <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded">✏ 編集</span>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-700 rounded h-28 flex items-center justify-center cursor-pointer hover:border-amber-600 transition-colors mb-2"
                onClick={() => setDrawTarget(s.id)}>
                <span className="text-xs text-gray-500">タップして描く</span>
              </div>
            )}
            <p className="text-xs text-gray-600">{new Date(s.createdAt).toLocaleDateString("ja-JP")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// 感情曲線
// ═══════════════════════════════════════════════════════════
function EmotionCurve({ project }) {
  const hk = project.hakogaki;

  // 全シーンをフラットに取り出す（幕名・エピソード名付き）
  const allScenes = [];
  for (const act of hk.acts) {
    if (hk.useEpisode) {
      for (const ep of act.episodes) {
        for (const sc of ep.scenes) {
          allScenes.push({ ...sc, actName: act.name, epName: ep.name });
        }
      }
    }
    for (const sc of act.scenes) {
      allScenes.push({ ...sc, actName: act.name, epName: null });
    }
  }

  if (allScenes.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-gray-600">
        <div className="text-4xl mb-3">〰</div>
        <p className="text-sm">箱書きにシーンを追加すると感情曲線が表示されます。</p>
        <p className="text-xs mt-1 text-gray-700">各シーンの編集パネルで感情値（−5〜+5）を設定してください。</p>
      </div>
    );
  }

  const W = 640, H = 280, PAD = { t: 24, b: 48, l: 40, r: 16 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const toX = (i) => PAD.l + (i / Math.max(allScenes.length - 1, 1)) * innerW;
  const toY = (v) => PAD.t + ((5 - v) / 10) * innerH;

  // SVGパス
  const pts = allScenes.map((sc, i) => [toX(i), toY(sc.emotion ?? 0)]);
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");

  // 幕区切り線のX座標
  const actLines = [];
  let idx = 0;
  for (const act of hk.acts) {
    const count = hk.useEpisode
      ? act.episodes.reduce((s, e) => s + e.scenes.length, 0) + act.scenes.length
      : act.scenes.length;
    if (idx > 0) actLines.push({ x: toX(idx), name: act.name });
    idx += count;
  }

  const [hover, setHover] = useState(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className={`${cx.card} mb-4`}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-white text-sm">主人公の感情曲線</span>
          <span className="text-xs text-gray-500">{allScenes.length}シーン</span>
        </div>

        <div className="overflow-x-auto">
          <svg width={W} height={H} className="block">
            {/* グリッド */}
            {[-5,-4,-3,-2,-1,0,1,2,3,4,5].map(v => (
              <g key={v}>
                <line x1={PAD.l} x2={W - PAD.r} y1={toY(v)} y2={toY(v)}
                  stroke={v === 0 ? "#4b5563" : "#1f2937"} strokeWidth={v === 0 ? 1.5 : 1} strokeDasharray={v === 0 ? "" : "4 4"} />
                <text x={PAD.l - 6} y={toY(v) + 4} textAnchor="end" fontSize={9} fill={v === 0 ? "#6b7280" : "#374151"}>
                  {v > 0 ? `+${v}` : v}
                </text>
              </g>
            ))}

            {/* 幕区切り */}
            {actLines.map((al, i) => (
              <g key={i}>
                <line x1={al.x} x2={al.x} y1={PAD.t} y2={H - PAD.b} stroke="#78350f" strokeWidth={1} strokeDasharray="6 3" />
                <text x={al.x + 4} y={PAD.t + 10} fontSize={9} fill="#92400e">{al.name}</text>
              </g>
            ))}

            {/* ゼロラベル */}
            <text x={PAD.l - 6} y={toY(0) + 4} textAnchor="end" fontSize={9} fill="#6b7280">0</text>

            {/* 塗りつぶし */}
            {allScenes.length > 1 && (
              <path
                d={`${d} L${pts[pts.length-1][0]},${toY(0)} L${pts[0][0]},${toY(0)} Z`}
                fill="url(#emotionGrad)" opacity={0.3}
              />
            )}

            <defs>
              <linearGradient id="emotionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#1e3a5f" />
              </linearGradient>
            </defs>

            {/* 折れ線 */}
            {allScenes.length > 1 && (
              <path d={d} fill="none" stroke="#d97706" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            )}

            {/* 点 */}
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={hover === i ? 6 : 4}
                fill={hover === i ? "#fbbf24" : "#d97706"} stroke="#0a0a0f" strokeWidth={2}
                style={{ cursor: "pointer", transition: "r 0.1s" }}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            ))}

            {/* ホバー tooltip */}
            {hover !== null && (() => {
              const sc = allScenes[hover];
              const [x, y] = pts[hover];
              const tipW = 140, tipH = 52;
              const tx = x + tipW + 8 > W ? x - tipW - 8 : x + 8;
              const ty = y - tipH / 2 < PAD.t ? PAD.t : y - tipH / 2;
              return (
                <g>
                  <rect x={tx} y={ty} width={tipW} height={tipH} rx={4} fill="#1f2937" stroke="#374151" />
                  <text x={tx + 8} y={ty + 16} fontSize={10} fill="#fbbf24" fontWeight="bold">
                    {sc.location || "場所未設定"}
                  </text>
                  <text x={tx + 8} y={ty + 30} fontSize={9} fill="#9ca3af">
                    {sc.actName}{sc.epName ? ` › ${sc.epName}` : ""}
                  </text>
                  <text x={tx + 8} y={ty + 44} fontSize={10} fill={(sc.emotion ?? 0) >= 0 ? "#fbbf24" : "#60a5fa"} fontWeight="bold">
                    感情値: {(sc.emotion ?? 0) > 0 ? `+${sc.emotion}` : (sc.emotion ?? 0)}
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
        <p className="text-xs text-gray-600 mt-2 text-center">各シーンにカーソルを合わせると詳細が表示されます。感情値は箱書きタブのシーン編集で設定してください。</p>
      </div>

      {/* シーン一覧（感情値付き） */}
      <div className={cx.card}>
        <p className="text-xs text-gray-400 font-semibold mb-3 uppercase tracking-wider">シーン一覧</p>
        <div className="space-y-1">
          {allScenes.map((sc, i) => {
            const em = sc.emotion ?? 0;
            return (
              <div key={sc.id} className="flex items-center gap-3 py-1 border-b border-gray-800 last:border-0">
                <span className="text-xs text-gray-600 w-5 text-right">{i + 1}</span>
                <span className="text-xs text-amber-500/60 w-12 truncate">{sc.actName}</span>
                <span className="text-xs text-gray-300 flex-1 truncate">{sc.location || sc.content || "—"}</span>
                <div className="flex items-center gap-1 w-24">
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.abs(em) / 5 * 100}%`,
                        marginLeft: em < 0 ? `${(5 + em) / 5 * 100}%` : "50%",
                        background: em >= 0 ? "#d97706" : "#3b82f6",
                      }} />
                  </div>
                  <span className={`text-xs font-bold w-6 text-right ${em > 0 ? "text-amber-400" : em < 0 ? "text-blue-400" : "text-gray-500"}`}>
                    {em > 0 ? `+${em}` : em}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 設定メモ
// ═══════════════════════════════════════════════════════════
function Notes({ project, updateProject }) {
  const [editId,    setEditId]    = useState(null);
  const [tagFilter, setTagFilter] = useState("");
  const [noteDrawId, setNoteDrawId] = useState(null);

  const add = () => {
    const n = { id: genId(), title: "", content: "", tags: [], drawingDataUrl: null };
    updateProject(p => ({ ...p, notes: [...p.notes, n] }));
    setEditId(n.id);
  };
  const del = (id) => {
    if (!confirm("削除しますか？")) return;
    updateProject(p => ({ ...p, notes: p.notes.filter(n => n.id !== id) }));
    if (editId === id) setEditId(null);
  };
  const setN = (id, k, v) => updateProject(p => ({
    ...p, notes: p.notes.map(n => n.id === id ? { ...n, [k]: v } : n)
  }));

  const allTags = [...new Set(project.notes.flatMap(n => n.tags))];
  const filtered = tagFilter ? project.notes.filter(n => n.tags.includes(tagFilter)) : project.notes;
  const editing = project.notes.find(n => n.id === editId);

  return (
    <div className="max-w-2xl mx-auto">
      {/* タグフィルター */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-1 flex-wrap">
          <button className={`${cx.badge} cursor-pointer ${!tagFilter ? "bg-amber-900/60 text-amber-300" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
            onClick={() => setTagFilter("")}>すべて</button>
          {allTags.map(t => (
            <button key={t} className={`${cx.badge} cursor-pointer ${tagFilter === t ? "bg-amber-900/60 text-amber-300" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              onClick={() => setTagFilter(tagFilter === t ? "" : t)}>{t}</button>
          ))}
        </div>
        <button className={`${cx.btn} ${cx.pri} text-xs`} onClick={add}>＋ メモ追加</button>
      </div>

      {/* カード一覧 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {filtered.map(n => (
          <div key={n.id} className={`${cx.card} cursor-pointer transition-colors ${editId === n.id ? "border-amber-600" : "hover:border-gray-600"}`}
            onClick={() => setEditId(editId === n.id ? null : n.id)}>
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-white text-sm truncate">{n.title || "無題メモ"}</span>
              <button className={`${cx.btn} ${cx.danger} text-xs px-1 py-0 flex-shrink-0`}
                onClick={e => { e.stopPropagation(); del(n.id); }}>✕</button>
            </div>
            {n.drawingDataUrl ? (
              <div className="mt-1 rounded overflow-hidden border border-gray-700">
                <img src={n.drawingDataUrl} alt="手書きメモ" className="w-full object-contain max-h-28 bg-gray-900" />
              </div>
            ) : (
              n.content && <p className="text-xs text-gray-400 line-clamp-3 whitespace-pre-wrap">{n.content}</p>
            )}
            <div className="flex gap-1 mt-2 flex-wrap">
              {n.tags.map(t => <span key={t} className={`${cx.badge} bg-gray-800 text-gray-400`}>{t}</span>)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-600 text-sm">メモがありません</div>
        )}
      </div>

      {/* 編集パネル */}
      {editing && (
        <div className={cx.card}>
          <div className="flex justify-between items-center mb-3">
            <span className="font-semibold text-amber-400 text-sm">メモ編集</span>
            <button className="text-gray-500 hover:text-white text-xs" onClick={() => setEditId(null)}>✕ 閉じる</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className={cx.lbl}>タイトル</label>
              <input className={cx.input} value={editing.title} placeholder="メモのタイトル"
                onChange={e => setN(editing.id, "title", e.target.value)} />
            </div>
            <DrawSection
              label="内容" hint="自由に書いてください" rows={8}
              placeholder="自由に書いてください"
              textValue={editing.content}
              onTextChange={v => setN(editing.id, "content", v)}
              drawDataUrl={editing.drawingDataUrl}
              onDrawSave={dataUrl => setN(editing.id, "drawingDataUrl", dataUrl)}
              onDrawClear={() => setN(editing.id, "drawingDataUrl", null)}
            />
            <div>
              <label className={cx.lbl}>タグ（カンマ区切り）</label>
              <input className={cx.input} placeholder="例: 世界観, 用語集, リサーチ"
                value={editing.tags.join(", ")}
                onChange={e => setN(editing.id, "tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════
// Supabase Auth + DB 同期
// ═══════════════════════════════════════════════════════════
const DEBOUNCE = 4000;

// ログイン画面
function AuthScreen({ onLogin }) {
  const [mode,     setMode]     = useState("login"); // login | signup
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [msg,      setMsg]      = useState("");

  const handleEmail = async () => {
    if (!email || !password) { setMsg("❌ メールとパスワードを入力してください"); return; }
    setLoading(true); setMsg("");
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg("✅ 確認メールを送信しました。メールのリンクをクリックしてログインしてください。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setMsg("❌ " + (e.message === "Invalid login credentials" ? "メールまたはパスワードが違います" : e.message));
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) { setMsg("❌ " + error.message); setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎬</div>
          <h1 className="text-2xl font-bold text-amber-400 tracking-widest">シナリオ工房</h1>
          <p className="text-xs text-gray-500 mt-1">映画・ドラマ脚本制作ツール</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          {/* モード切り替え */}
          <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
            {[["login","ログイン"],["signup","新規登録"]].map(([m, label]) => (
              <button key={m} className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-colors cursor-pointer ${mode === m ? "bg-amber-600 text-black" : "text-gray-400 hover:text-white"}`}
                onClick={() => { setMode(m); setMsg(""); }}>{label}</button>
            ))}
          </div>

          {/* Googleログイン */}
          <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-700 rounded-lg text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors cursor-pointer bg-transparent"
            onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.93 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Googleでログイン
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">または</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* メール/パスワード */}
          <div className="space-y-3">
            <div>
              <label className={cx.lbl}>メールアドレス</label>
              <input className={cx.input} type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" onKeyDown={e => e.key === "Enter" && handleEmail()} />
            </div>
            <div>
              <label className={cx.lbl}>パスワード（6文字以上）</label>
              <input className={cx.input} type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleEmail()} />
            </div>
          </div>

          {msg && <p className={`text-xs ${msg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{msg}</p>}

          <button className={`w-full ${cx.btn} ${cx.pri} py-2.5`} onClick={handleEmail} disabled={loading}>
            {loading ? "処理中…" : mode === "login" ? "ログイン" : "アカウント作成"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Supabase DB 同期フック
function useSupabaseSync(data, setData, user) {
  const [syncState,  setSyncState]  = useState("idle");
  const [syncMsg,    setSyncMsg]    = useState("");
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const timerRef       = useRef(null);
  const retryTimerRef  = useRef(null);
  const prevDataRef    = useRef(null);
  const pendingRef     = useRef(null); // オフライン中に保存できなかったデータ
  const initializedRef = useRef(false);

  // オンライン/オフライン監視
  useEffect(() => {
    const onOnline = () => {
      setIsOnline(true);
      // オンライン復帰時にペンディングデータをアップロード
      if (pendingRef.current && user) {
        setSyncState("saving"); setSyncMsg("");
        supabase.from("user_data").upsert(
          { user_id: user.id, data: pendingRef.current, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        ).then(({ error }) => {
          if (!error) {
            prevDataRef.current = JSON.stringify(pendingRef.current);
            pendingRef.current = null;
            setSyncState("saved"); setSyncMsg("オンライン復帰 — 同期しました");
            setTimeout(() => setSyncState("idle"), 2500);
          }
        });
      }
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [user]);

  // 初回ロード
  useEffect(() => {
    if (!user || initializedRef.current) return;
    initializedRef.current = true;
    if (!navigator.onLine) {
      // オフライン起動: localStorageのデータをそのまま使う
      prevDataRef.current = JSON.stringify(data);
      setSyncState("offline");
      return;
    }
    setSyncState("loading");
    supabase.from("user_data").select("data").eq("user_id", user.id).single()
      .then(({ data: row, error }) => {
        if (error && error.code !== "PGRST116") {
          setSyncState("error"); setSyncMsg("読み込み失敗: ローカルデータを使用します");
          prevDataRef.current = JSON.stringify(data);
          setTimeout(() => setSyncState("idle"), 3000);
          return;
        }
        if (row) {
          setData(row.data);
          prevDataRef.current = JSON.stringify(row.data);
        } else {
          prevDataRef.current = JSON.stringify(data);
        }
        setSyncState("saved"); setSyncMsg("読み込みました");
        setTimeout(() => setSyncState("idle"), 2000);
      });
  }, [user]);

  // データ変更時デバウンス保存
  useEffect(() => {
    if (!user || !initializedRef.current) return;
    const current = JSON.stringify(data);
    if (prevDataRef.current === current) return;
    clearTimeout(timerRef.current);

    if (!navigator.onLine) {
      // オフライン中: ペンディングに積む（localStorageには既に保存済み）
      pendingRef.current = data;
      setSyncState("offline");
      return;
    }

    setSyncState("saving");
    timerRef.current = setTimeout(async () => {
      const { error } = await supabase.from("user_data").upsert(
        { user_id: user.id, data, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) {
        // ネットワークエラー → ペンディングに積む
        pendingRef.current = data;
        setSyncState("offline");
        return;
      }
      prevDataRef.current = current;
      pendingRef.current = null;
      setSyncState("saved"); setSyncMsg("保存しました");
      setTimeout(() => setSyncState("idle"), 2000);
    }, DEBOUNCE);
    return () => clearTimeout(timerRef.current);
  }, [data, user]);

  const manualFetch = async () => {
    if (!user) return;
    if (!navigator.onLine) { setSyncState("offline"); return; }
    setSyncState("loading");
    const { data: row, error } = await supabase.from("user_data").select("data").eq("user_id", user.id).single();
    if (error) { setSyncState("error"); setSyncMsg(error.message); return; }
    if (row) { setData(row.data); prevDataRef.current = JSON.stringify(row.data); }
    setSyncState("saved"); setSyncMsg("最新データを読み込みました");
    setTimeout(() => setSyncState("idle"), 2000);
  };

  return { syncState, syncMsg, isOnline, manualFetch };
}

// 同期ステータスバッジ
function SyncBadge({ syncState, syncMsg, isOnline, onManualFetch, user, onSignOut }) {
  const MAP = {
    idle:    { label: "✓ 同期済み",      color: "text-green-400" },
    saving:  { label: "⟳ 保存中…",       color: "text-amber-400 animate-pulse" },
    saved:   { label: `✓ ${syncMsg}`,    color: "text-green-400" },
    loading: { label: "⟳ 読み込み中…",   color: "text-amber-400 animate-pulse" },
    error:   { label: `⚠ ${syncMsg}`,    color: "text-yellow-500" },
    offline: { label: "📴 オフライン",    color: "text-gray-400" },
  };
  const { label, color } = MAP[syncState] || MAP.idle;
  return (
    <div className="flex items-center gap-2">
      {/* オフラインバナー */}
      {!isOnline && (
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full hidden sm:inline">
          📴 オフライン — データはローカルに保存中
        </span>
      )}
      <span className={`text-xs ${color} hidden sm:inline`}>{label}</span>
      {isOnline && (
        <button title="再読み込み" className={`${cx.btn} ${cx.ghost} text-xs py-1 px-2`} onClick={onManualFetch}>↓</button>
      )}
      {user && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 hidden sm:inline truncate max-w-28">{user.email || "ログイン中"}</span>
          <button className={`${cx.btn} ${cx.ghost} text-xs py-1 px-2`} onClick={onSignOut}>ログアウト</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ROOT
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [data,      setData]      = useState(load);
  const [currentId, setCurrentId] = useState(null);
  const [activeTab, setActiveTab] = useState("tenchiJin");
  const [user,      setUser]      = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDark,    setIsDark]    = useState(() => localStorage.getItem(THEME_STORE) !== "light");

  // テーマ切り替え
  const toggleTheme = () => setIsDark(d => {
    const next = !d;
    localStorage.setItem(THEME_STORE, next ? "dark" : "light");
    document.documentElement.classList.toggle("light-mode", !next);
    return next;
  });

  // 初回テーマ適用
  useEffect(() => {
    document.documentElement.classList.toggle("light-mode", !isDark);
  }, []);

  // ローカル保存
  useEffect(() => { save(data); }, [data]);

  // Auth状態監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentId(null);
    setData({ projects: [] });
  };

  // Supabase同期
  const sync = useSupabaseSync(data, setData, user);

  const currentProject = data.projects.find(p => p.id === currentId);

  const updateProject = useCallback((fn) => {
    setData(prev => ({ ...prev, projects: prev.projects.map(p => p.id === currentId ? fn(p) : p) }));
  }, [currentId]);

  const openProject = (id) => { setCurrentId(id); setActiveTab("overview"); };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-amber-400 text-sm animate-pulse">読み込み中…</div>
      </div>
    );
  }

  if (!user) return <AuthScreen onLogin={setUser} />;

  const syncProps = {
    syncState: sync.syncState, syncMsg: sync.syncMsg,
    isOnline: sync.isOnline,
    onManualFetch: sync.manualFetch, user, onSignOut: handleSignOut,
  };

  const themeProps = { isDark, onToggleTheme: toggleTheme };

  return (
    <ThemeCtx.Provider value={isDark}>
      {(!currentId || !currentProject) ? (
        <HomeScreen data={data} setData={setData} onOpen={openProject} {...syncProps} {...themeProps} />
      ) : (
        <ProjectScreen
          project={currentProject} updateProject={updateProject}
          activeTab={activeTab} setActiveTab={setActiveTab}
          onBack={() => setCurrentId(null)} {...syncProps} {...themeProps}
        />
      )}
    </ThemeCtx.Provider>
  );
}