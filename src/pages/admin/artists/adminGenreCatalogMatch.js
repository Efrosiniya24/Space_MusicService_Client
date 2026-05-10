/** Утилиты сопоставления строк жанров из тегов/ ffprobe с каталогом жанров на бэке. */

import { FF_ID3_GENRES } from "./id3FfmpegGenres.js";

export function normGenreToken(s) {
  return String(s || "")
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^['"\u2018\u2019\u201c\u201d]+|['"\u2018\u2019\u201c\u201d]+$/g, "")
    .toLowerCase();
}

function isLikelyDomainGenreSpam(t) {
  const s = String(t || "").trim();
  if (!s || /\s/.test(s)) return false;
  if (/^\d+$/.test(s)) return false;
  return /^[a-z0-9][a-z0-9.-]{0,120}\.[a-z]{2,63}$/i.test(s);
}

export function genreTokensFromRaw(names) {
  const out = [];
  for (const raw of names || []) {
    for (const piece of String(raw || "").split(/[/;,|]+/)) {
      const t = piece.trim();
      if (t && !isLikelyDomainGenreSpam(t)) out.push(t);
    }
  }
  return out;
}

/** Разворачивает токены вида "(17)" в текст из таблицы FFmpeg ID3 (как в ffprobe). */
function expandHintsWithId3Numeric(names) {
  const base = genreTokensFromRaw(names);
  const extra = [];
  for (const t of base) {
    const m = String(t).trim().match(/^\(?\s*(\d+)\s*\)?$/);
    if (!m) continue;
    const idx = Number(m[1]);
    const nm = FF_ID3_GENRES[idx];
    if (nm) extra.push(nm);
  }
  return base.concat(extra);
}

function normalizePositiveLongIds(raw) {
  const out = [];
  const seen = new Set();
  for (const x of Array.isArray(raw) ? raw : []) {
    const n = Number(x);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}

/**
 * Если пользователь не выбрал жанры — подставить id из REACT_APP_DEFAULT_TRACK_GENRE_IDS (через запятую).
 * Сервер всё равно может добить жанр по своим правилам.
 */
export function mergeGenreIdsWithEnvFallback(selectedIds) {
  let ids = normalizePositiveLongIds(selectedIds);
  if (ids.length > 0) return ids;
  const raw =
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_DEFAULT_TRACK_GENRE_IDS;
  if (!raw || !String(raw).trim()) return [];
  return normalizePositiveLongIds(
    String(raw)
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Англоязычные теги → типичные подстроки в русских названиях (только при однозначном совпадении). */
const GENRE_ENGLISH_TO_LOCAL_SUBSTRINGS = {
  indie: ["инди"],
  rock: ["рок"],
  metal: ["метал"],
  pop: ["поп"],
  ruspop: ["поп", "рус"],
  "hip-hop": ["хип", "рэп"],
  hiphop: ["хип", "рэп"],
  jazz: ["джаз"],
  blues: ["блюз"],
  folk: ["фолк"],
  soul: ["соул"],
  funk: ["фанк"],
  electronic: ["электро"],
  techno: ["техно"],
  house: ["хаус"],
  ambient: ["эмбиент"],
  punk: ["панк"],
  classical: ["классик"],
};

export function matchCatalogGenreIdsFromStrings(names, catalogGenres) {
  const matched = new Set();
  const catalog = Array.isArray(catalogGenres) ? catalogGenres : [];
  const tokens = expandHintsWithId3Numeric(names);

  for (const token of tokens) {
    const low = normGenreToken(token);
    if (!low) continue;
    const hit = catalog.find((x) => normGenreToken(x?.name) === low);
    const hid = hit?.id != null ? Number(hit.id) : NaN;
    if (Number.isFinite(hid)) matched.add(hid);
  }

  for (const token of tokens) {
    const low = normGenreToken(token);
    if (low.length < 3) continue;
    const hits = catalog.filter((g) => {
      const cn = normGenreToken(g?.name);
      if (!cn) return false;
      return cn.includes(low) || low.includes(cn);
    });
    if (
      hits.length === 1 &&
      hits[0]?.id != null &&
      Number.isFinite(Number(hits[0].id))
    ) {
      matched.add(Number(hits[0].id));
    }
  }

  for (const token of tokens) {
    const low = normGenreToken(token);
    const substrs = GENRE_ENGLISH_TO_LOCAL_SUBSTRINGS[low];
    if (!substrs) continue;
    for (const sub of substrs) {
      const hits = catalog.filter((g) =>
        normGenreToken(g?.name).includes(sub),
      );
      if (
        hits.length === 1 &&
        hits[0]?.id != null &&
        Number.isFinite(Number(hits[0].id))
      ) {
        matched.add(Number(hits[0].id));
      }
    }
  }

  return Array.from(matched).sort((a, b) => a - b);
}

/** Повторяющееся поле multipart genreHints для POST /track/for-artist (создание жанров на бэке при отсутствии в каталоге). */
export function appendGenreHintsArrayToFormData(fd, rawHints) {
  if (!fd) return;
  const arr = Array.isArray(rawHints) ? rawHints : [];
  for (const t of genreTokensFromRaw(arr)) {
    fd.append("genreHints", t);
  }
}

/** Добавить строки жанров в ref-массив без дубликатов по нижнему регистру. */
export function appendPendingGenreHints(ref, rawNames) {
  const seen = new Set(ref.current.map((x) => normGenreToken(x)));
  for (const piece of genreTokensFromRaw(rawNames)) {
    const k = normGenreToken(piece);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    ref.current.push(piece);
  }
}
