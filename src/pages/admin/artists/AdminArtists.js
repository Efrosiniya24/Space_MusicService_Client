import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import style from "../venues/VenueAdmin.module.css";
import pageStyle from "./AdminArtists.module.css";
import artistUiStyle from "./AdminArtistAddPage.module.css";
import login from "../../auth/admin/adminAuth.module.css";
import notice from "../../auth/listener/login.module.css";

import Header from "../../../Component/headerAdmin/HeaderAdmin";
import AudioPlayer from "../../../Component/AudioPlayer/AudioPlayer";
import search from "../../../icons/search_black.png";
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";
import {
  appendPendingGenreHints,
  matchCatalogGenreIdsFromStrings,
} from "./adminGenreCatalogMatch.js";

const API_GATEWAY = "http://localhost:8080";
const URL_ARTIST_ALL = `${API_GATEWAY}/space/media/artist/all`;
const URL_ARTIST_SEARCH = `${API_GATEWAY}/space/media/artist/search`;
const URL_TRACK_ALL = `${API_GATEWAY}/space/media/track/all`;
const URL_ARTIST_CREATE = `${API_GATEWAY}/space/media/artist/create`;
const URL_ADD_IMAGE = `${API_GATEWAY}/space/media/addImage`;
const urlTrackForArtist = (artistId) =>
  `${API_GATEWAY}/space/media/track/for-artist/${artistId}`;
const urlTrackAudioStream = (trackId) =>
  `${API_GATEWAY}/space/media/track/${trackId}/audio`;
const urlCatalogImage = (imageId) =>
  `${API_GATEWAY}/space/media/image/${imageId}`;
const URL_TRACK_PROBE_METADATA = `${API_GATEWAY}/space/media/track/probe-metadata`;

const DEFAULT_CATALOG_ROW_HEIGHT_PX = 52;
const MIN_CATALOG_TABLE_ROWS = 5;

function readFileDurationSeconds(file) {
  return new Promise((resolve) => {
    const u = URL.createObjectURL(file);
    const a = document.createElement("audio");
    a.preload = "metadata";
    const done = (sec) => {
      URL.revokeObjectURL(u);
      a.removeAttribute("src");
      resolve(sec);
    };
    a.onloadedmetadata = () => {
      const d = a.duration;
      done(Number.isFinite(d) && d > 0 && d < 86400 * 2 ? Math.round(d) : 0);
    };
    a.onerror = () => done(0);
    a.src = u;
  });
}

/** Имя трека из имени файла без расширения. */
function titleFromAudioFileName(name) {
  const base = String(name || "").replace(/\\/g, "/").split("/").pop() || "";
  return base.replace(/\.(mp3|flac|wav|ogg|m4a|aac|opus|webm)$/i, "").trim();
}

function audioMimeFromFileName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".opus")) return "audio/opus";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
}

async function responseToPlayableAudioBlob(response, fallbackFileName) {
  const headerRaw = response.headers.get("content-type") || "";
  const headerType = headerRaw.split(";")[0].trim().toLowerCase();
  const buf = await response.arrayBuffer();
  let mime = headerType;
  if (
    !mime ||
    mime === "application/octet-stream" ||
    mime === "binary/octet-stream"
  ) {
    mime = audioMimeFromFileName(fallbackFileName);
  }
  if (!mime.startsWith("audio/")) {
    mime = audioMimeFromFileName(fallbackFileName);
  }
  return new Blob([buf], { type: mime });
}

const URL_GENRE_ALL = `${API_GATEWAY}/space/media/genre/all`;
const URL_GENRE_CREATE = `${API_GATEWAY}/space/media/genre/create`;

const ARTIST_ROLE_OPTIONS = [
  "Исполнитель",
  "Композитор",
  "DJ",
  "Продюсер",
  "Инструменталист",
  "Автор",
];

function normalizeGenreIdList(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const x of raw) {
    const n = Number(x);
    if (Number.isFinite(n) && n > 0 && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.sort((a, b) => a - b);
}

function appendGenreIdsArrayToFormData(fd, genreIds) {
  for (const gid of normalizeGenreIdList(genreIds)) {
    fd.append("genreIds", String(gid));
  }
}

function normalizeArtistRoles(list) {
  const unique = new Set();
  for (const raw of Array.isArray(list) ? list : []) {
    const role = String(raw || "").trim();
    if (role) unique.add(role);
  }
  return Array.from(unique);
}

/** Подпись в плеере: уникальные имена из `artistNames` (ответ `/track/all`). */
function formatTrackCatalogArtistLine(track) {
  if (!track) return "Исполнители не указаны";
  const raw = track.artistNames;
  if (!Array.isArray(raw) || raw.length === 0) {
    return "Исполнители не привязаны";
  }
  const parts = raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Исполнители не привязаны";
}

function readAudioTagsBrowser(file) {
  return new Promise((resolve) => {
    jsmediatags.read(file, {
      onSuccess: (tag) => resolve(tag),
      onError: () => resolve(null),
    });
  });
}

function tagArtistToString(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object") {
    if (typeof raw.data === "string") return raw.data.trim();
    if (Array.isArray(raw) && raw.length > 0)
      return tagArtistToString(raw[0]);
  }
  const s = String(raw).trim();
  return s;
}

function tagAlbumToString(raw) {
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  return String(raw).trim();
}

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = String(dt.getFullYear());
  return `${d}.${m}.${y}`;
}

/** Длительность как «м.сс». */
function formatTrackDurationDot(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}.${String(sec).padStart(2, "0")}`;
}

const AdminArtists = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState("artists");

  const [errorMessage, setErrorMessage] = useState("");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);

  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [trackSearch, setTrackSearch] = useState("");
  const [trackSortKey, setTrackSortKey] = useState("id");
  const [trackSortDir, setTrackSortDir] = useState("asc");
  const [trackPage, setTrackPage] = useState(1);
  const [tracksTableAudioUrl, setTracksTableAudioUrl] = useState(null);
  const [tracksTablePlayingId, setTracksTablePlayingId] = useState(null);
  const [tracksTablePlayingTitle, setTracksTablePlayingTitle] =
    useState("");
  const [tracksTableCoverUrl, setTracksTableCoverUrl] = useState("");
  const [tracksTablePlayLoadingId, setTracksTablePlayLoadingId] =
    useState(null);
  const tracksTableAudioAbortRef = useRef(null);
  const catalogTableScrollRef = useRef(null);

  const quickAudioInputRef = useRef(null);
  const quickCoverInputRef = useRef(null);
  const quickArtistPhotoInputRef = useRef(null);
  const [quickTrackModalOpen, setQuickTrackModalOpen] = useState(false);
  const [quickTrackSubmitting, setQuickTrackSubmitting] = useState(false);
  const [quickModalArtists, setQuickModalArtists] = useState([]);
  const [quickModalArtistsLoading, setQuickModalArtistsLoading] =
    useState(false);
  const [quickNewArtist, setQuickNewArtist] = useState(false);
  const [quickExistingArtistId, setQuickExistingArtistId] = useState("");
  const [quickNewArtistName, setQuickNewArtistName] = useState("");
  const [quickArtistDescription, setQuickArtistDescription] = useState("");
  const [quickArtistRoles, setQuickArtistRoles] = useState(["Исполнитель"]);
  const [quickArtistPhotoFile, setQuickArtistPhotoFile] = useState(null);
  const [quickArtistPhotoPreviewUrl, setQuickArtistPhotoPreviewUrl] =
    useState("");
  const [quickTrackTitle, setQuickTrackTitle] = useState("");
  const [quickAudioFile, setQuickAudioFile] = useState(null);
  const [quickAudioPreviewUrl, setQuickAudioPreviewUrl] = useState("");
  const [quickCoverFile, setQuickCoverFile] = useState(null);
  const [quickTrackCoverPreviewUrl, setQuickTrackCoverPreviewUrl] =
    useState("");
  const [catalogGenres, setCatalogGenres] = useState([]);
  const [quickGenreIds, setQuickGenreIds] = useState([]);
  const [quickGenreSearch, setQuickGenreSearch] = useState("");
  const [quickNewGenreName, setQuickNewGenreName] = useState("");
  const [genreCreating, setGenreCreating] = useState(false);
  const [quickSuggestedAlbum, setQuickSuggestedAlbum] = useState("");
  const [quickSuggestedArtist, setQuickSuggestedArtist] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const catalogGenresRef = useRef([]);
  catalogGenresRef.current = catalogGenres;
  const quickNewArtistRef = useRef(false);
  quickNewArtistRef.current = quickNewArtist;
  const quickModalArtistsRef = useRef([]);
  quickModalArtistsRef.current = quickModalArtists;
  const quickModalArtistsLoadingRef = useRef(false);
  quickModalArtistsLoadingRef.current = quickModalArtistsLoading;
  const quickExistingArtistIdRef = useRef("");
  quickExistingArtistIdRef.current = quickExistingArtistId;
  const pendingGenreHintsRef = useRef([]);
  const pendingArtistHintRef = useRef("");
  /** После выбора файла один раз подбираем режим исполнителя; ручной переключатель снимает флаг. */
  const quickArtistFromFileAppliedRef = useRef(false);

  const mergeHintsIntoQuickForm = useCallback(() => {
    const catalog = catalogGenresRef.current;
    const hintPieces = pendingGenreHintsRef.current;
    if (hintPieces.length > 0 && catalog.length > 0) {
      const fromHints = matchCatalogGenreIdsFromStrings(
        hintPieces,
        catalog,
      );
      if (fromHints.length > 0) {
        setQuickGenreIds((prev) => {
          const merged = new Set([
            ...normalizeGenreIdList(prev),
            ...fromHints,
          ]);
          return Array.from(merged).sort((a, b) => a - b);
        });
      }
    }

    const artistHint = pendingArtistHintRef.current?.trim();
    if (!artistHint || quickArtistFromFileAppliedRef.current) {
      return;
    }
    if (quickModalArtistsLoadingRef.current) {
      return;
    }

    const rows = quickModalArtistsRef.current;
    const norm = (s) => String(s || "").trim().toLowerCase();
    const hit = rows.find((a) => norm(a?.name) === norm(artistHint));

    if (hit?.id != null && Number.isFinite(Number(hit.id))) {
      setQuickNewArtist(false);
      setQuickExistingArtistId(String(hit.id));
      setQuickNewArtistName("");
    } else {
      setQuickNewArtist(true);
      setQuickExistingArtistId("");
      setQuickNewArtistName(artistHint);
    }
    quickArtistFromFileAppliedRef.current = true;
  }, []);

  const [catalogTableViewportSlots, setCatalogTableViewportSlots] =
    useState(12);

  const measureCatalogTableViewportSlots = useCallback(() => {
    const scrollEl = catalogTableScrollRef.current;
    if (!scrollEl) return;
    const theadRow = scrollEl.querySelector("thead tr");
    const sampleRow = scrollEl.querySelector(
      "tbody tr[data-catalog-row]",
    );
    const theadH = theadRow?.getBoundingClientRect().height ?? 48;
    const rowH =
      sampleRow?.getBoundingClientRect().height ??
      DEFAULT_CATALOG_ROW_HEIGHT_PX;
    const available = scrollEl.clientHeight - theadH;
    const slots = Math.max(
      MIN_CATALOG_TABLE_ROWS,
      Math.floor(available / Math.max(1, rowH)),
    );
    setCatalogTableViewportSlots(slots);
  }, []);

  const loadArtists = async (query = "") => {
    setLoading(true);
    const q = String(query || "").trim();
    const url = q
      ? `${URL_ARTIST_SEARCH}?query=${encodeURIComponent(q)}`
      : URL_ARTIST_ALL;
    try {
      const res = await fetch(url, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("artists_fetch_failed");
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setArtists(rows);
      setErrorMessage("");
    } catch {
      setArtists([]);
      setErrorMessage("Не удалось загрузить список исполнителей");
    } finally {
      setLoading(false);
    }
  };

  const loadAllTracks = async () => {
    setLoadingTracks(true);
    try {
      const res = await fetch(URL_TRACK_ALL, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("tracks_fetch_failed");
      const data = await res.json();
      const rows = Array.isArray(data) ? data : [];
      setTracks(rows);
      setErrorMessage("");
    } catch {
      setTracks([]);
      setErrorMessage("Не удалось загрузить список треков");
    } finally {
      setLoadingTracks(false);
    }
  };

  const resetQuickTrackModal = useCallback(() => {
    setQuickTrackSubmitting(false);
    setQuickModalArtists([]);
    setQuickModalArtistsLoading(false);
    setQuickNewArtist(false);
    setQuickExistingArtistId("");
    setQuickNewArtistName("");
    setQuickArtistDescription("");
    setQuickArtistRoles(["Исполнитель"]);
    setQuickArtistPhotoFile(null);
    setQuickArtistPhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setQuickTrackTitle("");
    setQuickAudioFile(null);
    setQuickAudioPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setQuickCoverFile(null);
    setQuickTrackCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setCatalogGenres([]);
    setQuickGenreIds([]);
    setQuickGenreSearch("");
    setQuickNewGenreName("");
    setGenreCreating(false);
    setQuickSuggestedAlbum("");
    setQuickSuggestedArtist("");
    pendingGenreHintsRef.current = [];
    pendingArtistHintRef.current = "";
    quickArtistFromFileAppliedRef.current = false;
    if (quickAudioInputRef.current) quickAudioInputRef.current.value = "";
    if (quickCoverInputRef.current) quickCoverInputRef.current.value = "";
    if (quickArtistPhotoInputRef.current) {
      quickArtistPhotoInputRef.current.value = "";
    }
  }, []);

  const uploadImageFileQuick = async (file) => {
    const ownerRaw = localStorage.getItem("userId");
    const ownerId = Number(ownerRaw);
    if (!Number.isFinite(ownerId)) return null;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("ownerId", String(ownerId));
    try {
      const res = await fetch(URL_ADD_IMAGE, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!res.ok) return null;
      const data = await res.json();
      const id = data?.id != null ? Number(data.id) : null;
      return Number.isFinite(id) ? id : null;
    } catch {
      return null;
    }
  };

  const toggleQuickArtistRole = (roleName) => {
    setQuickArtistRoles((prev) => {
      if (prev.includes(roleName)) {
        return prev.filter((r) => r !== roleName);
      }
      return [...prev, roleName];
    });
  };

  const toggleQuickGenre = (genreId) => {
    const id = Number(genreId);
    if (!Number.isFinite(id) || id <= 0) return;
    setQuickGenreIds((prev) => {
      const norm = normalizeGenreIdList(prev);
      if (norm.includes(id)) return norm.filter((x) => x !== id);
      return [...norm, id].sort((a, b) => a - b);
    });
  };

  const createQuickGenreFromModal = async () => {
    const nm = String(quickNewGenreName || "").trim();
    if (!nm || genreCreating || quickTrackSubmitting) return;
    setGenreCreating(true);
    setErrorMessage("");
    try {
      const res = await fetch(URL_GENRE_CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ name: nm }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setErrorMessage(errText || "Не удалось создать жанр");
        return;
      }
      const created = await res.json();
      const id = created?.id != null ? Number(created.id) : null;
      const label =
        created?.name != null ? String(created.name).trim() : nm;
      setCatalogGenres((prev) => {
        if (!Number.isFinite(id)) return prev;
        const without = prev.filter((g) => Number(g?.id) !== id);
        without.push({ id, name: label });
        without.sort((a, b) =>
          String(a?.name || "").localeCompare(String(b?.name || ""), "ru"),
        );
        return without;
      });
      if (Number.isFinite(id)) {
        setQuickGenreIds((prev) =>
          [...new Set([...normalizeGenreIdList(prev), id])].sort(
            (a, b) => a - b,
          ),
        );
      }
      setQuickNewGenreName("");
      setSuccessMessage("Жанр добавлен");
    } catch {
      setErrorMessage("Не удалось создать жанр");
    } finally {
      setGenreCreating(false);
    }
  };

  const openQuickTrackModal = () => {
    setSuccessMessage("");
    setErrorMessage("");
    resetQuickTrackModal();
    setQuickTrackModalOpen(true);
  };

  const submitQuickTrack = async () => {
    if (quickTrackSubmitting) return;
    setErrorMessage("");
    const audio = quickAudioFile;
    const didCreateNewArtist = quickNewArtist;

    if (!audio) {
      setErrorMessage("Выберите аудиофайл трека");
      return;
    }

    const titleDraft = String(quickTrackTitle || "").trim();
    const suggestedTitle = titleFromAudioFileName(audio.name);
    const trackTitleFinal = titleDraft || suggestedTitle;
    if (!trackTitleFinal) {
      setErrorMessage("Введите название трека");
      return;
    }

    let artistNumericId = null;
    if (quickNewArtist) {
      const nm = String(quickNewArtistName || "").trim();
      if (!nm) {
        setErrorMessage("Укажите имя нового исполнителя");
        return;
      }
      if (!quickArtistPhotoFile) {
        setErrorMessage("Добавьте фотографию исполнителя");
        return;
      }
    } else {
      const sel = Number(quickExistingArtistId);
      if (!Number.isFinite(sel) || sel <= 0) {
        setErrorMessage("Выберите исполнителя из списка");
        return;
      }
      artistNumericId = sel;
    }

    const ownerRaw = localStorage.getItem("userId");
    const ownerId = Number(ownerRaw);
    if (!Number.isFinite(ownerId)) {
      setErrorMessage("Не удалось определить пользователя. Войдите снова.");
      return;
    }

    setQuickTrackSubmitting(true);
    try {
      let aid = artistNumericId;
      if (quickNewArtist) {
        const nm = String(quickNewArtistName || "").trim();
        const artistCoverId = await uploadImageFileQuick(quickArtistPhotoFile);
        if (artistCoverId == null) {
          setErrorMessage("Не удалось загрузить фото исполнителя");
          return;
        }
        const createRes = await fetch(URL_ARTIST_CREATE, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            name: nm,
            description:
              String(quickArtistDescription || "").trim() || null,
            roles: normalizeArtistRoles(quickArtistRoles),
            idCover: artistCoverId,
          }),
        });
        if (!createRes.ok) {
          const errText = await createRes.text().catch(() => "");
          setErrorMessage(errText || "Не удалось создать исполнителя");
          return;
        }
        const createdArtist = await createRes.json();
        const newId =
          createdArtist?.id != null ? Number(createdArtist.id) : null;
        if (!Number.isFinite(newId) || newId <= 0) {
          setErrorMessage("Не удалось получить id исполнителя");
          return;
        }
        aid = newId;
      }

      let trackCoverId = null;
      if (quickCoverFile) {
        const uploaded = await uploadImageFileQuick(quickCoverFile);
        if (uploaded == null) {
          setErrorMessage("Не удалось загрузить обложку трека");
          return;
        }
        trackCoverId = uploaded;
      }

      const durSec = await readFileDurationSeconds(audio);
      const inferredMime = audioMimeFromFileName(audio.name);
      const fileToSend =
        audio.type && audio.type.startsWith("audio/")
          ? audio
          : new File([audio], audio.name, { type: inferredMime });

      const fd = new FormData();
      fd.append("file", fileToSend);
      fd.append("name", trackTitleFinal);
      fd.append("ownerId", String(ownerId));
      if (trackCoverId != null) fd.append("idCover", String(trackCoverId));
      if (durSec > 0) fd.append("durationSeconds", String(durSec));
      appendGenreIdsArrayToFormData(fd, quickGenreIds);

      const res = await fetch(urlTrackForArtist(aid), {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setErrorMessage(errText || "Не удалось сохранить трек");
        return;
      }

      setSuccessMessage("Трек добавлен");
      setQuickTrackModalOpen(false);
      resetQuickTrackModal();
      await loadAllTracks();
      if (didCreateNewArtist) {
        await loadArtists(searchQuery);
      }
    } catch {
      setErrorMessage("Не удалось сохранить трек");
    } finally {
      setQuickTrackSubmitting(false);
    }
  };

  const closeTracksTablePlayer = useCallback(() => {
    try {
      tracksTableAudioAbortRef.current?.abort();
    } catch {
      /* ignore */
    }
    tracksTableAudioAbortRef.current = null;
    setTracksTableAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setTracksTableCoverUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setTracksTablePlayingId(null);
    setTracksTablePlayingTitle("");
  }, []);

  const toggleTracksTablePlay = useCallback(
    async (track) => {
      const id = track?.id;
      if (id == null) return;
      if (tracksTablePlayingId === id && tracksTableAudioUrl) {
        closeTracksTablePlayer();
        return;
      }
      setTracksTablePlayLoadingId(id);
      setErrorMessage("");
      try {
        try {
          tracksTableAudioAbortRef.current?.abort();
        } catch {
          /* ignore */
        }
        const ac = new AbortController();
        tracksTableAudioAbortRef.current = ac;
        setTracksTableAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setTracksTableCoverUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return "";
        });
        const res = await fetch(urlTrackAudioStream(id), {
          headers: authHeaders(),
          signal: ac.signal,
        });
        if (!res.ok) {
          setErrorMessage("Не удалось загрузить аудио трека");
          return;
        }
        const blob = await responseToPlayableAudioBlob(
          res,
          track.originalFileName || "track.mp3",
        );
        const u = URL.createObjectURL(blob);
        let coverUrl = "";
        const coverId = Number(track?.idCover);
        if (Number.isFinite(coverId) && coverId > 0) {
          const cRes = await fetch(urlCatalogImage(coverId), {
            headers: authHeaders(),
            signal: ac.signal,
          });
          if (cRes.ok) {
            coverUrl = URL.createObjectURL(await cRes.blob());
          }
        }
        if (tracksTableAudioAbortRef.current !== ac) {
          URL.revokeObjectURL(u);
          if (coverUrl) URL.revokeObjectURL(coverUrl);
          return;
        }
        setTracksTablePlayingId(id);
        setTracksTablePlayingTitle(String(track.name || ""));
        setTracksTableCoverUrl(coverUrl);
        setTracksTableAudioUrl(u);
        tracksTableAudioAbortRef.current = null;
      } catch (err) {
        if (err?.name === "AbortError") return;
        setErrorMessage("Не удалось загрузить аудио трека");
      } finally {
        setTracksTablePlayLoadingId(null);
      }
    },
    [
      tracksTablePlayingId,
      tracksTableAudioUrl,
      closeTracksTablePlayer,
    ],
  );

  useEffect(() => {
    loadArtists("");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadArtists(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (section !== "tracks") return undefined;
    void loadAllTracks();
    return undefined;
  }, [section]);

  useEffect(() => {
    if (section === "tracks") return undefined;
    closeTracksTablePlayer();
    setTracksTablePlayLoadingId(null);
    return undefined;
  }, [section, closeTracksTablePlayer]);

  useEffect(() => {
    if (!errorMessage) return undefined;
    const timer = setTimeout(() => setErrorMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 3400);
    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!quickTrackModalOpen) return undefined;
    let cancelled = false;
    setQuickModalArtistsLoading(true);
    (async () => {
      try {
        const [arRes, gRes] = await Promise.all([
          fetch(URL_ARTIST_ALL, { headers: authHeaders() }),
          fetch(URL_GENRE_ALL, { headers: authHeaders() }),
        ]);
        if (!arRes.ok) throw new Error("quick_artists_failed");
        const arData = await arRes.json();
        const rows = Array.isArray(arData) ? arData : [];
        if (!cancelled) setQuickModalArtists(rows);

        if (gRes.ok) {
          const gData = await gRes.json();
          const grows = Array.isArray(gData) ? gData : [];
          if (!cancelled) setCatalogGenres(grows);
        } else if (!cancelled) {
          setCatalogGenres([]);
        }
      } catch {
        if (!cancelled) {
          setQuickModalArtists([]);
          setCatalogGenres([]);
          setErrorMessage("Не удалось загрузить данные для формы");
        }
      } finally {
        if (!cancelled) setQuickModalArtistsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quickTrackModalOpen]);

  useEffect(() => {
    if (!quickTrackModalOpen) return undefined;
    mergeHintsIntoQuickForm();
    return undefined;
  }, [
    quickTrackModalOpen,
    catalogGenres,
    quickModalArtists,
    quickModalArtistsLoading,
    mergeHintsIntoQuickForm,
  ]);

  useEffect(() => {
    if (!quickTrackModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !quickTrackSubmitting) {
        setQuickTrackModalOpen(false);
        resetQuickTrackModal();
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [
    quickTrackModalOpen,
    quickTrackSubmitting,
    resetQuickTrackModal,
  ]);

  const quickModalFilteredGenres = useMemo(() => {
    const q = String(quickGenreSearch || "").trim().toLowerCase();
    if (!q) return catalogGenres;
    return catalogGenres.filter((g) =>
      String(g?.name || "").toLowerCase().includes(q),
    );
  }, [catalogGenres, quickGenreSearch]);

  const filteredSorted = useMemo(() => {
    const rows = [...artists];

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") cmp = (Number(a?.id) || 0) - (Number(b?.id) || 0);
      else if (sortKey === "name")
        cmp = String(a?.name || "").localeCompare(String(b?.name || ""), "ru");
      else if (sortKey === "created")
        cmp = String(a?.createdAt || "").localeCompare(String(b?.createdAt || ""));
      else if (sortKey === "updated")
        cmp = String(a?.updatedAt || "").localeCompare(String(b?.updatedAt || ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [artists, sortKey, sortDir]);

  const catalogPageSize = catalogTableViewportSlots;

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / catalogPageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredSorted.slice(
    (safePage - 1) * catalogPageSize,
    safePage * catalogPageSize,
  );

  const filteredTracksSorted = useMemo(() => {
    const q = String(trackSearch || "").trim().toLowerCase();
    let rows = [...tracks];
    if (q) {
      rows = rows.filter(
        (t) =>
          String(t?.name || "")
            .toLowerCase()
            .includes(q) ||
          String(t?.originalFileName || "")
            .toLowerCase()
            .includes(q) ||
          String(t?.id ?? "").includes(q),
      );
    }
    rows.sort((a, b) => {
      let cmp = 0;
      if (trackSortKey === "id") cmp = (Number(a?.id) || 0) - (Number(b?.id) || 0);
      else if (trackSortKey === "name")
        cmp = String(a?.name || "").localeCompare(String(b?.name || ""), "ru");
      else if (trackSortKey === "file")
        cmp = String(a?.originalFileName || "").localeCompare(
          String(b?.originalFileName || ""),
          "ru",
        );
      else if (trackSortKey === "duration")
        cmp = (Number(a?.durationSeconds) || 0) - (Number(b?.durationSeconds) || 0);
      else if (trackSortKey === "single") cmp = Number(a?.single) - Number(b?.single);
      return trackSortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [tracks, trackSearch, trackSortKey, trackSortDir]);

  const trackPageCount = Math.max(
    1,
    Math.ceil(filteredTracksSorted.length / catalogPageSize),
  );
  const safeTrackPage = Math.min(trackPage, trackPageCount);
  const trackPageRows = filteredTracksSorted.slice(
    (safeTrackPage - 1) * catalogPageSize,
    safeTrackPage * catalogPageSize,
  );

  useLayoutEffect(() => {
    const scrollEl = catalogTableScrollRef.current;
    if (!scrollEl) return undefined;
    measureCatalogTableViewportSlots();
    const ro = new ResizeObserver(measureCatalogTableViewportSlots);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [
    section,
    loading,
    loadingTracks,
    filteredSorted.length,
    filteredTracksSorted.length,
    measureCatalogTableViewportSlots,
  ]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    if (trackPage > trackPageCount) setTrackPage(trackPageCount);
  }, [trackPage, trackPageCount]);

  const toggleSort = (key) => {
    setPage(1);
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const toggleTrackSort = (key) => {
    setTrackPage(1);
    if (trackSortKey !== key) {
      setTrackSortKey(key);
      setTrackSortDir("asc");
    } else {
      setTrackSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const headingTitle = section === "artists" ? "Исполнители" : "Треки";

  return (
    <div className={login.mainLogin}>
      {errorMessage ? (
        <div className={notice.errorBanner} role="alert">
          {errorMessage}
        </div>
      ) : null}
      {successMessage ? (
        <div className={notice.successBanner} role="status">
          {successMessage}
        </div>
      ) : null}
      <div className={style.pageShell}>
        <Header />
        <div className={style.main}>
          <div className={pageStyle.titleBlock}>
            <div
              className={pageStyle.sectionToggleRow}
              role="tablist"
              aria-label="Раздел каталога"
            >
              <div className={artistUiStyle.bottomRow}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === "artists"}
                  className={
                    section === "artists"
                      ? artistUiStyle.btnPrimary
                      : artistUiStyle.btnOutline
                  }
                  onClick={() => {
                    setSection("artists");
                    setPage(1);
                  }}
                >
                  Исполнители
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === "tracks"}
                  className={
                    section === "tracks"
                      ? artistUiStyle.btnPrimary
                      : artistUiStyle.btnOutline
                  }
                  onClick={() => {
                    setSection("tracks");
                    setTrackPage(1);
                  }}
                >
                  Треки
                </button>
              </div>
            </div>
            <div className={style.titleWrap}>
              <h1>{headingTitle}</h1>
            </div>
          </div>

          <div className={style.venues}>
            <div className={style.venuesToolbar}>
              <div className={style.search}>
                <img src={search} alt="" />
                <input
                  type="text"
                  placeholder={
                    section === "artists"
                      ? "Найти исполнителя"
                      : "Найти трек или файл"
                  }
                  className={style.searchInput}
                  value={section === "artists" ? searchQuery : trackSearch}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (section === "artists") {
                      setSearchQuery(v);
                      setPage(1);
                    } else {
                      setTrackSearch(v);
                      setTrackPage(1);
                    }
                  }}
                />
              </div>
              <div className={pageStyle.actions}>
                {section === "artists" ? (
                  <button
                    type="button"
                    className={pageStyle.addBtn}
                    onClick={() => navigate("/admin/artists/add")}
                  >
                    Добавить
                  </button>
                ) : (
                  <button
                    type="button"
                    className={pageStyle.addBtn}
                    onClick={openQuickTrackModal}
                  >
                    Добавить
                  </button>
                )}
              </div>
            </div>

            {section === "artists" ? (
              <div className={`${style.tableCard} ${pageStyle.tableCard}`}>
                <div ref={catalogTableScrollRef} className={style.tableScroll}>
                  <table className={`${style.venuesTable} ${pageStyle.table}`}>
                    <thead>
                      <tr>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleSort("id")}
                          >
                            ID
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleSort("name")}
                          >
                            Имя
                          </button>
                        </th>
                        <th>Роль</th>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleSort("created")}
                          >
                            Создан
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleSort("updated")}
                          >
                            Изменен
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className={style.tableEmpty}>
                            Загрузка...
                          </td>
                        </tr>
                      ) : pageRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={style.tableEmpty}>
                            Исполнители не найдены
                          </td>
                        </tr>
                      ) : (
                        pageRows.map((row) => (
                          <tr
                            key={row.id}
                            data-catalog-row=""
                            className={pageStyle.clickRow}
                            tabIndex={0}
                            role="link"
                            onClick={() =>
                              navigate(`/admin/artists/add?id=${row.id}`)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                navigate(`/admin/artists/add?id=${row.id}`);
                              }
                            }}
                          >
                            <td>{row.id}</td>
                            <td className={style.cellNameBold}>{row.name || "—"}</td>
                            <td className={pageStyle.roleCell}>
                              {Array.isArray(row.roles) && row.roles.length > 0
                                ? row.roles.join("\n")
                                : "Исполнитель"}
                            </td>
                            <td>{formatDate(row.createdAt)}</td>
                            <td>{formatDate(row.updatedAt)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={style.pagination}>
                  <button
                    type="button"
                    className={style.pageNav}
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ◀
                  </button>
                  <span className={style.pageCurrent}>{safePage}</span>
                  <button
                    type="button"
                    className={style.pageNav}
                    disabled={safePage >= pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  >
                    ▶
                  </button>
                </div>
              </div>
            ) : (
              <div className={`${style.tableCard} ${pageStyle.tableCard}`}>
                <div ref={catalogTableScrollRef} className={style.tableScroll}>
                  <table className={`${style.venuesTable} ${pageStyle.table}`}>
                    <thead>
                      <tr>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleTrackSort("id")}
                          >
                            ID
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleTrackSort("name")}
                          >
                            Название
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleTrackSort("file")}
                          >
                            Файл
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleTrackSort("duration")}
                          >
                            Длительность
                          </button>
                        </th>
                        <th>
                          <button
                            type="button"
                            className={style.thSort}
                            onClick={() => toggleTrackSort("single")}
                          >
                            Тип
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTracks ? (
                        <tr>
                          <td colSpan={5} className={style.tableEmpty}>
                            Загрузка...
                          </td>
                        </tr>
                      ) : trackPageRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={style.tableEmpty}>
                            Треки не найдены
                          </td>
                        </tr>
                      ) : (
                        trackPageRows.map((row) => (
                          <tr
                            key={row.id}
                            data-catalog-row=""
                            className={`${pageStyle.clickRow} ${
                              tracksTablePlayingId === row.id
                                ? pageStyle.trackRowPlaying
                                : ""
                            } ${
                              tracksTablePlayLoadingId === row.id
                                ? pageStyle.trackRowLoading
                                : ""
                            }`}
                            tabIndex={0}
                            role="button"
                            aria-label={`Прослушать: ${String(row.name || "").trim() || `трек ${row.id}`}`}
                            onClick={() => void toggleTracksTablePlay(row)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                void toggleTracksTablePlay(row);
                              }
                            }}
                          >
                            <td>{row.id}</td>
                            <td className={style.cellNameBold}>{row.name || "—"}</td>
                            <td className={pageStyle.trackFileCell}>
                              {row.originalFileName || "—"}
                            </td>
                            <td>{formatTrackDurationDot(row.durationSeconds)}</td>
                            <td>{row.single ? "Сингл" : "Альбом"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={style.pagination}>
                  <button
                    type="button"
                    className={style.pageNav}
                    disabled={safeTrackPage <= 1}
                    onClick={() => setTrackPage((p) => Math.max(1, p - 1))}
                  >
                    ◀
                  </button>
                  <span className={style.pageCurrent}>{safeTrackPage}</span>
                  <button
                    type="button"
                    className={style.pageNav}
                    disabled={safeTrackPage >= trackPageCount}
                    onClick={() =>
                      setTrackPage((p) => Math.min(trackPageCount, p + 1))
                    }
                  >
                    ▶
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {quickTrackModalOpen ? (
        <div
          className={artistUiStyle.trackModalBackdrop}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget || quickTrackSubmitting) return;
            setQuickTrackModalOpen(false);
            resetQuickTrackModal();
          }}
        >
          <div
            className={`${artistUiStyle.trackModalDialog} ${pageStyle.quickTrackModalDialog}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-track-modal-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="quick-track-modal-title"
              className={artistUiStyle.trackModalHeading}
            >
              Новый трек
            </h2>
            <div className={artistUiStyle.trackModalScroll}>
              <p className={pageStyle.quickTrackHint}>
                Те же поля, что при добавлении трека в профиле исполнителя. Для
                нового исполнителя заполните карточку и загрузите фото — как при
                первом сохранении на странице редактирования.
              </p>

              <input
                ref={quickArtistPhotoInputRef}
                type="file"
                accept="image/*"
                className={artistUiStyle.hiddenInput}
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !file.type.startsWith("image/")) return;
                  setQuickArtistPhotoFile(file);
                  setQuickArtistPhotoPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(file);
                  });
                }}
              />
              <input
                ref={quickAudioInputRef}
                type="file"
                accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac,.opus,.webm"
                className={artistUiStyle.hiddenInput}
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setQuickSuggestedAlbum("");
                  setQuickSuggestedArtist("");
                  pendingGenreHintsRef.current = [];
                  pendingArtistHintRef.current = "";
                  quickArtistFromFileAppliedRef.current = false;
                  setQuickAudioFile(file);
                  setQuickAudioPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    const inferredMime = audioMimeFromFileName(file.name);
                    const fileForPreview =
                      file.type && file.type.startsWith("audio/")
                        ? file
                        : new File([file], file.name, { type: inferredMime });
                    return URL.createObjectURL(fileForPreview);
                  });
                  setQuickTrackTitle((prev) =>
                    String(prev || "").trim()
                      ? prev
                      : titleFromAudioFileName(file.name),
                  );
                  void (async () => {
                    let embeddedOk = false;
                    try {
                      const tag = await readAudioTagsBrowser(file);
                      if (tag?.tags) {
                        const tags = tag.tags;
                        if (tags.title) {
                          const t = String(tags.title).trim();
                          if (t) {
                            setQuickTrackTitle(t);
                            embeddedOk = true;
                          }
                        }
                        const ar = tagArtistToString(tags.artist);
                        if (ar) {
                          pendingArtistHintRef.current = ar;
                          setQuickSuggestedArtist(ar);
                          embeddedOk = true;
                        }
                        const alb = tagAlbumToString(tags.album);
                        if (alb) {
                          setQuickSuggestedAlbum(alb);
                          embeddedOk = true;
                        }
                        if (tags.genre != null) {
                          const gRaw = tags.genre;
                          const rawCombined = Array.isArray(gRaw)
                            ? gRaw.map((x) => String(x)).join("/")
                            : String(gRaw);
                          appendPendingGenreHints(pendingGenreHintsRef, [
                            rawCombined,
                          ]);
                          embeddedOk = true;
                        }
                      }
                    } catch {
                      /* теги в браузере необязательны */
                    }
                    mergeHintsIntoQuickForm();

                    try {
                      const fdProbe = new FormData();
                      fdProbe.append("file", file);
                      const pr = await fetch(URL_TRACK_PROBE_METADATA, {
                        method: "POST",
                        headers: authHeaders(),
                        body: fdProbe,
                      });
                      if (pr.ok) {
                        const meta = await pr.json();
                        const probeTitle =
                          meta?.title != null ? String(meta.title).trim() : "";
                        if (probeTitle) {
                          setQuickTrackTitle(probeTitle);
                        }
                        appendPendingGenreHints(
                          pendingGenreHintsRef,
                          meta?.genres || [],
                        );
                        const ar =
                          meta?.artist != null
                            ? String(meta.artist).trim()
                            : "";
                        if (ar) {
                          pendingArtistHintRef.current = ar;
                          setQuickSuggestedArtist(ar);
                        }
                        const alb =
                          meta?.album != null ? String(meta.album).trim() : "";
                        if (alb) {
                          setQuickSuggestedAlbum(alb);
                        }
                        mergeHintsIntoQuickForm();
                      } else if (!embeddedOk) {
                        const hint = await pr.text().catch(() => "");
                        setErrorMessage(
                          hint.trim() ||
                            "Не удалось прочитать метаданные на сервере (нужен ffprobe в PATH).",
                        );
                      }
                    } catch {
                      if (!embeddedOk) {
                        setErrorMessage(
                          "Нет ответа сервера для метаданных; проверьте сеть и gateway.",
                        );
                      }
                    }
                  })();
                }}
              />
              <input
                ref={quickCoverInputRef}
                type="file"
                accept="image/*"
                className={artistUiStyle.hiddenInput}
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file || !file.type.startsWith("image/")) return;
                  setQuickCoverFile(file);
                  setQuickTrackCoverPreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(file);
                  });
                }}
              />

              <h3 className={pageStyle.quickTrackSectionTitle}>Исполнитель</h3>

              <label
                className={`${artistUiStyle.trackModalGenreOption} ${pageStyle.quickTrackChoiceWrap}`}
              >
                <input
                  type="checkbox"
                  checked={quickNewArtist}
                  disabled={quickTrackSubmitting}
                  onChange={(e) => {
                    quickArtistFromFileAppliedRef.current = true;
                    const v = e.target.checked;
                    setQuickNewArtist(v);
                    if (v) {
                      setQuickExistingArtistId("");
                      setQuickNewArtistName((prev) => {
                        const hint = pendingArtistHintRef.current?.trim();
                        if (hint && !String(prev || "").trim()) return hint;
                        return prev;
                      });
                    } else {
                      setQuickNewArtistName("");
                      setQuickArtistDescription("");
                      setQuickArtistRoles(["Исполнитель"]);
                      setQuickArtistPhotoFile(null);
                      setQuickArtistPhotoPreviewUrl((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return "";
                      });
                      if (quickArtistPhotoInputRef.current) {
                        quickArtistPhotoInputRef.current.value = "";
                      }
                    }
                  }}
                />
                <span>Новый исполнитель</span>
              </label>

              {quickNewArtist ? (
                <>
                  <div className={artistUiStyle.trackModalField}>
                    <label
                      className={artistUiStyle.trackModalLabel}
                      htmlFor="quick-artist-name"
                    >
                      Имя
                    </label>
                    <input
                      id="quick-artist-name"
                      type="text"
                      className={artistUiStyle.trackModalInput}
                      value={quickNewArtistName}
                      onChange={(e) => setQuickNewArtistName(e.target.value)}
                      placeholder="Имя"
                      disabled={quickTrackSubmitting}
                      autoComplete="off"
                    />
                  </div>
                  <div className={artistUiStyle.trackModalField}>
                    <span className={artistUiStyle.trackModalLabel}>Роли</span>
                    <div
                      className={artistUiStyle.trackModalGenreList}
                      role="group"
                      aria-label="Роли исполнителя"
                    >
                      {ARTIST_ROLE_OPTIONS.map((option) => (
                        <label
                          key={option}
                          className={artistUiStyle.trackModalGenreOption}
                        >
                          <input
                            type="checkbox"
                            checked={quickArtistRoles.includes(option)}
                            onChange={() => toggleQuickArtistRole(option)}
                            disabled={quickTrackSubmitting}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className={artistUiStyle.trackModalField}>
                    <label
                      className={artistUiStyle.trackModalLabel}
                      htmlFor="quick-artist-desc"
                    >
                      Описание
                    </label>
                    <textarea
                      id="quick-artist-desc"
                      className={`${artistUiStyle.trackModalInput} ${pageStyle.quickTrackTextarea}`}
                      value={quickArtistDescription}
                      onChange={(e) =>
                        setQuickArtistDescription(e.target.value)
                      }
                      placeholder="Описание"
                      spellCheck="false"
                      disabled={quickTrackSubmitting}
                      rows={4}
                    />
                  </div>
                  <div className={artistUiStyle.trackModalField}>
                    <span className={artistUiStyle.trackModalLabel}>
                      Фотография исполнителя
                    </span>
                    <div className={artistUiStyle.trackModalCoverRow}>
                      <button
                        type="button"
                        className={artistUiStyle.trackModalCoverBtn}
                        disabled={quickTrackSubmitting}
                        onClick={() =>
                          quickArtistPhotoInputRef.current?.click()
                        }
                        aria-label="Фотография исполнителя"
                      >
                        {quickArtistPhotoPreviewUrl ? (
                          <img
                            src={quickArtistPhotoPreviewUrl}
                            alt=""
                            className={artistUiStyle.trackModalCoverImg}
                          />
                        ) : (
                          <span
                            className={artistUiStyle.trackModalCoverPlus}
                            aria-hidden
                          >
                            +
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={artistUiStyle.trackModalField}>
                  <label
                    className={artistUiStyle.trackModalLabel}
                    htmlFor="quick-artist-select"
                  >
                    Исполнитель
                  </label>
                  <select
                    id="quick-artist-select"
                    className={artistUiStyle.trackModalSelect}
                    value={quickExistingArtistId}
                    onChange={(e) => setQuickExistingArtistId(e.target.value)}
                    disabled={
                      quickTrackSubmitting || quickModalArtistsLoading
                    }
                  >
                    <option value="">
                      {quickModalArtistsLoading
                        ? "Загрузка списка…"
                        : "Выберите исполнителя"}
                    </option>
                    {quickModalArtists.map((a) => (
                      <option key={a.id} value={String(a.id)}>
                        {String(a.name || "").trim() || `ID ${a.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {quickSuggestedArtist.trim() ? (
                <p className={artistUiStyle.trackModalTagHint}>
                  Из файла — исполнитель: {quickSuggestedArtist}
                </p>
              ) : null}

              <h3 className={pageStyle.quickTrackSectionTitle}>Трек</h3>

              <div className={artistUiStyle.trackModalField}>
                <span className={artistUiStyle.trackModalLabel}>
                  Аудиофайл
                </span>
                <button
                  type="button"
                  className={artistUiStyle.trackModalPickAudio}
                  disabled={quickTrackSubmitting}
                  onClick={() => quickAudioInputRef.current?.click()}
                >
                  {quickAudioFile ? "Заменить файл" : "Выбрать файл"}
                </button>
                {quickAudioFile ? (
                  <p className={artistUiStyle.trackModalFileName}>
                    {quickAudioFile.name}
                  </p>
                ) : null}
              </div>

              {quickAudioPreviewUrl && quickAudioFile ? (
                <div className={artistUiStyle.trackModalField}>
                  <audio
                    key={quickAudioPreviewUrl}
                    className={artistUiStyle.trackModalPlayer}
                    controls
                    src={quickAudioPreviewUrl}
                    playsInline
                  />
                </div>
              ) : null}

              <div className={artistUiStyle.trackModalField}>
                <label
                  className={artistUiStyle.trackModalLabel}
                  htmlFor="quick-track-title"
                >
                  Название трека
                </label>
                <input
                  id="quick-track-title"
                  type="text"
                  className={artistUiStyle.trackModalInput}
                  value={quickTrackTitle}
                  onChange={(e) => setQuickTrackTitle(e.target.value)}
                  placeholder="Название"
                  disabled={quickTrackSubmitting}
                  autoComplete="off"
                />
                {quickSuggestedAlbum.trim() ? (
                  <p className={artistUiStyle.trackModalTagHint}>
                    Из файла — альбом: {quickSuggestedAlbum}
                  </p>
                ) : null}
              </div>

              <div className={artistUiStyle.trackModalField}>
                <span className={artistUiStyle.trackModalLabel}>Жанры</span>
                {catalogGenres.length > 0 ? (
                  <input
                    type="search"
                    className={artistUiStyle.trackModalGenreSearchInput}
                    value={quickGenreSearch}
                    onChange={(e) => setQuickGenreSearch(e.target.value)}
                    placeholder="Поиск по жанрам"
                    autoComplete="off"
                    disabled={quickTrackSubmitting || genreCreating}
                    aria-label="Поиск по жанрам"
                  />
                ) : null}
                <div
                  className={artistUiStyle.trackModalGenreList}
                  role="group"
                  aria-label="Жанры трека"
                >
                  {catalogGenres.length === 0 ? (
                    <p className={artistUiStyle.trackModalGenreEmpty}>
                      Каталог пуст — добавьте жанр ниже.
                    </p>
                  ) : quickModalFilteredGenres.length === 0 ? (
                    <p className={artistUiStyle.trackModalGenreEmpty}>
                      Ничего не найдено
                    </p>
                  ) : (
                    quickModalFilteredGenres.map((g) => {
                      const gid = Number(g.id);
                      const checked =
                        Number.isFinite(gid) &&
                        quickGenreIds.includes(gid);
                      return (
                        <label
                          key={g.id}
                          className={artistUiStyle.trackModalGenreOption}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleQuickGenre(gid)}
                            disabled={quickTrackSubmitting || genreCreating}
                          />
                          <span>{g.name || `Жанр #${g.id}`}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                <div className={artistUiStyle.trackModalGenreAddRow}>
                  <input
                    type="text"
                    className={artistUiStyle.trackModalGenreAddInput}
                    value={quickNewGenreName}
                    onChange={(e) => setQuickNewGenreName(e.target.value)}
                    placeholder="Новый жанр"
                    autoComplete="off"
                    disabled={quickTrackSubmitting || genreCreating}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void createQuickGenreFromModal();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={artistUiStyle.trackModalGenreAddBtn}
                    onClick={() => void createQuickGenreFromModal()}
                    disabled={
                      quickTrackSubmitting ||
                      genreCreating ||
                      !String(quickNewGenreName || "").trim()
                    }
                  >
                    {genreCreating ? "…" : "Добавить"}
                  </button>
                </div>
              </div>

              <div className={artistUiStyle.trackModalField}>
                <span className={artistUiStyle.trackModalLabel}>
                  Обложка трека
                </span>
                <div className={artistUiStyle.trackModalCoverRow}>
                  <button
                    type="button"
                    className={artistUiStyle.trackModalCoverBtn}
                    disabled={quickTrackSubmitting}
                    onClick={() => quickCoverInputRef.current?.click()}
                    aria-label="Обложка трека"
                  >
                    {quickTrackCoverPreviewUrl ? (
                      <img
                        src={quickTrackCoverPreviewUrl}
                        alt=""
                        className={artistUiStyle.trackModalCoverImg}
                      />
                    ) : (
                      <span
                        className={artistUiStyle.trackModalCoverPlus}
                        aria-hidden
                      >
                        +
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={artistUiStyle.trackModalActions}>
              <button
                type="button"
                className={artistUiStyle.trackModalCancel}
                disabled={quickTrackSubmitting}
                onClick={() => {
                  if (quickTrackSubmitting) return;
                  setQuickTrackModalOpen(false);
                  resetQuickTrackModal();
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className={artistUiStyle.trackModalSave}
                disabled={quickTrackSubmitting}
                onClick={() => void submitQuickTrack()}
              >
                {quickTrackSubmitting ? "Сохранение…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {section === "tracks" && tracksTableAudioUrl ? (
        <AudioPlayer
          src={tracksTableAudioUrl}
          title={tracksTablePlayingTitle || "Трек"}
          artist={formatTrackCatalogArtistLine(
            tracks.find(
              (t) => Number(t?.id) === Number(tracksTablePlayingId),
            ),
          )}
          coverSrc={tracksTableCoverUrl || ""}
          adminMode
          onClose={() => {
            closeTracksTablePlayer();
          }}
        />
      ) : null}
    </div>
  );
};

export default AdminArtists;
