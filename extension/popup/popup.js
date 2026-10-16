/** Popup：本地搜索 + 税率 chips + 站点深链。无网络请求、无数据采集。 */
import { prettyCode, searchCodes } from "../lib/search.js";

const zh = (navigator.language || "").toLowerCase().startsWith("zh");
const T = zh
  ? {
      placeholder: "HTS 编码或产品关键词…",
      recents: "最近查询",
      mfn: "MFN",
      cn301: (list, rate) => `对华 301 +${rate}%（清单 ${list}）`,
      s232: (name, rate) => `或适用 232 条款 ${rate}%（${name}）`,
      detail: "详情 ↗",
      calc: "试算 ↗",
      copy: "复制",
      copied: "已复制 ✓",
      empty: "输入 <b>HTS 编码</b>（如 8471.30.01）或<b>产品关键词</b>（如 baby stroller）开始查询",
      noresult: (q) => `没有匹配 “<b>${q}</b>” 的结果，试试更短的关键词或 6–10 位编码`,
      calcLink: "↗ 完整落地成本试算",
      radarLink: "关税雷达",
    }
  : {
      placeholder: "HTS code or product keyword…",
      recents: "Recent",
      mfn: "MFN",
      cn301: (list, rate) => `China 301 +${rate}% (List ${list})`,
      s232: (name, rate) => `Sec. 232 may apply: ${rate}% (${name})`,
      detail: "Details ↗",
      calc: "Calculator ↗",
      copy: "Copy",
      copied: "Copied ✓",
      empty: "Type an <b>HTS code</b> (e.g. 8471.30.01) or a <b>product keyword</b> (e.g. baby stroller)",
      noresult: (q) => `No match for “<b>${q}</b>” — try a shorter keyword or the 6–10 digit code`,
      calcLink: "↗ Full landed-cost calculator",
      radarLink: "Tariff radar",
    };

const $ = (id) => document.getElementById(id);
const qEl = $("q");
const resultsEl = $("results");
const recentsEl = $("recents");
const RECENTS_KEY = "utl-recents";

let DATA = null;

function applyText() {
  qEl.placeholder = T.placeholder;
  $("lnk-calc").textContent = T.calcLink;
  $("lnk-radar").textContent = T.radarLink;
}

function openUrl(url) {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) chrome.tabs.create({ url });
  else window.open(url, "_blank", "noopener");
}

function fmtGroup(group) {
  const names = { metal: zh ? "金属制品" : "metal articles", auto: zh ? "汽车" : "autos" };
  return names[group] || group;
}

function itemHtml(e) {
  const zhName = zh && e.zh ? e.zh.split("|")[0] : "";
  // MFN 税率显示在右上角药丸，chips 只放叠加税提示
  const chips = [];
  if (e.cn301) chips.push(`<span class="chip cn301">${T.cn301(e.cn301[0], e.cn301[1])}</span>`);
  if (e.s232) chips.push(`<span class="chip s232">${T.s232(fmtGroup(e.s232[0]), e.s232[1])}</span>`);
  const links = [];
  if (e.hasPage) links.push(`<a href="#" data-act="detail" data-code="${e.hts8}">${T.detail}</a>`);
  else links.push(`<a href="#" data-act="calc" data-code="${e.hts8}">${T.calc}</a>`);
  links.push(`<button type="button" data-act="copy" data-code="${e.hts8}">${T.copy}</button>`);
  return `<div class="item">
    <div class="item-top"><span class="code">${prettyCode(e.hts8)}</span><span class="mfn">${esc(e.general)}</span></div>
    <div class="desc">${zhName ? `<span class="desc-zh">${esc(zhName)}</span>` : ""}${esc(e.description)}</div>
    <div class="chips">${chips.join("")}</div>
    <div class="item-actions">${links.join("")}</div>
  </div>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render(q) {
  if (!q.trim()) {
    showRecents();
    return;
  }
  recentsEl.classList.add("hidden");
  const hits = searchCodes(DATA, q, 40);
  resultsEl.innerHTML = hits.length
    ? hits.map(itemHtml).join("")
    : `<div class="empty">${q.trim().length < 2 ? T.empty : T.noresult(esc(q))}</div>`;
}

function showRecents() {
  const list = getRecents();
  if (!list.length) {
    recentsEl.classList.add("hidden");
    resultsEl.innerHTML = `<div class="empty">${T.empty}</div>`;
    return;
  }
  recentsEl.classList.remove("hidden");
  recentsEl.innerHTML = `<div class="recents-label">${T.recents}</div>
    <div class="recents-list">${list.map((r) => `<button type="button" data-recent="${esc(r)}">${esc(r)}</button>`).join("")}</div>`;
  resultsEl.innerHTML = "";
}

function getRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(q) {
  const t = q.trim();
  if (t.length < 3) return;
  const list = [t, ...getRecents().filter((r) => r !== t)].slice(0, 8);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(list));
  } catch {
    /* 隐私模式忽略 */
  }
}

resultsEl.addEventListener("click", (ev) => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  ev.preventDefault();
  const code = el.dataset.code;
  if (el.dataset.act === "copy") {
    navigator.clipboard?.writeText(prettyCode(code));
    el.textContent = T.copied;
    el.classList.add("copied");
    setTimeout(() => {
      el.textContent = T.copy;
      el.classList.remove("copied");
    }, 1200);
  } else if (el.dataset.act === "detail") {
    openUrl(`${DATA.site}/${langDir()}/hts/${code}`);
  } else if (el.dataset.act === "calc") {
    openUrl(`${DATA.site}/${langDir()}/tariff-calculator`);
  }
});

recentsEl.addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-recent]");
  if (!b) return;
  qEl.value = b.dataset.recent;
  render(qEl.value);
});

function langDir() {
  return zh ? "zh" : "en";
}

qEl.addEventListener("input", () => render(qEl.value));
qEl.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") {
    const first = resultsEl.querySelector(".item .code");
    if (first) {
      pushRecent(qEl.value);
      const digits = first.textContent.replace(/\D/g, "");
      const hit = searchCodes(DATA, qEl.value, 40).find((e) => e.hts8 === digits);
      openUrl(hit?.hasPage ? `${DATA.site}/${langDir()}/hts/${digits}` : `${DATA.site}/${langDir()}/tariff-calculator`);
    }
  }
});

init();
async function init() {
  applyText();
  DATA = await (await fetch("../data/data.json")).json();
  $("ruleset").textContent = zh
    ? `规则版本 v${DATA.version} · 截至 ${DATA.asOf} · ${DATA.counts.codes.toLocaleString()} 条编码`
    : `Ruleset v${DATA.version} · as of ${DATA.asOf} · ${DATA.counts.codes.toLocaleString()} codes`;
  const demo = new URLSearchParams(location.search).get("q");
  qEl.value = demo || "";
  render(qEl.value);
  if (!demo) showRecents();
  qEl.focus();
}
