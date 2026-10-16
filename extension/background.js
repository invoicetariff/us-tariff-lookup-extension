/**
 * MV3 service worker：右键菜单 + 地址栏（omnibox）入口。
 * 只有一个 "contextMenus" 权限；不采集任何数据，所有查询在本地完成。
 */
import { extractCode, resolveLookupUrl, searchCodes } from "./lib/search.js";

const LOCALE = (chrome.i18n.getUILanguage() || "en").startsWith("zh") ? "zh" : "en";
const MENU_ID = "us-tariff-lookup-selection";

let dataPromise = null;
function loadData() {
  if (!dataPromise) {
    dataPromise = fetch(chrome.runtime.getURL("data/data.json")).then((r) => r.json());
  }
  return dataPromise;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: chrome.i18n.getMessage("contextMenu") + " “%s”",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText) return;
  const data = await loadData();
  const url = resolveLookupUrl(data, info.selectionText, LOCALE);
  chrome.tabs.create({ url });
});

// —— omnibox：地址栏输入 “tariff 8471” / “tariff baby stroller” ——
function omniboxDescription(entry) {
  const rates = [entry.general];
  if (entry.cn301) rates.push(`+${entry.cn301[1]}% CN 301`);
  return `<dim>${entry.hts8.replace(/(\d{4})(\d{2})(\d{2})/, "$1.$2.$3")} — ${escapeXml(entry.description).slice(0, 90)}</dim> <match>${escapeXml(rates.join(" · "))}</match>`;
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text.trim()) return suggest([]);
  const data = await loadData();
  suggest(
    searchCodes(data, text, 6).map((e) => ({ content: e.hts8, description: omniboxDescription(e) }))
  );
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const data = await loadData();
  const code = extractCode(text);
  let url;
  if (code && data.codes.some((c) => c[0] === code)) {
    url = data.detailPages.includes(code) ? `${data.site}/${LOCALE}/hts/${code}` : `${data.site}/${LOCALE}/tariff-calculator`;
  } else if (text.trim()) {
    url = `${data.site}/${LOCALE}/hts`;
  } else {
    url = `${data.site}/${LOCALE}`;
  }
  chrome.tabs.create({ url });
});
