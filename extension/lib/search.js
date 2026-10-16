/**
 * 共享搜索逻辑（popup 与 service worker 复用，ES Module）。
 * 数据形如 build-data.mjs 产出的 data.json。
 */

export function prettyCode(hts8) {
  return `${hts8.slice(0, 4)}.${hts8.slice(4, 6)}.${hts8.slice(6) || "00"}`;
}

/** 从任意文本里提取 6–10 位连续数字（容忍 8471.30.01 / 84713001 等写法） */
export function extractCode(text) {
  const digits = String(text || "").replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 10) return null;
  return digits.slice(0, 8).padEnd(8, "0");
}

/**
 * 搜索：码前缀优先，其次描述全文（英文 AND 语义 + 中文子串，覆盖 484 高频码的中文名/关键词）。
 * @returns {Array<{hts8:string, description:string, general:string, zh?:string, cn301:[string,number]|null, s232:[string,number,string]|null, hasPage:boolean}>}
 */
export function searchCodes(data, query, limit = 40) {
  const q = String(query || "").trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const digits = q.replace(/\D/g, "");
  // 含 CJK 时用整段子串匹配；英文按空白拆词 AND
  const hasCJK = /[\u3400-\u9fff]/.test(q);
  const tokens = hasCJK ? [q] : lower.split(/\s+/).filter(Boolean);

  const matches = (descLower, zh) => {
    const zhLower = (zh || "").toLowerCase();
    return tokens.every((t) => descLower.includes(t) || (zhLower && zhLower.includes(t)));
  };

  const mk = (row) => ({
    hts8: row[0],
    description: row[1],
    general: row[2],
    zh: typeof row[3] === "string" ? row[3] : undefined,
    cn301: data.cn301[row[0]] || null,
    s232: data.s232[row[0].slice(0, 2)] || null,
    hasPage: data.detailPages.includes(row[0]),
  });

  const out = [];
  const seen = new Set();

  // 1) 码前缀（≥2 位数字才启用）
  if (digits.length >= 2) {
    for (const row of data.codes) {
      if (row[0].startsWith(digits)) {
        seen.add(row[0]);
        out.push(mk(row));
        if (out.length >= limit) return out;
      }
    }
  }

  // 2) 描述全文（码命中之外的补充）
  if (tokens.length) {
    for (const row of data.codes) {
      if (seen.has(row[0])) continue;
      if (matches(row[1].toLowerCase(), row[3])) {
        seen.add(row[0]);
        out.push(mk(row));
        if (out.length >= limit) return out;
      }
    }
  }

  return out;
}

/** 右键菜单/地址栏：把选中文本解析成一个站点 URL */
export function resolveLookupUrl(data, text, locale = "en") {
  const base = data.site;
  const code = extractCode(text);
  if (code && data.codes.some((c) => c[0] === code)) {
    if (data.detailPages.includes(code)) return `${base}/${locale}/hts/${code}`;
  }
  return `${base}/${locale}/tariff-calculator`;
}
