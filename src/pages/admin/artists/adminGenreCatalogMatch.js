/** Утилиты сопоставления строк жанров из тегов/ ffprobe с каталогом жанров на бэке. */

export function normGenreToken(s) {
  return String(s || "").trim().toLowerCase();
}

export function genreTokensFromRaw(names) {
  const out = [];
  for (const raw of names || []) {
    for (const piece of String(raw || "").split(/[/;,|]+/)) {
      const t = piece.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

/** Англоязычные теги → типичные подстроки в русских названиях (только при однозначном совпадении). */
const GENRE_ENGLISH_TO_LOCAL_SUBSTRINGS = {
  indie: ["инди"],
  rock: ["рок"],
  metal: ["метал"],
  pop: ["поп"],
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
  const tokens = genreTokensFromRaw(names);

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
