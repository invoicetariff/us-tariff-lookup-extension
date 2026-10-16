#!/usr/bin/env node
/**
 * 生成 Chrome 扩展数据集：engine/data → chrome-extension/us-tariff-lookup/data/data.json
 *
 * 数据来源（单一事实源，与站点/npm 包同源）：
 *   - mfn-full.json     全量 5,689 条 HTS 8 位码 {hts8, description, general(MFN 税率文本)}
 *   - ruleset-seed.json 484 条高频码富数据（英文描述覆盖 + descriptionZh/keywordsZh 中文检索）
 *                       + 对华 301（按码）+ Section 232（按章 scope）+ 版本号
 *   - app/out/hts/*.html 站点已预渲染详情页的码（用于深链判断）
 *
 * 合并规则：seed 富数据覆盖 mfn-full 同码条目（并补中文检索字段），seed 独有的 21 码整体并入。
 * codes 条目：[hts8, description, general, zh?]，zh 仅 484 高频码携带（"中文名|kw1 kw2"）。
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const engineData = join(root, "engine", "data");
const outDir = join(root, "chrome-extension", "us-tariff-lookup", "data");

const mfn = JSON.parse(readFileSync(join(engineData, "mfn-full.json"), "utf8"));
const seed = JSON.parse(readFileSync(join(engineData, "ruleset-seed.json"), "utf8"));

// 站点已预渲染的 /hts/[code] 详情页码集合
const siteOut = join(root, "app", "out", "hts");
const detailPages = new Set();
if (existsSync(siteOut)) {
  for (const f of readdirSync(siteOut)) {
    const m = f.match(/^(\d{8})\.html$/);
    if (m) detailPages.add(m[1]);
  }
} else {
  console.warn("[build-data] app/out/hts 不存在，先跑 npm run build 可获得详情页清单；本次无深链页");
}

// 对华 301：hts8 → [list, rate]
const cn301 = {};
for (const c of seed.china301) cn301[c.hts8] = [c.list, c.rate];

// Section 232 按章提示：chapter → [group, rate, nameEn]
const s232 = {};
for (const s of seed.section232) {
  if (s.scope?.kind !== "chapter") continue;
  for (const ch of s.scope.values) {
    s232[ch] = [s.group || "232", s.rate, s.nameEn || s.name];
  }
}

// 富码覆盖表：hts8 → [description, general, zh]
const rich = new Map();
for (const e of seed.mfn) {
  const zh = [e.descriptionZh, ...(e.keywordsZh || [])].filter(Boolean).join("|");
  rich.set(e.hts8, [e.description, e.general, zh || undefined]);
}

// codes: [hts8, description, general, zh?]，按码升序
const seen = new Set();
const codes = [];
for (const e of mfn) {
  const r = rich.get(e.hts8);
  const row = r ? [e.hts8, r[0], r[1], r[2]] : [e.hts8, e.description, e.general];
  codes.push(row);
  seen.add(e.hts8);
}
for (const [hts8, r] of rich) {
  if (!seen.has(hts8)) codes.push([hts8, r[0], r[1], r[2]]);
}
codes.sort((a, b) => a[0].localeCompare(b[0]));

const data = {
  fmt: 2,
  version: seed.version,
  asOf: seed.asOf,
  built: new Date().toISOString().slice(0, 10),
  counts: {
    codes: codes.length,
    rich: rich.size,
    cn301: Object.keys(cn301).length,
    detailPages: detailPages.size,
  },
  site: "https://invoicetariff.com",
  codes,
  cn301,
  s232,
  detailPages: [...detailPages].sort(),
};

writeFileSync(join(outDir, "data.json"), JSON.stringify(data));
const kb = (JSON.stringify(data).length / 1024).toFixed(0);
console.log(
  `[build-data] codes=${data.counts.codes} (rich=${data.counts.rich}) cn301=${data.counts.cn301} detailPages=${data.counts.detailPages} ruleset=${data.version} (${data.asOf}) → data.json ${kb}KB`
);
