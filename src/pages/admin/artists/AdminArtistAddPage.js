import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import jsmediatags from "jsmediatags/dist/jsmediatags.min.js";

import style from "../venues/VenueAdmin.module.css";
import pageStyle from "./AdminArtistAddPage.module.css";
import login from "../../auth/admin/adminAuth.module.css";
import notice from "../../auth/listener/login.module.css";
import AudioPlayer from "../../../Component/AudioPlayer/AudioPlayer";

import Header from "../../../Component/headerAdmin/HeaderAdmin";
import {
  appendGenreHintsArrayToFormData,
  appendPendingGenreHints,
  genreTokensFromRaw,
  matchCatalogGenreIdsFromStrings,
  mergeGenreIdsWithEnvFallback,
} from "./adminGenreCatalogMatch.js";
import returnPage from "../../../icons/return.png";
import chevronDown from "../../../icons/down.png";
import correctIcon from "../../../icons/correct.png";

const API_GATEWAY = "http://localhost:8080";
const URL_ARTIST_CREATE = `${API_GATEWAY}/space/media/artist/create`;
const URL_ADD_IMAGE = `${API_GATEWAY}/space/media/addImage`;
const urlArtistUpdate = (id) => `${API_GATEWAY}/space/media/artist/${id}`;
const urlDeleteImage = (imageId) =>
  `${API_GATEWAY}/space/media/image/${imageId}`;
const urlArtistGet = (id) => `${API_GATEWAY}/space/media/artist/${id}`;
const urlGetImage = (imageId) => `${API_GATEWAY}/space/media/image/${imageId}`;
const urlTrackForArtist = (artistId) =>
  `${API_GATEWAY}/space/media/track/for-artist/${artistId}`;
const urlTrackProbeMetadata = `${API_GATEWAY}/space/media/track/probe-metadata`;
const urlTracksByArtist = (artistId) =>
  `${API_GATEWAY}/space/media/track/by-artist/${artistId}`;
const urlTrackAudio = (trackId) =>
  `${API_GATEWAY}/space/media/track/${trackId}/audio`;
const urlTrackDelete = (trackId, artistId) =>
  `${API_GATEWAY}/space/media/track/${trackId}?artistId=${encodeURIComponent(
    artistId,
  )}`;
const urlTrackDeleteFinal = (trackId, artistId) =>
  `${API_GATEWAY}/space/media/track/${trackId}/final?artistId=${encodeURIComponent(
    artistId,
  )}`;
const urlTrackRestore = (trackId, artistId) =>
  `${API_GATEWAY}/space/media/track/${trackId}/restore?artistId=${encodeURIComponent(
    artistId,
  )}`;
const urlTrackPatchGenres = (trackId, artistId) =>
  `${API_GATEWAY}/space/media/track/${trackId}/genres?artistId=${encodeURIComponent(
    String(artistId),
  )}`;
const urlAlbumForArtist = (artistId) =>
  `${API_GATEWAY}/space/media/album/for-artist/${artistId}`;
const urlAlbumsByArtist = (artistId) =>
  `${API_GATEWAY}/space/media/album/by-artist/${artistId}`;
const urlAlbumAttachTrack = (albumId, artistId, trackId) =>
  `${API_GATEWAY}/space/media/album/${albumId}/tracks?artistId=${encodeURIComponent(
    String(artistId),
  )}&trackId=${encodeURIComponent(String(trackId))}`;
const urlAlbumPatch = (albumId, artistId) =>
  `${API_GATEWAY}/space/media/album/${albumId}?artistId=${encodeURIComponent(
    String(artistId),
  )}`;
const urlAlbumDelete = (albumId, artistId) =>
  `${API_GATEWAY}/space/media/album/${albumId}?artistId=${encodeURIComponent(
    String(artistId),
  )}`;
const urlAlbumRestore = (albumId, artistId) =>
  `${API_GATEWAY}/space/media/album/${albumId}/restore?artistId=${encodeURIComponent(
    String(artistId),
  )}`;
const urlAlbumDeleteFinal = (albumId, artistId) =>
  `${API_GATEWAY}/space/media/album/${albumId}/final?artistId=${encodeURIComponent(
    String(artistId),
  )}`;
const urlGenresAll = `${API_GATEWAY}/space/media/genre/all`;
const urlGenreCreate = `${API_GATEWAY}/space/media/genre/create`;

const DESCRIPTION_PAGE_CHARS = 520;
const ARTIST_ROLE_OPTIONS = ["Исполнитель", "Композитор", "DJ", "Продюсер", "Инструменталист", "Автор"];

function descriptionPageCount(text) {
  const len = String(text || "").length;
  if (len === 0) return 1;
  return Math.ceil(len / DESCRIPTION_PAGE_CHARS);
}

function descriptionSliceRange(text, page1Based) {
  const s = String(text || "");
  const len = s.length;
  if (len === 0) return [0, 0];
  const start = (page1Based - 1) * DESCRIPTION_PAGE_CHARS;
  const end = Math.min(start + DESCRIPTION_PAGE_CHARS, len);
  return [start, end];
}

/** Склонение «N трек(ов)» для русского. */
function formatTrackCountRu(n) {
  const k = Math.abs(n) % 100;
  const k1 = k % 10;
  if (k > 10 && k < 20) return `${n} треков`;
  if (k1 > 1 && k1 < 5) return `${n} трека`;
  if (k1 === 1) return `${n} трек`;
  return `${n} треков`;
}

/** Имя альбома в списке хранится как «Название (ГГГГ)» — для карточки разбираем отображение. */
function parseSavedAlbumListName(raw) {
  const s = String(raw || "").trim();
  const m = s.match(/^(.*)\s+\((\d{4})\)\s*$/);
  if (m) {
    const title = m[1].trim();
    return { title: title || "—", year: m[2] };
  }
  return { title: s || "—", year: null };
}

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

function genreIdsFromTrack(track) {
  if (!track || typeof track !== "object") return [];
  if (Array.isArray(track.genreIds) && track.genreIds.length > 0)
    return track.genreIds;
  if (track.genreId != null) return [track.genreId];
  return [];
}

function isSingleTrack(track) {
  if (track?.single != null) return Boolean(track.single);
  if (track?.isSingle != null) return Boolean(track.isSingle);
  return true;
}

/** Очередь синглов в порядке списка на вкладке «Синглы». */
function buildSinglesPlaybackQueue(artistTracks) {
  return artistTracks.filter((t) => !t.deleted && isSingleTrack(t));
}

/** Все треки всех альбомов подряд: альбомы по порядку, треки 1, 2, 3… */
function buildAlbumsFlattenPlaybackQueue(artistAlbums, artistTracks) {
  const albums = artistAlbums.filter((a) => !a.deleted);
  const q = [];
  for (const album of albums) {
    const tracks = (album.tracks || []).filter((tr) => !tr.deleted);
    for (const t of tracks) {
      const merged =
        artistTracks.find((at) => Number(at?.id) === Number(t?.id)) || t;
      q.push(merged);
    }
  }
  return q;
}

function appendGenreIdsArrayToFormData(fd, genreIds) {
  for (const gid of normalizeGenreIdList(genreIds)) {
    fd.append("genreIds", String(gid));
  }
}

/** MIME для воспроизведения, если сервер или File не задают тип. */
function audioMimeFromFileName(name) {
  const lower = String(name || "").toLowerCase();
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".opus")) return "audio/opus";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
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

/** Как на макете: «3.51» = минуты.секунды (две цифры секунд). */
function formatTrackDurationDot(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  if (s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}.${String(sec).padStart(2, "0")}`;
}

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

function normalizeArtistRoles(list) {
  const unique = new Set();
  for (const raw of Array.isArray(list) ? list : []) {
    const role = String(raw || "").trim();
    if (role) unique.add(role);
  }
  return Array.from(unique);
}

function getTrackDurationSeconds(track) {
  const d1 = Number(track?.durationSeconds);
  if (Number.isFinite(d1) && d1 >= 0) return d1;
  const d2 = Number(track?.duration);
  if (Number.isFinite(d2) && d2 >= 0) return d2;
  return 0;
}

function normalizeEmbeddedImageMime(format) {
  const f = String(format || "").trim().toLowerCase();
  if (!f) return "image/jpeg";
  if (f === "jpg" || f === "jpeg" || f.endsWith("/jpg")) return "image/jpeg";
  if (f === "png" || f.endsWith("/png")) return "image/png";
  if (f.startsWith("image/")) return f;
  return "image/jpeg";
}

const AdminArtistAddPage = () => {
  const [searchParams] = useSearchParams();

  const artistsListReturnTo = useMemo(() => {
    const raw = searchParams.get("fromPage");
    const n =
      raw != null && String(raw).trim() !== ""
        ? parseInt(raw, 10)
        : NaN;
    if (Number.isFinite(n) && n >= 1) {
      return n <= 1 ? "/admin/artists" : `/admin/artists?page=${n}`;
    }
    return "/admin/artists";
  }, [searchParams]);
  const fileInputRef = useRef(null);
  const albumCoverInputRef = useRef(null);
  const savedAlbumCoverInputRef = useRef(null);
  const savedAlbumCoverPickAlbumIdRef = useRef(null);
  const trackAudioInputRef = useRef(null);
  const trackModalCoverInputRef = useRef(null);
  const lastSavedRef = useRef(null);
  const createInflightRef = useRef(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState([]);
  const [rolesDropdownOpen, setRolesDropdownOpen] = useState(false);
  const rolesDropdownRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [coverImageId, setCoverImageId] = useState(null);
  const [artistId, setArtistId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [highlightRequired, setHighlightRequired] = useState(false);
  const [descPage, setDescPage] = useState(1);
  /** Вкладка списка: альбомы или треки (альбомы по умолчанию). */
  const [mediaTab, setMediaTab] = useState("albums");
  /** Панель «Добавить» (альбом или трек). */
  const [showAddMediaPanel, setShowAddMediaPanel] = useState(false);
  const [draftAlbumTitle, setDraftAlbumTitle] = useState("");
  const [draftAlbumYear, setDraftAlbumYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [draftAlbumYearInput, setDraftAlbumYearInput] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [draftAlbumTrackCount, setDraftAlbumTrackCount] = useState(0);
  const [draftAlbumTracks, setDraftAlbumTracks] = useState([]);
  const [draftAlbumCoverFile, setDraftAlbumCoverFile] = useState(null);
  const [draftAlbumPreviewUrl, setDraftAlbumPreviewUrl] = useState("");
  const [albumDraftSaving, setAlbumDraftSaving] = useState(false);
  const [loadingArtist, setLoadingArtist] = useState(false);
  const [artistTracks, setArtistTracks] = useState([]);
  const [artistAlbums, setArtistAlbums] = useState([]);
  const [albumCoverBlobUrls, setAlbumCoverBlobUrls] = useState({});
  const [savedAlbumYearDraft, setSavedAlbumYearDraft] = useState({});
  /** Черновик названия альбома (без суффикса « (ГГГГ)»), по id альбома. */
  const [savedAlbumTitleDraft, setSavedAlbumTitleDraft] = useState({});
  const [savedAlbumYearSavingId, setSavedAlbumYearSavingId] = useState(null);
  const [savedAlbumCoverSavingId, setSavedAlbumCoverSavingId] =
    useState(null);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackModalAudioFile, setTrackModalAudioFile] = useState(null);
  const [trackModalAudioUrl, setTrackModalAudioUrl] = useState("");
  const [trackModalTitle, setTrackModalTitle] = useState("");
  const [trackModalCoverFile, setTrackModalCoverFile] = useState(null);
  const [trackModalCoverPreviewUrl, setTrackModalCoverPreviewUrl] =
    useState("");
  const [trackModalSaving, setTrackModalSaving] = useState(false);
  const [trackModalContext, setTrackModalContext] = useState("artistTracks");
  const [savedAlbumModalTarget, setSavedAlbumModalTarget] = useState(null);
  const [catalogGenres, setCatalogGenres] = useState([]);
  const [trackModalGenreIds, setTrackModalGenreIds] = useState([]);
  const [genreEditTarget, setGenreEditTarget] = useState(null);
  const [newGenreName, setNewGenreName] = useState("");
  const [genreCreating, setGenreCreating] = useState(false);
  const [trackModalGenreSearch, setTrackModalGenreSearch] = useState("");
  const [trackModalTagAlbum, setTrackModalTagAlbum] = useState("");
  const [trackRowMenuKey, setTrackRowMenuKey] = useState(null);
  const trackRowMenuRef = useRef(null);
  const [listPlayingId, setListPlayingId] = useState(null);
  const [listAudioUrl, setListAudioUrl] = useState(null);
  const [listPlayLoadingId, setListPlayLoadingId] = useState(null);
  const [listPlayingTitle, setListPlayingTitle] = useState("");
  const [listPlayingCoverUrl, setListPlayingCoverUrl] = useState("");
  const [listAudioPlaying, setListAudioPlaying] = useState(false);
  const [confirmDeleteTrack, setConfirmDeleteTrack] = useState(null);
  const [confirmDeleteAlbum, setConfirmDeleteAlbum] = useState(null);
  const [finalDeleteSubmitting, setFinalDeleteSubmitting] = useState(false);
  const draftTrackSeqRef = useRef(0);
  /** Обложка черновика альбома (object URL) — не отзывать как обложку плеера. */
  const draftAlbumCoverUrlRef = useRef("");
  /** Автопереход: { kind, tracks } или null. */
  const listPlaybackQueueRef = useRef(null);
  const listPlayingIdRef = useRef(null);
  const pendingTrackGenreHintsRef = useRef([]);

  useEffect(() => {
    draftAlbumCoverUrlRef.current = draftAlbumPreviewUrl || "";
  }, [draftAlbumPreviewUrl]);

  useEffect(() => {
    listPlayingIdRef.current = listPlayingId;
  }, [listPlayingId]);

  const revokeListCoverIfOwned = useCallback((url) => {
    if (!url) return;
    if (url === draftAlbumCoverUrlRef.current) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }, []);

  const trackModalFilteredGenres = useMemo(() => {
    const q = String(trackModalGenreSearch || "").trim().toLowerCase();
    if (!q) return catalogGenres;
    return catalogGenres.filter((g) =>
      String(g?.name || "").toLowerCase().includes(q),
    );
  }, [catalogGenres, trackModalGenreSearch]);

  const flushTrackModalGenreHints = useCallback(() => {
    const hints = pendingTrackGenreHintsRef.current;
    if (!hints.length) return;
    const ids = matchCatalogGenreIdsFromStrings(hints, catalogGenres);
    if (!ids.length) return;
    setTrackModalGenreIds((prev) => {
      const merged = new Set([
        ...normalizeGenreIdList(prev),
        ...ids,
      ]);
      return Array.from(merged).sort((a, b) => a - b);
    });
  }, [catalogGenres]);

  useEffect(() => {
    if (!trackModalOpen) return undefined;
    flushTrackModalGenreHints();
    return undefined;
  }, [catalogGenres, trackModalOpen, flushTrackModalGenreHints]);

  const descPageCount = useMemo(
    () => descriptionPageCount(description),
    [description],
  );

  useEffect(() => {
    setDescPage((p) => Math.min(Math.max(1, p), descPageCount));
  }, [descPageCount]);

  const [descStart, descEnd] = useMemo(
    () => descriptionSliceRange(description, descPage),
    [description, descPage],
  );

  const descPageValue = description.slice(descStart, descEnd);

  const onDescriptionChange = (e) => {
    const v = e.target.value;
    setDescription(
      description.slice(0, descStart) + v + description.slice(descEnd),
    );
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (draftAlbumPreviewUrl) URL.revokeObjectURL(draftAlbumPreviewUrl);
    };
  }, [draftAlbumPreviewUrl]);

  const resetAlbumDraftFields = useCallback(() => {
    const currentYear = new Date().getFullYear();
    setDraftAlbumTitle("");
    setDraftAlbumYear(currentYear);
    setDraftAlbumYearInput(String(currentYear));
    setDraftAlbumTrackCount(0);
    setDraftAlbumCoverFile(null);
    setDraftAlbumTracks((prev) => {
      prev.forEach((t) => {
        if (t?.audioUrl) URL.revokeObjectURL(t.audioUrl);
      });
      return [];
    });
    setDraftAlbumPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
  }, []);

  const commitAlbumYearInput = useCallback(() => {
    const raw = String(draftAlbumYearInput || "").trim();
    if (!raw) {
      const normalized = draftAlbumYear;
      setDraftAlbumYearInput(String(normalized));
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      setDraftAlbumYearInput(String(draftAlbumYear));
      return;
    }
    const normalized = Math.min(2100, Math.max(1900, Math.round(parsed)));
    setDraftAlbumYear(normalized);
    setDraftAlbumYearInput(String(normalized));
  }, [draftAlbumYearInput, draftAlbumYear]);

  const validateAlbumDraftRequired = useCallback(() => {
    const titleOk = Boolean(String(draftAlbumTitle || "").trim());
    const coverOk =
      Boolean(draftAlbumPreviewUrl) && draftAlbumCoverFile != null;
    const rawYear = String(draftAlbumYearInput || "").trim();
    const parsedYear = Number(rawYear);
    const yearOk =
      rawYear.length === 4 &&
      Number.isFinite(parsedYear) &&
      parsedYear >= 1900 &&
      parsedYear <= 2100;
    if (titleOk && coverOk && yearOk) return true;
    setErrorMessage("Заполните название, обложку и год альбома");
    return false;
  }, [draftAlbumTitle, draftAlbumPreviewUrl, draftAlbumYearInput, draftAlbumCoverFile]);

  const resetTrackModal = useCallback(() => {
    setTrackModalOpen(false);
    setTrackModalSaving(false);
    setTrackModalContext("artistTracks");
    setSavedAlbumModalTarget(null);
    setGenreEditTarget(null);
    setTrackModalGenreIds([]);
    setTrackModalGenreSearch("");
    setNewGenreName("");
    setGenreCreating(false);
    setTrackModalTagAlbum("");
    setTrackModalAudioFile(null);
    setTrackModalTitle("");
    setTrackModalCoverFile(null);
    setTrackModalAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setTrackModalCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    if (trackAudioInputRef.current) trackAudioInputRef.current.value = "";
    if (trackModalCoverInputRef.current) {
      trackModalCoverInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (showAddMediaPanel) return;
    resetAlbumDraftFields();
  }, [showAddMediaPanel, resetAlbumDraftFields]);

  const toggleAddMediaPanel = useCallback(() => {
    setShowAddMediaPanel((v) => !v);
  }, []);

  const pickAlbumCover = () => {
    albumCoverInputRef.current?.click();
  };

  const onAlbumCoverSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setDraftAlbumCoverFile(file);
    setDraftAlbumPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    if (!errorMessage) return undefined;
    const t = setTimeout(() => setErrorMessage(""), 3200);
    return () => clearTimeout(t);
  }, [errorMessage]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const t = setTimeout(() => setSuccessMessage(""), 4200);
    return () => clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    if (!rolesDropdownOpen) return undefined;
    const onDocMouseDown = (e) => {
      if (!rolesDropdownRef.current) return;
      if (!rolesDropdownRef.current.contains(e.target)) {
        setRolesDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [rolesDropdownOpen]);

  useEffect(() => {
    if (!trackRowMenuKey) return undefined;
    const onDocMouseDown = (e) => {
      if (trackRowMenuRef.current?.contains(e.target)) return;
      setTrackRowMenuKey(null);
    };
    window.addEventListener("mousedown", onDocMouseDown);
    return () => window.removeEventListener("mousedown", onDocMouseDown);
  }, [trackRowMenuKey]);

  const authHeaders = () => {
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(urlGenresAll, { headers });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        setCatalogGenres(Array.isArray(data) ? data : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshArtistAlbums = useCallback(async () => {
    if (!artistId) return;
    try {
      const albumsRes = await fetch(urlAlbumsByArtist(artistId), {
        headers: authHeaders(),
      });
      if (albumsRes.ok) {
        const ad = await albumsRes.json();
        setArtistAlbums(Array.isArray(ad) ? ad : []);
      }
    } catch {
      /* ignore */
    }
  }, [artistId]);

  const refreshArtistTracksAndAlbums = useCallback(async () => {
    if (!artistId) return;
    try {
      const [tRes, aRes] = await Promise.all([
        fetch(urlTracksByArtist(artistId), {
          headers: authHeaders(),
        }),
        fetch(urlAlbumsByArtist(artistId), {
          headers: authHeaders(),
        }),
      ]);
      if (tRes.ok) {
        const data = await tRes.json();
        const rows = Array.isArray(data) ? data : [];
        setArtistTracks(
          rows.map((t) => ({
            ...t,
            durationSeconds: getTrackDurationSeconds(t),
          })),
        );
      }
      if (aRes.ok) {
        const data = await aRes.json();
        setArtistAlbums(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, [artistId]);

  const commitSavedAlbumPatch = async (album) => {
    if (
      !artistId ||
      savedAlbumYearSavingId === album.id ||
      savedAlbumCoverSavingId === album.id
    ) {
      return;
    }
    const parsed = parseSavedAlbumListName(album.name);
    const committedTitle = String(parsed.title || "").trim();
    const fallbackYearStr =
      parsed.year != null ? parsed.year : String(new Date().getFullYear());

    const titleDraftRaw = savedAlbumTitleDraft[album.id];
    const titleCurrent =
      titleDraftRaw != null ? String(titleDraftRaw).trim() : committedTitle;

    const rawYearInput =
      savedAlbumYearDraft[album.id] != null
        ? savedAlbumYearDraft[album.id]
        : fallbackYearStr;
    const digits = String(rawYearInput).replace(/\D/g, "").slice(0, 4);

    const digitsCommitted = String(fallbackYearStr || "")
      .replace(/\D/g, "")
      .slice(0, 4);
    const draftYearStored = savedAlbumYearDraft[album.id];
    const digitsDraft =
      draftYearStored != null
        ? String(draftYearStored).replace(/\D/g, "").slice(0, 4)
        : digitsCommitted;

    const titleDirty =
      titleDraftRaw != null && titleCurrent !== committedTitle;
    const yearDirty =
      draftYearStored != null && digitsDraft !== digitsCommitted;

    if (!titleDirty && !yearDirty) return;

    if (!titleCurrent) {
      setErrorMessage("Укажите название альбома");
      return;
    }

    const body = {};
    if (titleDirty) body.title = titleCurrent;
    if (yearDirty) {
      if (digits.length !== 4) {
        setErrorMessage("Укажите год четырьмя цифрами");
        setSavedAlbumYearDraft((prev) => ({
          ...prev,
          [album.id]: fallbackYearStr,
        }));
        return;
      }
      body.year = parseInt(digits, 10);
    }

    setSavedAlbumYearSavingId(album.id);
    setErrorMessage("");
    try {
      const res = await fetch(urlAlbumPatch(album.id, artistId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setErrorMessage(errText || "Не удалось сохранить изменения");
        return;
      }
      setSavedAlbumYearDraft((prev) => {
        const next = { ...prev };
        delete next[album.id];
        return next;
      });
      setSavedAlbumTitleDraft((prev) => {
        const next = { ...prev };
        delete next[album.id];
        return next;
      });
      await refreshArtistAlbums();
      setSuccessMessage(
        titleDirty && yearDirty
          ? "Альбом обновлён"
          : titleDirty
            ? "Название альбома обновлено"
            : "Год альбома обновлён",
      );
    } catch {
      setErrorMessage("Не удалось сохранить изменения");
    } finally {
      setSavedAlbumYearSavingId(null);
    }
  };

  const revertSavedAlbumDraft = useCallback((albumId) => {
    setSavedAlbumYearDraft((prev) => {
      if (prev[albumId] == null) return prev;
      const next = { ...prev };
      delete next[albumId];
      return next;
    });
    setSavedAlbumTitleDraft((prev) => {
      if (prev[albumId] == null) return prev;
      const next = { ...prev };
      delete next[albumId];
      return next;
    });
  }, []);

  const editIdParam = searchParams.get("id");

  useEffect(() => {
    let cancelled = false;

    const resetEmpty = () => {
      setArtistId(null);
      setName("");
      setDescription("");
      setRoles([]);
      setRolesDropdownOpen(false);
      setPhotoFile(null);
      setCoverImageId(null);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setDescPage(1);
      lastSavedRef.current = null;
      createInflightRef.current = null;
      setHighlightRequired(false);
      setShowAddMediaPanel(false);
      resetAlbumDraftFields();
      resetTrackModal();
      setArtistTracks([]);
      setArtistAlbums([]);
      setSavedAlbumYearDraft({});
      setSavedAlbumTitleDraft({});
      setSavedAlbumYearSavingId(null);
      setSavedAlbumCoverSavingId(null);
    };

    const parsed =
      editIdParam != null && editIdParam !== "" ? Number(editIdParam) : NaN;

    if (!Number.isFinite(parsed) || parsed <= 0) {
      resetEmpty();
      setLoadingArtist(false);
      return () => {
        cancelled = true;
      };
    }

    setLoadingArtist(true);
    setErrorMessage("");

    (async () => {
      try {
        const res = await fetch(urlArtistGet(parsed), {
          headers: authHeaders(),
        });
        if (cancelled) return;
        if (!res.ok) {
          setErrorMessage("Не удалось загрузить исполнителя");
          resetEmpty();
          return;
        }
        const data = await res.json();
        const aid = data?.id != null ? Number(data.id) : null;
        const cidRaw = data?.idCover != null ? Number(data.idCover) : null;
        const cid = Number.isFinite(cidRaw) && cidRaw > 0 ? cidRaw : null;
        const rolesRaw = Array.isArray(data?.roles) ? data.roles : [];
        const rolesNorm = rolesRaw
          .map((r) => String(r || "").trim())
          .filter((r) => r.length > 0);

        setArtistId(Number.isFinite(aid) ? aid : null);
        setName(String(data?.name ?? ""));
        setDescription(
          data?.description != null ? String(data.description) : "",
        );
        setRoles(rolesNorm);
        setCoverImageId(cid);
        setPhotoFile(null);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return "";
        });

        if (cid != null) {
          const ir = await fetch(urlGetImage(cid), { headers: authHeaders() });
          if (cancelled) return;
          if (ir.ok) {
            const blob = await ir.blob();
            if (cancelled) return;
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
          }
        }

        lastSavedRef.current = {
          name: String(data?.name ?? "").trim(),
          description:
            data?.description != null ? String(data.description) : "",
          roles: [...rolesNorm].sort(),
          coverImageId: cid,
        };
      } catch {
        if (!cancelled) {
          setErrorMessage("Не удалось загрузить исполнителя");
          resetEmpty();
        }
      } finally {
        if (!cancelled) setLoadingArtist(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editIdParam, resetAlbumDraftFields, resetTrackModal]);

  const pickPhoto = () => {
    fileInputRef.current?.click();
  };

  const onPhotoSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setPhotoFile(file);
    setHighlightRequired(false);
  };

  const uploadImageFile = async (file) => {
    const ownerRaw = localStorage.getItem("userId");
    const ownerId = Number(ownerRaw);
    if (!Number.isFinite(ownerId)) {
      setErrorMessage("Не удалось определить пользователя. Войдите снова.");
      return null;
    }
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

  const pickSavedAlbumCover = useCallback((albumId) => {
    if (
      !artistId ||
      saving ||
      loadingArtist ||
      albumDraftSaving ||
      savedAlbumCoverSavingId != null
    ) {
      return;
    }
    savedAlbumCoverPickAlbumIdRef.current = albumId;
    savedAlbumCoverInputRef.current?.click();
  }, [
    artistId,
    saving,
    loadingArtist,
    albumDraftSaving,
    savedAlbumCoverSavingId,
  ]);

  const onSavedAlbumCoverFileSelected = async (e) => {
    const albumId = savedAlbumCoverPickAlbumIdRef.current;
    savedAlbumCoverPickAlbumIdRef.current = null;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (albumId == null || !file || !file.type.startsWith("image/")) return;
    const aid = artistId;
    if (!aid) return;
    setErrorMessage("");
    setSavedAlbumCoverSavingId(albumId);
    try {
      const imageId = await uploadImageFile(file);
      if (imageId == null) {
        setErrorMessage("Не удалось загрузить изображение");
        return;
      }
      const res = await fetch(urlAlbumPatch(albumId, aid), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ idCover: imageId }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setErrorMessage(errText || "Не удалось обновить обложку альбома");
        return;
      }
      setSuccessMessage("Обложка альбома обновлена");
      await refreshArtistAlbums();
    } catch {
      setErrorMessage("Не удалось обновить обложку альбома");
    } finally {
      setSavedAlbumCoverSavingId(null);
    }
  };

  const readAudioTags = (file) =>
    new Promise((resolve) => {
      jsmediatags.read(file, {
        onSuccess: (tag) => resolve(tag),
        onError: () => resolve(null),
      });
    });

  const applyEmbeddedTags = async (file, opts = {}) => {
    const { skipEmbeddedCover = false } = opts;
    const tag = await readAudioTags(file);
    if (!tag) return;
    const tags = tag.tags || {};
    if (tags.title) {
      const t = String(tags.title).trim();
      if (t) setTrackModalTitle(t);
    }
    if (tags.genre != null) {
      const gRaw = tags.genre;
      const rawCombined = Array.isArray(gRaw)
        ? gRaw.map((x) => String(x)).join("/")
        : String(gRaw);
      appendPendingGenreHints(pendingTrackGenreHintsRef, [rawCombined]);
      flushTrackModalGenreHints();
    }
    if (skipEmbeddedCover) return;
    const pic = tags.picture;
    if (!pic) return;
    const p = Array.isArray(pic) ? pic[0] : pic;
    if (!p || !p.data) return;
    try {
      const raw = p.data;
      const bytes =
        raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw);
      const mime = normalizeEmbeddedImageMime(p.format);
      const blob = new Blob([bytes], { type: mime });
      const ext = mime.includes("png")
        ? "png"
        : "jpg";
      const coverFile = new File([blob], `cover.${ext}`, { type: mime });
      setTrackModalCoverPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setTrackModalCoverFile(coverFile);
    } catch {
      /* embedded art optional */
    }
  };

  const onTrackAudioSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (trackModalContext === "editGenres") return;
    if (
      trackModalContext !== "albumDraft" &&
      trackModalContext !== "savedAlbum" &&
      !artistId
    ) {
      setErrorMessage("Сохраните исполнителя, чтобы добавить треки");
      return;
    }
    setErrorMessage("");
    pendingTrackGenreHintsRef.current = [];
    setTrackModalGenreIds([]);
    setTrackModalGenreSearch("");
    setTrackModalTagAlbum("");
    setNewGenreName("");
    setTrackModalCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setTrackModalCoverFile(null);
    setTrackModalAudioFile(file);
    const inferredMime = audioMimeFromFileName(file.name);
    const fileForPreview =
      file.type && file.type.startsWith("audio/")
        ? file
        : new File([file], file.name, { type: inferredMime });
    setTrackModalAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(fileForPreview);
    });
    const stem = file.name.replace(/\.[^/.]+$/, "");
    setTrackModalTitle(stem);
    setTrackModalOpen(true);
    await applyEmbeddedTags(file, {
      skipEmbeddedCover:
        trackModalContext === "albumDraft" || trackModalContext === "savedAlbum",
    });
    try {
      const fdProbe = new FormData();
      fdProbe.append("file", file);
      const pr = await fetch(urlTrackProbeMetadata, {
        method: "POST",
        headers: authHeaders(),
        body: fdProbe,
      });
      if (pr.ok) {
        const meta = await pr.json();
        const probeTitle =
          meta?.title != null ? String(meta.title).trim() : "";
        if (probeTitle) {
          setTrackModalTitle(probeTitle);
        }
        const probeGenres = Array.isArray(meta?.genres) ? meta.genres : [];
        appendPendingGenreHints(pendingTrackGenreHintsRef, probeGenres);
        flushTrackModalGenreHints();
        const alb = meta?.album != null ? String(meta.album).trim() : "";
        setTrackModalTagAlbum(alb);
      }
    } catch {
      /* ffprobe необязателен на сервере */
    }
  };

  const pickTrackModalCover = () => {
    trackModalCoverInputRef.current?.click();
  };

  const onTrackModalCoverSelected = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setTrackModalCoverFile(file);
    setTrackModalCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  };

  const createGenreFromModal = async () => {
    const nm = String(newGenreName || "").trim();
    if (!nm || genreCreating) return;
    setGenreCreating(true);
    setErrorMessage("");
    try {
      const res = await fetch(urlGenreCreate, {
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
        setTrackModalGenreIds((prev) =>
          [...new Set([...normalizeGenreIdList(prev), id])].sort((a, b) => a - b),
        );
      }
      setNewGenreName("");
      setSuccessMessage("Жанр добавлен");
    } catch {
      setErrorMessage("Не удалось создать жанр");
    } finally {
      setGenreCreating(false);
    }
  };

  const toggleTrackModalGenre = (genreId) => {
    const id = Number(genreId);
    if (!Number.isFinite(id) || id <= 0) return;
    setTrackModalGenreIds((prev) => {
      const norm = normalizeGenreIdList(prev);
      if (norm.includes(id)) return norm.filter((x) => x !== id);
      return [...norm, id].sort((a, b) => a - b);
    });
  };

  const saveTrackFromModal = async () => {
    if (trackModalContext === "editGenres") return;
    if (!trackModalAudioFile || trackModalSaving) return;
    const title = String(trackModalTitle || "").trim();
    if (!title) {
      setErrorMessage("Введите название трека");
      return;
    }
    if (trackModalContext === "albumDraft") {
      if (!validateAlbumDraftRequired()) return;
      const inferredMime = audioMimeFromFileName(trackModalAudioFile.name);
      const fileForPreview =
        trackModalAudioFile.type && trackModalAudioFile.type.startsWith("audio/")
          ? trackModalAudioFile
          : new File([trackModalAudioFile], trackModalAudioFile.name, {
              type: inferredMime,
            });
      const localAudioUrl = URL.createObjectURL(fileForPreview);
      const durSec = await readFileDurationSeconds(trackModalAudioFile);
      const localTrack = {
        id: `draft-track-${Date.now()}-${draftTrackSeqRef.current++}`,
        name: title,
        durationSeconds: durSec,
        deleted: false,
        audioUrl: localAudioUrl,
        audioFile: trackModalAudioFile,
        genreIds: normalizeGenreIdList(trackModalGenreIds),
        genreHints: genreTokensFromRaw([...pendingTrackGenreHintsRef.current]),
      };
      setDraftAlbumTracks((prev) => [...prev, localTrack]);
      setDraftAlbumTrackCount((c) => Math.min(999, c + 1));
      setSuccessMessage("Трек добавлен в альбом");
      setTrackModalSaving(false);
      setTrackModalAudioFile(null);
      setTrackModalTitle("");
      setTrackModalGenreIds([]);
      setTrackModalGenreSearch("");
      setTrackModalCoverFile(null);
      setTrackModalAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setTrackModalCoverPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      if (trackAudioInputRef.current) trackAudioInputRef.current.value = "";
      if (trackModalCoverInputRef.current) trackModalCoverInputRef.current.value = "";
      return;
    }
    if (trackModalContext === "savedAlbum") {
      const albId = Number(savedAlbumModalTarget?.id);
      const coverRaw = savedAlbumModalTarget?.idCover;
      const coverNum = Number(coverRaw);
      if (!artistId || !Number.isFinite(albId)) {
        setErrorMessage("Не удалось определить альбом");
        return;
      }
      setTrackModalSaving(true);
      setErrorMessage("");
      setSuccessMessage("");
      try {
        const idCover =
          Number.isFinite(coverNum) && coverNum > 0 ? coverNum : null;
        const ownerRaw = localStorage.getItem("userId");
        const ownerId = Number(ownerRaw);
        if (!Number.isFinite(ownerId)) {
          setErrorMessage("Не удалось определить пользователя. Войдите снова.");
          return;
        }
        const durSec = await readFileDurationSeconds(trackModalAudioFile);
        const fd = new FormData();
        fd.append("file", trackModalAudioFile);
        fd.append("name", title);
        fd.append("ownerId", String(ownerId));
        if (idCover != null) fd.append("idCover", String(idCover));
        if (durSec > 0) fd.append("durationSeconds", String(Math.round(durSec)));
        appendGenreIdsArrayToFormData(
          fd,
          mergeGenreIdsWithEnvFallback(trackModalGenreIds),
        );
        appendGenreHintsArrayToFormData(fd, [...pendingTrackGenreHintsRef.current]);
        const res = await fetch(urlTrackForArtist(artistId), {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          setErrorMessage(errText || "Не удалось сохранить трек");
          return;
        }
        const created = await res.json();
        const tid = created?.id != null ? Number(created.id) : null;
        if (!Number.isFinite(tid)) {
          setErrorMessage("Не удалось получить id трека");
          return;
        }
        const attachRes = await fetch(urlAlbumAttachTrack(albId, artistId, tid), {
          method: "POST",
          headers: authHeaders(),
        });
        if (!attachRes.ok) {
          const errText = await attachRes.text().catch(() => "");
          setErrorMessage(errText || "Не удалось добавить трек в альбом");
          return;
        }
        const tracksRes = await fetch(urlTracksByArtist(artistId), {
          headers: authHeaders(),
        });
        if (tracksRes.ok) {
          const data = await tracksRes.json();
          const rows = Array.isArray(data) ? data : [];
          setArtistTracks(
            rows.map((row) => ({
              ...row,
              durationSeconds: getTrackDurationSeconds(row),
            })),
          );
        }
        const albumsRes = await fetch(urlAlbumsByArtist(artistId), {
          headers: authHeaders(),
        });
        if (albumsRes.ok) {
          const ad = await albumsRes.json();
          setArtistAlbums(Array.isArray(ad) ? ad : []);
        }
        setSuccessMessage("Трек добавлен в альбом");
        resetTrackModal();
      } catch {
        setErrorMessage("Не удалось сохранить трек");
      } finally {
        setTrackModalSaving(false);
      }
      return;
    }
    if (!artistId) {
      setErrorMessage("Сохраните исполнителя, чтобы добавить трек");
      return;
    }
    setTrackModalSaving(true);
    setErrorMessage("");
    try {
      let idCover = null;
      if (trackModalCoverFile) {
        const uploaded = await uploadImageFile(trackModalCoverFile);
        if (!uploaded) {
          setErrorMessage("Не удалось загрузить обложку");
          return;
        }
        idCover = uploaded;
      }
      const ownerRaw = localStorage.getItem("userId");
      const ownerId = Number(ownerRaw);
      if (!Number.isFinite(ownerId)) {
        setErrorMessage("Не удалось определить пользователя. Войдите снова.");
        return;
      }
      const durSec = await readFileDurationSeconds(trackModalAudioFile);
      const fd = new FormData();
      fd.append("file", trackModalAudioFile);
      fd.append("name", title);
      fd.append("ownerId", String(ownerId));
      if (idCover != null) fd.append("idCover", String(idCover));
      if (durSec > 0) fd.append("durationSeconds", String(durSec));
      appendGenreIdsArrayToFormData(
        fd,
        mergeGenreIdsWithEnvFallback(trackModalGenreIds),
      );
      appendGenreHintsArrayToFormData(fd, [...pendingTrackGenreHintsRef.current]);
      const res = await fetch(urlTrackForArtist(artistId), {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setErrorMessage(errText || "Не удалось сохранить трек");
        return;
      }
      const created = await res.json();
      setArtistTracks((prev) => {
        const next = [...prev, created];
        return next.sort((a, b) => (Number(a?.id) || 0) - (Number(b?.id) || 0));
      });
      setSuccessMessage("Трек успешно сохранён");
      resetTrackModal();
    } catch {
      setErrorMessage("Не удалось сохранить трек");
    } finally {
      setTrackModalSaving(false);
    }
  };

  const openGenreEditModal = useCallback((track, targetSpec) => {
    setTrackRowMenuKey(null);
    setErrorMessage("");
    setGenreEditTarget(targetSpec);
    setTrackModalContext("editGenres");
    setSavedAlbumModalTarget(null);
    setTrackModalTitle(String(track?.name || "").trim() || "—");
    setTrackModalGenreIds(normalizeGenreIdList(genreIdsFromTrack(track)));
    setTrackModalGenreSearch("");
    setTrackModalTagAlbum("");
    setNewGenreName("");
    setGenreCreating(false);
    setTrackModalAudioFile(null);
    setTrackModalCoverFile(null);
    setTrackModalAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setTrackModalCoverPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setTrackModalSaving(false);
    setTrackModalOpen(true);
  }, []);

  const saveGenreEditModal = async () => {
    if (trackModalContext !== "editGenres" || !genreEditTarget || trackModalSaving) return;
    const ids = normalizeGenreIdList(trackModalGenreIds);
    if (genreEditTarget.kind === "draft") {
      setTrackModalSaving(true);
      setErrorMessage("");
      try {
        setDraftAlbumTracks((prev) =>
          prev.map((x) =>
            x.id === genreEditTarget.localId ? { ...x, genreIds: ids } : x,
          ),
        );
        setSuccessMessage("Жанры обновлены");
        resetTrackModal();
      } finally {
        setTrackModalSaving(false);
      }
      return;
    }
    if (!artistId) {
      setErrorMessage("Сохраните исполнителя");
      return;
    }
    const tid = Number(genreEditTarget.trackId);
    if (!Number.isFinite(tid)) {
      setErrorMessage("Не удалось определить трек");
      return;
    }
    setTrackModalSaving(true);
    setErrorMessage("");
    try {
      const res = await fetch(urlTrackPatchGenres(tid, artistId), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ genreIds: ids }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setErrorMessage(errText || "Не удалось сохранить жанры");
        return;
      }
      const updated = await res.json().catch(() => null);
      if (updated && typeof updated === "object" && updated.id != null) {
        setArtistTracks((prev) => {
          const next = [...prev];
          const ix = next.findIndex((row) => Number(row?.id) === tid);
          if (ix >= 0) {
            next[ix] = {
              ...next[ix],
              ...updated,
              durationSeconds: getTrackDurationSeconds({
                ...next[ix],
                ...updated,
              }),
            };
          }
          return next;
        });
      } else {
        setArtistTracks((prev) =>
          prev.map((row) =>
            Number(row?.id) === tid ? { ...row, genreIds: ids } : row,
          ),
        );
      }
      await refreshArtistAlbums();
      setSuccessMessage("Жанры обновлены");
      resetTrackModal();
    } catch {
      setErrorMessage("Не удалось сохранить жанры");
    } finally {
      setTrackModalSaving(false);
    }
  };

  const renderTrackDashOverflowMenu = (rowKey, disabled, onEditGenres) => {
    const menuOpen = trackRowMenuKey === rowKey;
    return (
      <div
        className={pageStyle.trackDashMenuWrap}
        ref={menuOpen ? trackRowMenuRef : undefined}
      >
        <button
          type="button"
          className={pageStyle.trackDashMenuBtn}
          aria-label="Другие действия"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setTrackRowMenuKey(menuOpen ? null : rowKey);
          }}
        >
          ...
        </button>
        {menuOpen ? (
          <div className={pageStyle.trackDashMenuPanel} role="menu">
            <button
              type="button"
              role="menuitem"
              className={pageStyle.trackDashMenuItem}
              onClick={() => {
                setTrackRowMenuKey(null);
                onEditGenres();
              }}
            >
              Изменить жанры
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const toggleListTrackPlay = async (track) => {
    const id = track?.id;
    if (id == null) return;
    if (listPlayingId === id && listAudioUrl) {
      listPlaybackQueueRef.current = null;
      setListAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setListPlayingCoverUrl((prev) => {
        revokeListCoverIfOwned(prev);
        return "";
      });
      setListPlayingId(null);
      setListPlayingTitle("");
      setListAudioPlaying(false);
      return;
    }
    setListPlayLoadingId(id);
    setErrorMessage("");
    try {
      listPlaybackQueueRef.current =
        mediaTab === "tracks"
          ? { kind: "singles", tracks: buildSinglesPlaybackQueue(artistTracks) }
          : mediaTab === "albums"
            ? {
                kind: "albums",
                tracks: buildAlbumsFlattenPlaybackQueue(
                  artistAlbums,
                  artistTracks,
                ),
              }
            : null;
      setListAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const res = await fetch(urlTrackAudio(id), { headers: authHeaders() });
      if (!res.ok) {
        setErrorMessage("Не удалось загрузить трек");
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
        const cRes = await fetch(urlGetImage(coverId), {
          headers: authHeaders(),
        });
        if (cRes.ok) {
          const cBlob = await cRes.blob();
          coverUrl = URL.createObjectURL(cBlob);
        }
      }
      setListPlayingId(id);
      setListPlayingTitle(String(track.name || ""));
      setListPlayingCoverUrl((prev) => {
        revokeListCoverIfOwned(prev);
        return coverUrl;
      });
      setListAudioUrl(u);
    } catch {
      setErrorMessage("Не удалось загрузить трек");
    } finally {
      setListPlayLoadingId(null);
    }
  };

  const toggleDraftTrackPlay = (track) => {
    const id = track?.id;
    if (id == null || !track?.audioUrl) return;
    if (listPlayingId === id && listAudioUrl) {
      listPlaybackQueueRef.current = null;
      setListAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setListPlayingCoverUrl((prev) => {
        revokeListCoverIfOwned(prev);
        return "";
      });
      setListPlayingId(null);
      setListPlayingTitle("");
      setListAudioPlaying(false);
      return;
    }
    listPlaybackQueueRef.current = {
      kind: "draft",
      tracks: draftAlbumTracks.filter((t) => !t.deleted),
    };
    setListAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setListPlayingCoverUrl((prev) => {
      revokeListCoverIfOwned(prev);
      return draftAlbumCoverUrlRef.current || "";
    });
    setListPlayingId(id);
    setListPlayingTitle(String(track.name || ""));
    setListAudioUrl(track.audioUrl);
  };

  const handleAdminListAudioEnded = () => {
    setListAudioPlaying(false);
    const ctx = listPlaybackQueueRef.current;
    const curId = listPlayingIdRef.current;
    if (!ctx?.tracks?.length || curId == null) return;
    const idx = ctx.tracks.findIndex((t) => String(t?.id) === String(curId));
    if (idx < 0 || idx >= ctx.tracks.length - 1) return;
    const next = ctx.tracks[idx + 1];
    if (ctx.kind === "draft") {
      toggleDraftTrackPlay(next);
    } else {
      void toggleListTrackPlay(next);
    }
  };

  const deleteDraftTrackFromList = (trackId) => {
    if (listPlayingId === trackId) {
      listPlaybackQueueRef.current = null;
      setListAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setListPlayingCoverUrl((prev) => {
        revokeListCoverIfOwned(prev);
        return "";
      });
      setListPlayingId(null);
      setListPlayingTitle("");
      setListAudioPlaying(false);
    }
    setDraftAlbumTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, deleted: true } : t)),
    );
  };

  const restoreDraftTrackFromList = (trackId) => {
    setDraftAlbumTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, deleted: false } : t)),
    );
  };

  const finalizeDraftTrackDeleteFromList = (trackId) => {
    if (listPlayingId === trackId) {
      listPlaybackQueueRef.current = null;
      setListAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setListPlayingCoverUrl((prev) => {
        revokeListCoverIfOwned(prev);
        return "";
      });
      setListPlayingId(null);
      setListPlayingTitle("");
      setListAudioPlaying(false);
    }
    setDraftAlbumTracks((prev) => {
      const victim = prev.find((t) => t.id === trackId);
      if (victim?.audioUrl) URL.revokeObjectURL(victim.audioUrl);
      return prev.filter((t) => t.id !== trackId);
    });
    setDraftAlbumTrackCount((c) => Math.max(0, c - 1));
  };

  const deleteTrackFromList = async (trackId) => {
    if (!artistId || trackId == null) return;
    const tid = Number(trackId);
    setErrorMessage("");
    try {
      const res = await fetch(urlTrackDelete(trackId, artistId), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setErrorMessage(
          String(errText || "").trim() || "Не удалось удалить трек",
        );
        return;
      }
      if (Number(listPlayingId) === tid) {
        listPlaybackQueueRef.current = null;
        setListAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setListPlayingCoverUrl((prev) => {
          revokeListCoverIfOwned(prev);
          return "";
        });
        setListPlayingId(null);
        setListPlayingTitle("");
        setListAudioPlaying(false);
      }
      setArtistTracks((prev) =>
        prev.map((t) =>
          Number(t.id) === tid ? { ...t, deleted: true } : t,
        ),
      );
      void refreshArtistTracksAndAlbums();
    } catch {
      setErrorMessage("Не удалось удалить трек");
    }
  };

  const finalizeDeleteTrackFromList = async (trackId) => {
    if (!artistId || trackId == null) return;
    setErrorMessage("");
    setFinalDeleteSubmitting(true);
    try {
      const res = await fetch(urlTrackDeleteFinal(trackId, artistId), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setErrorMessage("Не удалось удалить трек окончательно");
        return;
      }
      if (listPlayingId === trackId) {
        listPlaybackQueueRef.current = null;
        setListAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        setListPlayingCoverUrl((prev) => {
          revokeListCoverIfOwned(prev);
          return "";
        });
        setListPlayingId(null);
        setListPlayingTitle("");
        setListAudioPlaying(false);
      }
      setArtistTracks((prev) => prev.filter((t) => t.id !== trackId));
      setSuccessMessage("Трек удалён");
      setConfirmDeleteTrack(null);
      void refreshArtistAlbums();
    } catch {
      setErrorMessage("Не удалось удалить трек окончательно");
    } finally {
      setFinalDeleteSubmitting(false);
    }
  };

  const restoreTrackFromList = async (trackId) => {
    if (!artistId || trackId == null) return;
    setErrorMessage("");
    try {
      const res = await fetch(urlTrackRestore(trackId, artistId), {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setErrorMessage("Не удалось восстановить трек");
        return;
      }
      setArtistTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, deleted: false }
            : t,
        ),
      );
      setSuccessMessage("Трек восстановлен");
      void refreshArtistAlbums();
    } catch {
      setErrorMessage("Не удалось восстановить трек");
    }
  };

  const openAlbumTrackModal = useCallback(
    (album) => {
      if (saving || loadingArtist || albumDraftSaving) return;
      if (!artistId) {
        setErrorMessage("Сохраните исполнителя, чтобы добавить треки");
        return;
      }
      setSavedAlbumModalTarget({
        id: album.id,
        idCover: album.idCover,
      });
      setTrackModalContext("savedAlbum");
      setTrackModalAudioFile(null);
      setTrackModalTitle("");
      setTrackModalCoverFile(null);
      setTrackModalAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setTrackModalCoverPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setTrackModalGenreSearch("");
      setTrackModalTagAlbum("");
      if (trackModalCoverInputRef.current) {
        trackModalCoverInputRef.current.value = "";
      }
      setTrackModalOpen(true);
      trackAudioInputRef.current?.click();
    },
    [saving, loadingArtist, albumDraftSaving, artistId],
  );

  const deleteAlbumFromList = async (albumId) => {
    if (!artistId || albumId == null) return;
    setErrorMessage("");
    try {
      const res = await fetch(urlAlbumDelete(albumId, artistId), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setErrorMessage("Не удалось удалить альбом");
        return;
      }
      setSavedAlbumModalTarget((prev) =>
        prev && Number(prev.id) === Number(albumId) ? null : prev,
      );
      await refreshArtistTracksAndAlbums();
    } catch {
      setErrorMessage("Не удалось удалить альбом");
    }
  };

  const restoreAlbumFromList = async (albumId) => {
    if (!artistId || albumId == null) return;
    setErrorMessage("");
    try {
      const res = await fetch(urlAlbumRestore(albumId, artistId), {
        method: "POST",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setErrorMessage("Не удалось восстановить альбом");
        return;
      }
      setSuccessMessage("Альбом восстановлен");
      await refreshArtistTracksAndAlbums();
    } catch {
      setErrorMessage("Не удалось восстановить альбом");
    }
  };

  const finalizeDeleteAlbumFromList = async (albumId) => {
    if (!artistId || albumId == null) return;
    setErrorMessage("");
    setFinalDeleteSubmitting(true);
    try {
      const res = await fetch(urlAlbumDeleteFinal(albumId, artistId), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        setErrorMessage("Не удалось удалить альбом окончательно");
        return;
      }
      setConfirmDeleteAlbum(null);
      setSuccessMessage("Альбом удалён");
      await refreshArtistTracksAndAlbums();
    } catch {
      setErrorMessage("Не удалось удалить альбом окончательно");
    } finally {
      setFinalDeleteSubmitting(false);
    }
  };

  const deleteImageOnServer = async (imageId) => {
    const res = await fetch(urlDeleteImage(imageId), {
      method: "DELETE",
      headers: authHeaders(),
    });
    return res.ok || res.status === 404;
  };

  const isPhotoProvided = () => photoFile != null || coverImageId != null;

  const validateRequiredFields = () => {
    const nameOk = Boolean(String(name || "").trim());
    const photoOk = isPhotoProvided();
    return nameOk && photoOk;
  };

  const isDirtyAgainstSaved = useCallback(() => {
    const snap = lastSavedRef.current;
    if (!artistId || !snap) return true;
    if (photoFile) return true;
    const currentRoles = [...roles]
      .map((r) => String(r || "").trim())
      .filter(Boolean)
      .sort();
    const savedRoles = Array.isArray(snap.roles) ? [...snap.roles].sort() : [];
    return (
      String(name || "").trim() !== snap.name ||
      description !== snap.description ||
      currentRoles.join("|") !== savedRoles.join("|") ||
      (coverImageId ?? null) !== (snap.coverImageId ?? null)
    );
  }, [artistId, name, description, roles, coverImageId, photoFile]);

  const clearPhoto = async () => {
    setHighlightRequired(false);
    setSuccessMessage("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
    }
    setPhotoFile(null);

    const hadServerId = coverImageId != null;
    if (!hadServerId) {
      setCoverImageId(null);
      return;
    }

    const idToRemove = coverImageId;
    setCoverImageId(null);

    const okDel = await deleteImageOnServer(idToRemove);
    if (!okDel) {
      setErrorMessage("Не удалось удалить изображение");
      setCoverImageId(idToRemove);
      return;
    }

    if (artistId) {
      try {
        const res = await fetch(urlArtistUpdate(artistId), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            name: String(name || "").trim(),
            description: String(description || "").trim() || null,
            roles: normalizeArtistRoles(roles),
            idCover: null,
          }),
        });
        if (!res.ok) {
          setErrorMessage("Не удалось обновить исполнителя");
          return;
        }
        lastSavedRef.current = {
          name: String(name || "").trim(),
          description,
          roles: normalizeArtistRoles(roles).sort(),
          coverImageId: null,
        };
      } catch {
        setErrorMessage("Не удалось обновить исполнителя");
      }
    }
  };

  const ensureCreatedArtist = useCallback(async () => {
    if (artistId) return artistId;
    if (!createInflightRef.current) {
      createInflightRef.current = (async () => {
        if (!validateRequiredFields()) {
          setErrorMessage("Заполните обязательные поля");
          setHighlightRequired(true);
          setTimeout(() => setHighlightRequired(false), 2200);
          return null;
        }

        setSaving(true);
        try {
          let cid = coverImageId;
          if (photoFile) {
            const uploaded = await uploadImageFile(photoFile);
            if (!uploaded) {
              setErrorMessage("Не удалось загрузить фото");
              return null;
            }
            cid = uploaded;
          }
          if (cid == null) {
            setErrorMessage("Заполните обязательные поля");
            return null;
          }

          const res = await fetch(URL_ARTIST_CREATE, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify({
              name: String(name || "").trim(),
              description: String(description || "").trim() || null,
              roles: normalizeArtistRoles(roles),
              idCover: cid,
            }),
          });
          if (!res.ok) {
            setErrorMessage("Не удалось сохранить исполнителя");
            return null;
          }
          const data = await res.json();
          const id = data?.id != null ? Number(data.id) : null;
          if (!id) {
            setErrorMessage("Не удалось сохранить исполнителя");
            return null;
          }
          setArtistId(id);
          setCoverImageId(cid);
          setPhotoFile(null);
          lastSavedRef.current = {
            name: String(name || "").trim(),
            description,
            roles: normalizeArtistRoles(roles).sort(),
            coverImageId: cid,
          };
          return id;
        } catch {
          setErrorMessage("Не удалось сохранить исполнителя");
          return null;
        } finally {
          setSaving(false);
        }
      })().finally(() => {
        createInflightRef.current = null;
      });
    }
    return createInflightRef.current;
  }, [artistId, name, description, roles, photoFile, coverImageId]);

  const saveDraftAlbumToBackend = async () => {
    if (albumDraftSaving || saving || loadingArtist) return;
    commitAlbumYearInput();
    if (!validateAlbumDraftRequired()) return;
    if (!draftAlbumCoverFile) {
      setErrorMessage("Выберите файл обложки альбома");
      return;
    }
    setAlbumDraftSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const aid = await ensureCreatedArtist();
      if (!aid) return;

      const albumCoverId = await uploadImageFile(draftAlbumCoverFile);
      if (!albumCoverId) {
        setErrorMessage("Не удалось загрузить обложку альбома");
        return;
      }

      const ownerRaw = localStorage.getItem("userId");
      const ownerId = Number(ownerRaw);
      if (!Number.isFinite(ownerId)) {
        setErrorMessage("Не удалось определить пользователя. Войдите снова.");
        return;
      }

      const active = draftAlbumTracks.filter((t) => !t.deleted);
      const trackIds = [];
      for (const t of active) {
        const file = t.audioFile;
        if (!file) {
          setErrorMessage(
            `У трека «${String(t.name || "").trim() || "—"}» нет аудиофайла. Удалите трек и добавьте снова.`,
          );
          return;
        }
        let durSec = Number(t.durationSeconds);
        if (!Number.isFinite(durSec) || durSec <= 0) {
          durSec = await readFileDurationSeconds(file);
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("name", String(t.name || "").trim() || "Трек");
        fd.append("ownerId", String(ownerId));
        fd.append("idCover", String(albumCoverId));
        if (durSec > 0) fd.append("durationSeconds", String(Math.round(durSec)));
        appendGenreIdsArrayToFormData(
          fd,
          mergeGenreIdsWithEnvFallback(
            Array.isArray(t.genreIds) && t.genreIds.length > 0
              ? t.genreIds
              : t.genreId != null
                ? [t.genreId]
                : [],
          ),
        );
        appendGenreHintsArrayToFormData(fd, t.genreHints || []);
        const res = await fetch(urlTrackForArtist(aid), {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          setErrorMessage(errText || "Не удалось сохранить трек альбома");
          return;
        }
        const created = await res.json();
        const tid = created?.id != null ? Number(created.id) : null;
        if (Number.isFinite(tid)) trackIds.push(tid);
      }

      const playlistName = `${String(draftAlbumTitle || "").trim()} (${draftAlbumYear})`;
      const albumRes = await fetch(urlAlbumForArtist(aid), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: playlistName,
          idCover: albumCoverId,
          trackIds,
        }),
      });
      if (!albumRes.ok) {
        const errText = await albumRes.text().catch(() => "");
        setErrorMessage(errText || "Не удалось сохранить альбом");
        return;
      }

      const tracksRes = await fetch(urlTracksByArtist(aid), {
        headers: authHeaders(),
      });
      if (tracksRes.ok) {
        const data = await tracksRes.json();
        const rows = Array.isArray(data) ? data : [];
        setArtistTracks(
          rows.map((row) => ({
            ...row,
            durationSeconds: getTrackDurationSeconds(row),
          })),
        );
      }

      const albumsRes = await fetch(urlAlbumsByArtist(aid), {
        headers: authHeaders(),
      });
      if (albumsRes.ok) {
        const ad = await albumsRes.json();
        setArtistAlbums(Array.isArray(ad) ? ad : []);
      }

      setSuccessMessage("Альбом сохранён");
      resetAlbumDraftFields();
    } catch {
      setErrorMessage("Не удалось сохранить альбом");
    } finally {
      setAlbumDraftSaving(false);
    }
  };

  const handleSave = async () => {
    if (saving || loadingArtist || albumDraftSaving) return;
    setSuccessMessage("");
    setErrorMessage("");

    if (artistId && lastSavedRef.current && !isDirtyAgainstSaved()) {
      setErrorMessage("Данные не были изменены");
      return;
    }

    if (!validateRequiredFields()) {
      setErrorMessage("Заполните обязательные поля");
      setHighlightRequired(true);
      setTimeout(() => setHighlightRequired(false), 2200);
      return;
    }

    if (!artistId) {
      const id = await ensureCreatedArtist();
      if (id) {
        setSuccessMessage("Исполнитель сохранён");
        setErrorMessage("");
      }
      return;
    }

    setSaving(true);
    try {
      let cid = coverImageId;
      const previousCoverId = lastSavedRef.current?.coverImageId ?? null;

      if (photoFile) {
        const uploaded = await uploadImageFile(photoFile);
        if (!uploaded) {
          setErrorMessage("Не удалось загрузить фото");
          return;
        }
        cid = uploaded;
      }

      if (cid == null) {
        setErrorMessage("Заполните обязательные поля");
        return;
      }

      const res = await fetch(urlArtistUpdate(artistId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          name: String(name || "").trim(),
          description: String(description || "").trim() || null,
          roles: normalizeArtistRoles(roles),
          idCover: cid,
        }),
      });
      if (!res.ok) {
        setErrorMessage("Не удалось сохранить исполнителя");
        return;
      }

      if (previousCoverId != null && previousCoverId !== cid) {
        await deleteImageOnServer(previousCoverId);
      }

      setCoverImageId(cid);
      setPhotoFile(null);
      lastSavedRef.current = {
        name: String(name || "").trim(),
        description,
        roles: normalizeArtistRoles(roles).sort(),
        coverImageId: cid,
      };
      setSuccessMessage("Исполнитель сохранён");
    } catch {
      setErrorMessage("Не удалось сохранить исполнителя");
    } finally {
      setSaving(false);
    }
  };

  const emptyCatalogHint =
    mediaTab === "albums" ? "Нет альбомов" : "Нет синглов";

  const nameInputClass = `${highlightRequired && !String(name || "").trim() ? notice.inputError : ""}`;
  const photoWrapClass = `${pageStyle.photoWrap} ${
    highlightRequired && !isPhotoProvided() ? notice.inputError : ""
  }`;
  const rolesCaption = roles.length > 0 ? roles.join(", ") : "Выберите роли";

  const toggleRole = (roleName) => {
    setRoles((prev) => {
      if (prev.includes(roleName)) {
        return prev.filter((r) => r !== roleName);
      }
      return [...prev, roleName];
    });
  };

  const formLocked =
    saving ||
    loadingArtist ||
    albumDraftSaving ||
    savedAlbumCoverSavingId != null;
  const activeTracks = artistTracks.filter((t) => !t.deleted && isSingleTrack(t));
  const deletedTracks = artistTracks.filter((t) => t.deleted && isSingleTrack(t));
  const draftAlbumActiveTracks = draftAlbumTracks.filter((t) => !t.deleted);
  const draftAlbumDeletedTracks = draftAlbumTracks.filter((t) => t.deleted);

  const activeAlbums = artistAlbums.filter((a) => !a.deleted);
  const deletedAlbums = artistAlbums.filter((a) => a.deleted);

  useEffect(() => {
    if (!artistId || loadingArtist) {
      if (!artistId) {
        setArtistTracks([]);
        setArtistAlbums([]);
      }
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const [tRes, aRes] = await Promise.all([
          fetch(urlTracksByArtist(artistId), {
            headers: authHeaders(),
          }),
          fetch(urlAlbumsByArtist(artistId), {
            headers: authHeaders(),
          }),
        ]);
        if (cancelled) return;
        if (tRes.ok) {
          const data = await tRes.json();
          const rows = Array.isArray(data) ? data : [];
          setArtistTracks(
            rows.map((t) => ({
              ...t,
              durationSeconds: getTrackDurationSeconds(t),
            })),
          );
        }
        if (aRes.ok) {
          const data = await aRes.json();
          setArtistAlbums(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setArtistTracks([]);
          setArtistAlbums([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artistId, loadingArtist]);

  useEffect(() => {
    if (artistAlbums.length === 0) {
      setAlbumCoverBlobUrls((prev) => {
        Object.values(prev).forEach((u) => {
          if (u) URL.revokeObjectURL(u);
        });
        return {};
      });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const map = {};
      for (const album of artistAlbums) {
        const pid = album?.id;
        const cid = Number(album?.idCover);
        if (pid == null || !Number.isFinite(cid) || cid <= 0) continue;
        try {
          const res = await fetch(urlGetImage(cid), {
            headers: authHeaders(),
          });
          if (!res.ok || cancelled) continue;
          const blob = await res.blob();
          if (cancelled) break;
          map[pid] = URL.createObjectURL(blob);
        } catch {
          /* skip cover */
        }
      }
      if (cancelled) {
        Object.values(map).forEach((u) => URL.revokeObjectURL(u));
        return;
      }
      setAlbumCoverBlobUrls((prev) => {
        Object.values(prev).forEach((u) => {
          if (u) URL.revokeObjectURL(u);
        });
        return map;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [artistAlbums]);

  useEffect(() => {
    if (!trackModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !trackModalSaving) resetTrackModal();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [trackModalOpen, trackModalSaving, resetTrackModal]);

  useEffect(() => {
    if (!confirmDeleteTrack && !confirmDeleteAlbum) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !finalDeleteSubmitting) {
        setConfirmDeleteTrack(null);
        setConfirmDeleteAlbum(null);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [confirmDeleteTrack, confirmDeleteAlbum, finalDeleteSubmitting]);

  useEffect(() => {
    if (mediaTab !== "tracks") {
      setListAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setListPlayingCoverUrl((prev) => {
        revokeListCoverIfOwned(prev);
        return "";
      });
      setListPlayingId(null);
      setListPlayingTitle("");
      setListAudioPlaying(false);
    }
  }, [mediaTab, revokeListCoverIfOwned]);

  useEffect(
    () => () => {
      const u = listAudioUrl;
      if (u) URL.revokeObjectURL(u);
      const cu = listPlayingCoverUrl;
      revokeListCoverIfOwned(cu);
    },
    [listAudioUrl, listPlayingCoverUrl, revokeListCoverIfOwned],
  );

  function renderAlbumCatalogSection() {
    const displayName = String(name || "").trim() || "—";
    return (
      <div className={pageStyle.catalogAlbumsLayout}>
        {activeAlbums.length === 0 && deletedAlbums.length === 0 ? (
          <p className={pageStyle.catalogEmpty}>{emptyCatalogHint}</p>
        ) : (
          <div className={pageStyle.albumCatalogPairGrid}>
            <div className={pageStyle.albumCatalogPairHeaders}>
              <h3 className={pageStyle.catalogColTitle}>Активные</h3>
              <h3 className={pageStyle.catalogColTitle}>Удалённые треки</h3>
            </div>
                {activeAlbums.map((album) => {
              const albumTracksActive = (album.tracks || []).filter((tr) => !tr.deleted);
              const albumTracksDeleted = (album.tracks || []).filter((tr) => tr.deleted);
              const nActiveTracks = albumTracksActive.length;
              const { title: albumTitle, year: albumYear } =
                parseSavedAlbumListName(album.name);
              const defaultYearStr =
                albumYear != null ? albumYear : String(new Date().getFullYear());
              const yearFieldValue =
                savedAlbumYearDraft[album.id] != null
                  ? savedAlbumYearDraft[album.id]
                  : defaultYearStr;
              const digitsCommitted = String(defaultYearStr || "")
                .replace(/\D/g, "")
                .slice(0, 4);
              const draftYearStored = savedAlbumYearDraft[album.id];
              const digitsDraft =
                draftYearStored != null
                  ? String(draftYearStored).replace(/\D/g, "").slice(0, 4)
                  : digitsCommitted;
              const savedAlbumYearIsDirty =
                draftYearStored != null && digitsDraft !== digitsCommitted;
              const committedTitleStr = String(albumTitle || "").trim();
              const titleFieldValue =
                savedAlbumTitleDraft[album.id] != null
                  ? savedAlbumTitleDraft[album.id]
                  : albumTitle;
              const draftTitleStored = savedAlbumTitleDraft[album.id];
              const savedAlbumTitleIsDirty =
                draftTitleStored != null &&
                String(draftTitleStored).trim() !== committedTitleStr;
              const savedAlbumMetaIsDirty =
                savedAlbumYearIsDirty || savedAlbumTitleIsDirty;
              return (
                <div key={album.id} className={pageStyle.albumCatalogPairRow}>
                  <div className={pageStyle.albumCatalogPairLeft}>
                  <div className={pageStyle.savedAlbumBlock}>
                      <div className={pageStyle.savedAlbumRowOuter}>
                        <div className={pageStyle.savedAlbumRow}>
                          <div className={pageStyle.savedAlbumCoverWrap}>
                            <div className={pageStyle.savedAlbumCover}>
                              {albumCoverBlobUrls[album.id] ? (
                                <img
                                  src={albumCoverBlobUrls[album.id]}
                                  alt=""
                                  className={pageStyle.savedAlbumCoverImg}
                                />
                              ) : (
                                <span
                                  className={
                                    pageStyle.savedAlbumCoverPlaceholder
                                  }
                                  aria-hidden
                                >
                                  ♪
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              className={pageStyle.savedAlbumCoverEditBtn}
                              onClick={() => pickSavedAlbumCover(album.id)}
                              disabled={
                                formLocked ||
                                savedAlbumYearSavingId === album.id ||
                                savedAlbumCoverSavingId === album.id
                              }
                              aria-label="Изменить обложку альбома"
                              title="Изменить обложку"
                            >
                              <img
                                src={correctIcon}
                                alt=""
                                aria-hidden
                              />
                            </button>
                          </div>
                          <div className={pageStyle.savedAlbumBody}>
                            <div className={pageStyle.savedAlbumMain}>
                              <div className={pageStyle.savedAlbumTitleRow}>
                                <div
                                  className={pageStyle.albumTitleWithHint}
                                  title="Название можно исправить"
                                >
                                  <input
                                    type="text"
                                    className={pageStyle.savedAlbumTitleInput}
                                    size={Math.min(
                                      72,
                                      Math.max(
                                        6,
                                        String(titleFieldValue || "").length + 2,
                                      ),
                                    )}
                                    value={titleFieldValue}
                                    onChange={(e) => {
                                      setSavedAlbumTitleDraft((prev) => ({
                                        ...prev,
                                        [album.id]: e.target.value,
                                      }));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void commitSavedAlbumPatch(album);
                                      }
                                    }}
                                    aria-label="Название альбома"
                                    disabled={
                                      formLocked || savedAlbumYearSavingId === album.id
                                    }
                                  />
                                  <img
                                    src={correctIcon}
                                    alt=""
                                    className={pageStyle.albumYearEditHintIcon}
                                    aria-hidden
                                  />
                                </div>
                              </div>
                              <div className={pageStyle.savedAlbumMetaRow}>
                                <div
                                  className={pageStyle.albumYearWithHint}
                                  title="Нажмите на год для исправления"
                                >
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={`${pageStyle.albumYearField} ${pageStyle.savedAlbumYearField}`}
                                    value={yearFieldValue}
                                    onChange={(e) => {
                                      const raw = e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4);
                                      setSavedAlbumYearDraft((prev) => ({
                                        ...prev,
                                        [album.id]: raw,
                                      }));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        void commitSavedAlbumPatch(album);
                                      }
                                    }}
                                    aria-label="Год выпуска альбома"
                                    disabled={
                                      formLocked || savedAlbumYearSavingId === album.id
                                    }
                                  />
                                  <img
                                    src={correctIcon}
                                    alt=""
                                    className={pageStyle.albumYearEditHintIcon}
                                    aria-hidden
                                  />
                                </div>
                                <span className={pageStyle.savedAlbumMetaTracks}>
                                  {`  ${formatTrackCountRu(nActiveTracks)}`}
                                </span>
                              </div>
                              <button
                                type="button"
                                className={pageStyle.btnAddTrackOutline}
                                onClick={() => openAlbumTrackModal(album)}
                                disabled={formLocked}
                              >
                                Добавить трек
                              </button>
                            </div>
                            {savedAlbumMetaIsDirty ? (
                              <div
                                className={pageStyle.savedAlbumYearActions}
                                aria-live="polite"
                              >
                                <button
                                  type="button"
                                  className={pageStyle.savedAlbumYearSaveBtn}
                                  disabled={
                                    formLocked || savedAlbumYearSavingId === album.id
                                  }
                                  onClick={() => void commitSavedAlbumPatch(album)}
                                >
                                  {savedAlbumYearSavingId === album.id
                                    ? "Сохранение…"
                                    : "Сохранить"}
                                </button>
                                <button
                                  type="button"
                                  className={pageStyle.savedAlbumYearCancelText}
                                  disabled={
                                    formLocked || savedAlbumYearSavingId === album.id
                                  }
                                  onClick={() => revertSavedAlbumDraft(album.id)}
                                >
                                  Отменить
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`${pageStyle.trackDashRemove} ${pageStyle.savedAlbumRemoveBtn}`}
                          onClick={() => void deleteAlbumFromList(album.id)}
                          disabled={formLocked}
                          aria-label="Удалить альбом"
                          title="Удалить альбом"
                        >
                          −
                        </button>
                      </div>
                      {albumTracksActive.length > 0 ? (
                        <div className={pageStyle.savedAlbumTracksWrap}>
                          <div className={pageStyle.trackDashWrap}>
                            <ul className={pageStyle.trackDashList}>
                              {albumTracksActive.map((t, idx) => {
                                const merged =
                                  artistTracks.find(
                                    (at) => Number(at?.id) === Number(t?.id),
                                  ) || t;
                                const isThis = listPlayingId === t.id;
                                const isLoad = listPlayLoadingId === t.id;
                                return (
                                  <li key={t.id} className={pageStyle.trackDashRow}>
                                    <span className={pageStyle.trackDashIndex}>
                                      {idx + 1}
                                    </span>
                                    <button
                                      type="button"
                                      className={pageStyle.trackDashPlay}
                                      onClick={() => void toggleListTrackPlay(merged)}
                                      disabled={formLocked || isLoad}
                                      aria-label={
                                        isThis && listAudioPlaying ? "Пауза" : "Воспроизвести"
                                      }
                                    >
                                      {isLoad
                                        ? "…"
                                        : isThis && listAudioPlaying
                                          ? "⏸"
                                          : "▶"}
                                    </button>
                                    <div className={pageStyle.trackDashMeta}>
                                      <span className={pageStyle.trackDashTitle}>
                                        {t.name || "—"}
                                      </span>
                                      <span className={pageStyle.trackDashArtist}>
                                        {displayName}
                                      </span>
                                    </div>
                                    <span className={pageStyle.trackDashDur}>
                                      {formatTrackDurationDot(
                                        getTrackDurationSeconds(merged),
                                      )}
                                    </span>
                                    <button
                                      type="button"
                                      className={pageStyle.trackDashRemove}
                                      onClick={() => void deleteTrackFromList(t.id)}
                                      disabled={formLocked}
                                      aria-label="Удалить трек"
                                    >
                                      −
                                    </button>
                                    {renderTrackDashOverflowMenu(
                                      `album-${album.id}-${t.id}`,
                                      formLocked ||
                                        !Number.isFinite(Number(merged.id)),
                                      () =>
                                        openGenreEditModal(merged, {
                                          kind: "saved",
                                          trackId: Number(merged.id),
                                        }),
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className={pageStyle.albumCatalogPairRight}>
                    {albumTracksDeleted.length > 0 ? (
                      <>
                        <p className={pageStyle.albumDeletedTracksCaption}>
                          Треки альбома «{String(album.name || "").trim() || "—"}»
                        </p>
                        <ul className={pageStyle.deletedTrackList}>
                          {albumTracksDeleted.map((t) => (
                            <li key={t.id} className={pageStyle.deletedTrackItem}>
                              <span className={pageStyle.deletedTrackName}>
                                {t.name || "—"}
                              </span>
                              <div className={pageStyle.deletedTrackButtons}>
                                <button
                                  type="button"
                                  className={`${pageStyle.deletedTrackAction} ${pageStyle.deletedTrackRestore}`}
                                  onClick={() => void restoreTrackFromList(t.id)}
                                  disabled={formLocked}
                                >
                                  <span className={pageStyle.deletedTrackActionIcon}>
                                    +
                                  </span>
                                  <span className={pageStyle.deletedTrackActionLabel}>
                                    Восстановить
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className={pageStyle.deletedTrackActionDanger}
                                  onClick={() =>
                                    setConfirmDeleteTrack({
                                      id: t.id,
                                      name:
                                        String(t.name || "").trim() || "этот трек",
                                    })
                                  }
                                  disabled={formLocked}
                                >
                                  <span className={pageStyle.deletedTrackActionIcon}>
                                    −
                                  </span>
                                  <span className={pageStyle.deletedTrackActionLabel}>
                                    Удалить
                                  </span>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
                {deletedAlbums.map((album, delIdx) => {
                  const albumTracksDeleted = (album.tracks || []).filter((tr) => tr.deleted);
                  return (
                    <div
                      key={`deleted-album-${album.id}`}
                      className={pageStyle.albumCatalogPairRow}
                    >
                      <div className={pageStyle.albumCatalogPairLeft}>
                        {activeAlbums.length === 0 && delIdx === 0 ? (
                          <p className={pageStyle.catalogEmpty}>Нет активных альбомов</p>
                        ) : null}
                      </div>
                      <div className={pageStyle.albumCatalogPairRight}>
                    <div className={pageStyle.deletedAlbumCard}>
                      <div className={pageStyle.deletedAlbumCardHead}>
                        <span className={pageStyle.deletedAlbumCardTitle}>
                          {album.name || "—"}
                        </span>
                        <div className={pageStyle.deletedTrackButtons}>
                          <button
                            type="button"
                            className={`${pageStyle.deletedTrackAction} ${pageStyle.deletedTrackRestore}`}
                            onClick={() => void restoreAlbumFromList(album.id)}
                            disabled={formLocked}
                          >
                            <span className={pageStyle.deletedTrackActionIcon}>+</span>
                            <span className={pageStyle.deletedTrackActionLabel}>
                              Восстановить
                            </span>
                          </button>
                          <button
                            type="button"
                            className={pageStyle.deletedTrackActionDanger}
                            onClick={() =>
                              setConfirmDeleteAlbum({
                                id: album.id,
                                name:
                                  String(album.name || "").trim() || "этот альбом",
                              })
                            }
                            disabled={formLocked}
                          >
                            <span className={pageStyle.deletedTrackActionIcon}>−</span>
                            <span className={pageStyle.deletedTrackActionLabel}>
                              Удалить
                            </span>
                          </button>
                        </div>
                      </div>
                      {albumTracksDeleted.length > 0 ? (
                        <ul className={pageStyle.deletedAlbumCardTracks}>
                          {albumTracksDeleted.map((t) => (
                            <li
                              key={t.id}
                              className={pageStyle.deletedAlbumCardTrackRow}
                            >
                              <span className={pageStyle.deletedAlbumCardTrackName}>
                                {t.name || "—"}
                              </span>
                              <div className={pageStyle.deletedTrackButtons}>
                                <button
                                  type="button"
                                  className={`${pageStyle.deletedTrackAction} ${pageStyle.deletedTrackRestore}`}
                                  onClick={() => void restoreTrackFromList(t.id)}
                                  disabled={formLocked}
                                >
                                  <span className={pageStyle.deletedTrackActionIcon}>
                                    +
                                  </span>
                                  <span className={pageStyle.deletedTrackActionLabel}>
                                    Восстановить
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className={pageStyle.deletedTrackActionDanger}
                                  onClick={() =>
                                    setConfirmDeleteTrack({
                                      id: t.id,
                                      name:
                                        String(t.name || "").trim() || "этот трек",
                                    })
                                  }
                                  disabled={formLocked}
                                >
                                  <span className={pageStyle.deletedTrackActionIcon}>
                                    −
                                  </span>
                                  <span className={pageStyle.deletedTrackActionLabel}>
                                    Удалить
                                  </span>
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                      </div>
                    </div>
                  );
                })}
                {deletedAlbums.length === 0 &&
                activeAlbums.length > 0 &&
                !activeAlbums.some((a) =>
                  (a.tracks || []).some((tr) => tr.deleted),
                ) ? (
                  <p className={pageStyle.albumCatalogGlobalDeletedHint}>
                    Нет удалённых треков
                  </p>
                ) : null}
          </div>
        )}
      </div>
    );
  }


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
          <div className={style.titleWrap}>
            <h1>Исполнители</h1>
          </div>

          <div className={`${style.venues} ${style.venuesWide}`}>
            <div className={pageStyle.toolbar}>
              <NavLink className={pageStyle.return} to={artistsListReturnTo}>
                <img src={returnPage} alt="" />
                <p>Исполнители</p>
              </NavLink>
              <div className={pageStyle.toolbarActions}>
                <button
                  type="button"
                  className={pageStyle.btnSave}
                  onClick={handleSave}
                  disabled={formLocked}
                >
                  {saving ? "Сохранение…" : "Сохранить"}
                </button>
              </div>
            </div>

            {loadingArtist ? (
              <p className={pageStyle.loadHint} role="status">
                Загрузка исполнителя…
              </p>
            ) : null}

            <div className={pageStyle.mainStack}>
              <div className={pageStyle.formLayout}>
                <div className={pageStyle.leftCol}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className={pageStyle.hiddenInput}
                    aria-hidden
                    tabIndex={-1}
                    onChange={onPhotoSelected}
                  />
                  <input
                    ref={savedAlbumCoverInputRef}
                    type="file"
                    accept="image/*"
                    className={pageStyle.hiddenInput}
                    aria-hidden
                    tabIndex={-1}
                    onChange={(ev) => void onSavedAlbumCoverFileSelected(ev)}
                  />
                  <div className={photoWrapClass}>
                    <button
                      type="button"
                      className={pageStyle.photoBtn}
                      onClick={pickPhoto}
                      disabled={formLocked}
                      aria-label={
                        previewUrl || coverImageId
                          ? "Заменить фотографию"
                          : "Добавить фотографию"
                      }
                    >
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className={pageStyle.photoPreview}
                        />
                      ) : (
                        <span className={pageStyle.plus} aria-hidden>
                          +
                        </span>
                      )}
                    </button>
                    {isPhotoProvided() && (
                      <button
                        type="button"
                        className={pageStyle.photoRemove}
                        onClick={(e) => {
                          e.stopPropagation();
                          void clearPhoto();
                        }}
                        aria-label="Удалить фотографию"
                        disabled={formLocked}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div className={pageStyle.rightCol}>
                  <div className={pageStyle.row}>
                    <div
                      className={`${pageStyle.field} ${pageStyle.nameField}`}
                    >
                      <label htmlFor="artist-name">Имя</label>
                      <input
                        id="artist-name"
                        className={nameInputClass}
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          setHighlightRequired(false);
                        }}
                        placeholder="Имя"
                        disabled={formLocked}
                      />
                    </div>
                    <div
                      className={`${pageStyle.field} ${pageStyle.rolesField}`}
                    >
                      <label>Роли</label>
                      <div
                        className={pageStyle.rolesDropdownWrap}
                        ref={rolesDropdownRef}
                      >
                        <button
                          type="button"
                          className={pageStyle.rolesDropdownBtn}
                          onClick={() => setRolesDropdownOpen((v) => !v)}
                          disabled={formLocked}
                          aria-expanded={rolesDropdownOpen}
                        >
                          <span className={pageStyle.rolesDropdownText}>
                            {rolesCaption}
                          </span>
                          <span
                            className={pageStyle.rolesDropdownCaret}
                            aria-hidden
                          >
                            <img src={chevronDown} alt="" />
                          </span>
                        </button>
                        {rolesDropdownOpen ? (
                          <div className={pageStyle.rolesDropdownMenu}>
                            {ARTIST_ROLE_OPTIONS.map((option) => (
                              <label
                                key={option}
                                className={pageStyle.roleOption}
                              >
                                <input
                                  type="checkbox"
                                  checked={roles.includes(option)}
                                  onChange={() => toggleRole(option)}
                                  disabled={formLocked}
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className={`${pageStyle.field} ${pageStyle.descField}`}>
                    <label htmlFor="artist-desc">Описание</label>
                    <textarea
                      id="artist-desc"
                      className={pageStyle.descTextarea}
                      value={descPageValue}
                      onChange={onDescriptionChange}
                      placeholder="Описание"
                      spellCheck="false"
                      disabled={formLocked}
                    />
                    {descPageCount > 1 ? (
                      <div className={pageStyle.descPagination}>
                        <button
                          type="button"
                          className={style.pageNav}
                          aria-label="Предыдущая страница описания"
                          disabled={formLocked || descPage <= 1}
                          onClick={() => setDescPage((p) => Math.max(1, p - 1))}
                        >
                          ◀
                        </button>
                        <span className={style.pageCurrent}>{descPage}</span>
                        <button
                          type="button"
                          className={style.pageNav}
                          aria-label="Следующая страница описания"
                          disabled={formLocked || descPage >= descPageCount}
                          onClick={() =>
                            setDescPage((p) => Math.min(descPageCount, p + 1))
                          }
                        >
                          ▶
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className={pageStyle.catalogRegion}>
                <div
                  className={pageStyle.bottomRow}
                  role="tablist"
                  aria-label="Раздел медиатеки"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mediaTab === "albums"}
                    className={
                      mediaTab === "albums"
                        ? pageStyle.btnPrimary
                        : pageStyle.btnOutline
                    }
                    onClick={() => {
                      setMediaTab("albums");
                      resetTrackModal();
                    }}
                    disabled={formLocked}
                  >
                    Альбомы
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mediaTab === "tracks"}
                    className={
                      mediaTab === "tracks"
                        ? pageStyle.btnPrimary
                        : pageStyle.btnOutline
                    }
                    onClick={() => {
                      setMediaTab("tracks");
                      resetAlbumDraftFields();
                      setShowAddMediaPanel(false);
                    }}
                    disabled={formLocked}
                  >
                    Синглы
                  </button>
                </div>

                <input
                  ref={trackAudioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac"
                  className={pageStyle.hiddenInput}
                  aria-hidden
                  tabIndex={-1}
                  onChange={onTrackAudioSelected}
                />

                <button
                  type="button"
                  className={pageStyle.addCatalogLink}
                  onClick={() => {
                    if (formLocked) return;
                    if (mediaTab === "tracks") {
                      if (!artistId) {
                        setErrorMessage(
                          "Сохраните исполнителя, чтобы добавить треки",
                        );
                        return;
                      }
                      setTrackModalContext("artistTracks");
                      trackAudioInputRef.current?.click();
                    } else {
                      toggleAddMediaPanel();
                    }
                  }}
                  aria-expanded={
                    mediaTab === "albums" ? showAddMediaPanel : undefined
                  }
                  disabled={formLocked}
                >
                  Добавить
                </button>

                {showAddMediaPanel && mediaTab === "albums" ? (
                  <>
                    <div className={pageStyle.albumDraftCard}>
                      <input
                        ref={albumCoverInputRef}
                        type="file"
                        accept="image/*"
                        className={pageStyle.hiddenInput}
                        aria-hidden
                        tabIndex={-1}
                        onChange={onAlbumCoverSelected}
                      />
                      <button
                        type="button"
                        className={pageStyle.albumDraftCover}
                        onClick={pickAlbumCover}
                        disabled={formLocked}
                        aria-label="Обложка альбома"
                      >
                        {draftAlbumPreviewUrl ? (
                          <img
                            src={draftAlbumPreviewUrl}
                            alt=""
                            className={pageStyle.albumDraftCoverImg}
                          />
                        ) : (
                          <span
                            className={pageStyle.albumDraftCoverPlus}
                            aria-hidden
                          >
                            +
                          </span>
                        )}
                      </button>
                      <div className={pageStyle.albumDraftMain}>
                        <div className={pageStyle.albumDraftTopRow}>
                          <input
                            type="text"
                            className={pageStyle.albumDraftTitleInput}
                            placeholder="Название альбома"
                            value={draftAlbumTitle}
                            onChange={(e) => setDraftAlbumTitle(e.target.value)}
                            autoComplete="off"
                            disabled={formLocked}
                          />
                          <button
                            type="button"
                            className={pageStyle.albumDraftSaveBtn}
                            onClick={() => void saveDraftAlbumToBackend()}
                            disabled={formLocked}
                          >
                            {albumDraftSaving ? "Сохранение…" : "Сохранить"}
                          </button>
                        </div>
                        <div className={pageStyle.albumDraftMeta}>
                          <div
                            className={pageStyle.albumYearWithHint}
                            title="Нажмите на год для исправления"
                          >
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className={pageStyle.albumYearField}
                              value={draftAlbumYearInput}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/[^\d]/g, "");
                                setDraftAlbumYearInput(raw.slice(0, 4));
                              }}
                              onBlur={commitAlbumYearInput}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitAlbumYearInput();
                                }
                              }}
                              aria-label="Год выпуска"
                              disabled={formLocked}
                            />
                            <img
                              src={correctIcon}
                              alt=""
                              className={pageStyle.albumYearEditHintIcon}
                              aria-hidden
                            />
                          </div>
                          <span>{formatTrackCountRu(draftAlbumTrackCount)}</span>
                        </div>
                        <div className={pageStyle.albumDraftTrackActions}>
                          <button
                            type="button"
                            className={pageStyle.btnAddTrackOutline}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              commitAlbumYearInput();
                              if (!validateAlbumDraftRequired()) return;
                              setTrackModalContext("albumDraft");
                              setTrackModalAudioFile(null);
                              setTrackModalAudioUrl((prev) => {
                                if (prev) URL.revokeObjectURL(prev);
                                return "";
                              });
                              setTrackModalCoverFile(null);
                              setTrackModalCoverPreviewUrl((prev) => {
                                if (prev) URL.revokeObjectURL(prev);
                                return "";
                              });
                              setTrackModalTitle("");
                              setTrackModalGenreSearch("");
                              setTrackModalOpen(true);
                            }}
                            disabled={formLocked}
                          >
                            Добавить трек
                          </button>
                          <button
                            type="button"
                            className={pageStyle.albumDraftHideLink}
                            onClick={() => setShowAddMediaPanel(false)}
                            disabled={formLocked}
                          >
                            скрыть
                          </button>
                        </div>
                      </div>
                    </div>
                    {draftAlbumActiveTracks.length > 0 ||
                    draftAlbumDeletedTracks.length > 0 ? (
                      <section
                        className={pageStyle.albumDraftTracksSection}
                        aria-label="Треки нового альбома"
                      >
                        <div className={pageStyle.catalogColumns}>
                          <div className={pageStyle.catalogCol}>
                            <h3 className={pageStyle.catalogColTitle}>Активные</h3>
                            {draftAlbumActiveTracks.length > 0 ? (
                              <div className={pageStyle.trackDashWrap}>
                                <ul className={pageStyle.trackDashList}>
                                  {draftAlbumActiveTracks.map((t, idx) => {
                                    const isThis = listPlayingId === t.id;
                                    return (
                                      <li key={t.id} className={pageStyle.trackDashRow}>
                                        <span className={pageStyle.trackDashIndex}>{idx + 1}</span>
                                        <button
                                          type="button"
                                          className={pageStyle.trackDashPlay}
                                          onClick={() => toggleDraftTrackPlay(t)}
                                          disabled={formLocked}
                                          aria-label={
                                            isThis && listAudioPlaying ? "Пауза" : "Воспроизвести"
                                          }
                                        >
                                          {isThis && listAudioPlaying ? "⏸" : "▶"}
                                        </button>
                                        <div className={pageStyle.trackDashMeta}>
                                          <span className={pageStyle.trackDashTitle}>{t.name || "—"}</span>
                                          <span className={pageStyle.trackDashArtist}>
                                            {String(name || "").trim() || "—"}
                                          </span>
                                        </div>
                                        <span className={pageStyle.trackDashDur}>
                                          {formatTrackDurationDot(getTrackDurationSeconds(t))}
                                        </span>
                                        <button
                                          type="button"
                                          className={pageStyle.trackDashRemove}
                                          onClick={() => deleteDraftTrackFromList(t.id)}
                                          disabled={formLocked}
                                          aria-label="Удалить трек"
                                        >
                                          −
                                        </button>
                                        {renderTrackDashOverflowMenu(
                                          `draft-${t.id}`,
                                          formLocked,
                                          () =>
                                            openGenreEditModal(t, {
                                              kind: "draft",
                                              localId: t.id,
                                            }),
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            ) : (
                              <p className={pageStyle.catalogEmpty}>Нет треков</p>
                            )}
                          </div>
                          <div className={pageStyle.catalogCol}>
                            <h3 className={pageStyle.catalogColTitle}>Удаленные</h3>
                            {draftAlbumDeletedTracks.length > 0 ? (
                              <ul className={pageStyle.deletedTrackList}>
                                {draftAlbumDeletedTracks.map((t) => (
                                  <li key={t.id} className={pageStyle.deletedTrackItem}>
                                    <span className={pageStyle.deletedTrackName}>{t.name || "—"}</span>
                                    <div className={pageStyle.deletedTrackButtons}>
                                      <button
                                        type="button"
                                        className={`${pageStyle.deletedTrackAction} ${pageStyle.deletedTrackRestore}`}
                                        onClick={() => restoreDraftTrackFromList(t.id)}
                                        disabled={formLocked}
                                      >
                                        <span className={pageStyle.deletedTrackActionIcon}>+</span>
                                        <span className={pageStyle.deletedTrackActionLabel}>Восстановить</span>
                                      </button>
                                      <button
                                        type="button"
                                        className={pageStyle.deletedTrackActionDanger}
                                        onClick={() => finalizeDraftTrackDeleteFromList(t.id)}
                                        disabled={formLocked}
                                      >
                                        <span className={pageStyle.deletedTrackActionIcon}>−</span>
                                        <span className={pageStyle.deletedTrackActionLabel}>Удалить</span>
                                      </button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className={pageStyle.catalogEmpty}>Нет треков</p>
                            )}
                          </div>
                        </div>
                      </section>
                    ) : null}
                  </>
                ) : null}

                <section
                  className={pageStyle.catalogPanel}
                  aria-label={mediaTab === "albums" ? "Альбомы" : "Синглы"}
                >
                  {mediaTab === "tracks" ? (
                  <div className={pageStyle.catalogColumns}>
                    <div className={pageStyle.catalogCol}>
                      <h3 className={pageStyle.catalogColTitle}>Активные</h3>
                      {activeTracks.length > 0 ? (
                        <div className={pageStyle.trackDashWrap}>
                          <ul className={pageStyle.trackDashList}>
                            {activeTracks.map((t, idx) => {
                              const isThis = listPlayingId === t.id;
                              const isLoad = listPlayLoadingId === t.id;
                              return (
                                <li
                                  key={t.id}
                                  className={pageStyle.trackDashRow}
                                >
                                  <span className={pageStyle.trackDashIndex}>
                                    {idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    className={pageStyle.trackDashPlay}
                                    onClick={() => void toggleListTrackPlay(t)}
                                    disabled={formLocked || isLoad}
                                    aria-label={
                                    isThis && listAudioPlaying
                                        ? "Пауза"
                                        : "Воспроизвести"
                                    }
                                  >
                                    {isLoad
                                      ? "…"
                                    : isThis && listAudioPlaying
                                        ? "⏸"
                                        : "▶"}
                                  </button>
                                  <div className={pageStyle.trackDashMeta}>
                                    <span className={pageStyle.trackDashTitle}>
                                      {t.name || "—"}
                                    </span>
                                    <span className={pageStyle.trackDashArtist}>
                                      {String(name || "").trim() || "—"}
                                    </span>
                                  </div>
                                  <span className={pageStyle.trackDashDur}>
                                    {formatTrackDurationDot(getTrackDurationSeconds(t))}
                                  </span>
                                  <button
                                    type="button"
                                    className={pageStyle.trackDashRemove}
                                    onClick={() =>
                                      void deleteTrackFromList(t.id)
                                    }
                                    disabled={formLocked}
                                    aria-label="Удалить трек"
                                  >
                                    −
                                  </button>
                                  {renderTrackDashOverflowMenu(
                                    `tab-${t.id}`,
                                    formLocked || !Number.isFinite(Number(t.id)),
                                    () =>
                                      openGenreEditModal(t, {
                                        kind: "saved",
                                        trackId: Number(t.id),
                                      }),
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <p className={pageStyle.catalogEmpty}>
                          {emptyCatalogHint}
                        </p>
                      )}
                    </div>
                    <div className={pageStyle.catalogCol}>
                      <h3 className={pageStyle.catalogColTitle}>Удаленные</h3>
                      {deletedTracks.length > 0 ? (
                        <ul className={pageStyle.deletedTrackList}>
                          {deletedTracks.map((t) => (
                            <li key={t.id} className={pageStyle.deletedTrackItem}>
                              <span className={pageStyle.deletedTrackName}>
                                {t.name || "—"}
                              </span>
                              <div className={pageStyle.deletedTrackButtons}>
                              <button
                                type="button"
                                className={`${pageStyle.deletedTrackAction} ${pageStyle.deletedTrackRestore}`}
                                onClick={() =>
                                  void restoreTrackFromList(t.id)
                                }
                                disabled={formLocked}
                              >
                                <span className={pageStyle.deletedTrackActionIcon}>+</span>
                                <span className={pageStyle.deletedTrackActionLabel}>Восстановить</span>
                              </button>
                              <button
                                type="button"
                                className={pageStyle.deletedTrackActionDanger}
                                onClick={() =>
                                  setConfirmDeleteTrack({
                                    id: t.id,
                                    name: String(t.name || "").trim() || "этот трек",
                                  })
                                }
                                disabled={formLocked}
                              >
                                <span className={pageStyle.deletedTrackActionIcon}>−</span>
                                <span className={pageStyle.deletedTrackActionLabel}>Удалить</span>
                              </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={pageStyle.catalogEmpty}>Нет синглов</p>
                      )}
                    </div>
                  </div>
                  ) : (
                  renderAlbumCatalogSection()
                  )}
                  <div className={pageStyle.catalogFooterRule} aria-hidden />
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>

      {listAudioUrl ? (
        <AudioPlayer
          src={listAudioUrl}
          title={listPlayingTitle || "Трек"}
          artist={String(name || "").trim() || "Исполнитель"}
          coverSrc={listPlayingCoverUrl || ""}
          adminMode
          onPlayingChange={setListAudioPlaying}
          onEnded={handleAdminListAudioEnded}
          onClose={() => {
            listPlaybackQueueRef.current = null;
            setListAudioUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev);
              return null;
            });
            setListPlayingCoverUrl((prev) => {
              revokeListCoverIfOwned(prev);
              return "";
            });
            setListPlayingId(null);
            setListPlayingTitle("");
            setListAudioPlaying(false);
          }}
        />
      ) : null}

      {trackModalOpen ? (
        <div
          className={pageStyle.trackModalBackdrop}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !trackModalSaving) {
              resetTrackModal();
            }
          }}
        >
          <div
            className={pageStyle.trackModalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-modal-heading"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h2
              id="track-modal-heading"
              className={pageStyle.trackModalHeading}
            >
              {trackModalContext === "editGenres"
                ? "Жанры трека"
                : trackModalContext === "albumDraft"
                  ? "Новый трек альбома"
                  : trackModalContext === "savedAlbum"
                    ? "Новый трек в альбом"
                    : "Новый трек"}
            </h2>

            <div className={pageStyle.trackModalScroll}>
            {trackModalContext === "editGenres" ? (
              <p className={pageStyle.trackModalGenreEditHint}>{trackModalTitle}</p>
            ) : (
              <>
            <div className={pageStyle.trackModalField}>
              <span className={pageStyle.trackModalLabel}>Аудиофайл</span>
              <button
                type="button"
                className={pageStyle.trackModalPickAudio}
                onClick={() => trackAudioInputRef.current?.click()}
                disabled={trackModalSaving}
              >
                {trackModalAudioFile ? "Заменить файл" : "Выбрать файл"}
              </button>
              {trackModalAudioFile ? (
                <p className={pageStyle.trackModalFileName}>
                  {trackModalAudioFile.name}
                </p>
              ) : null}
            </div>

            {trackModalAudioUrl && trackModalAudioFile ? (
              <div className={pageStyle.trackModalField}>
                <audio
                  key={trackModalAudioUrl}
                  className={pageStyle.trackModalPlayer}
                  controls
                  src={trackModalAudioUrl}
                  playsInline
                />
              </div>
            ) : null}

            <div className={pageStyle.trackModalField}>
              <label
                className={pageStyle.trackModalLabel}
                htmlFor="track-modal-name"
              >
                Название трека
              </label>
              <input
                id="track-modal-name"
                type="text"
                className={pageStyle.trackModalInput}
                value={trackModalTitle}
                onChange={(e) => setTrackModalTitle(e.target.value)}
                placeholder="Название"
                autoComplete="off"
                disabled={trackModalSaving}
              />
            </div>
            {trackModalTagAlbum.trim() ? (
              <p className={pageStyle.trackModalTagHint}>
                Из файла — альбом: {trackModalTagAlbum}
              </p>
            ) : null}
              </>
            )}

            <div className={pageStyle.trackModalField}>
              <span className={pageStyle.trackModalLabel}>Жанры</span>
              {catalogGenres.length > 0 ? (
                <input
                  id="track-modal-genre-search"
                  type="search"
                  className={pageStyle.trackModalGenreSearchInput}
                  value={trackModalGenreSearch}
                  onChange={(e) => setTrackModalGenreSearch(e.target.value)}
                  placeholder="Поиск по жанрам"
                  autoComplete="off"
                  disabled={trackModalSaving || genreCreating}
                  aria-label="Поиск по жанрам"
                />
              ) : null}
              <div
                className={pageStyle.trackModalGenreList}
                role="group"
                aria-label="Жанры трека"
              >
                {catalogGenres.length === 0 ? (
                  <p className={pageStyle.trackModalGenreEmpty}>
                    Каталог пуст — добавьте жанр ниже.
                  </p>
                ) : trackModalFilteredGenres.length === 0 ? (
                  <p className={pageStyle.trackModalGenreEmpty}>
                    Ничего не найдено
                  </p>
                ) : (
                  trackModalFilteredGenres.map((g) => {
                    const gid = Number(g.id);
                    const checked =
                      Number.isFinite(gid) && trackModalGenreIds.includes(gid);
                    return (
                      <label
                        key={g.id}
                        className={pageStyle.trackModalGenreOption}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTrackModalGenre(gid)}
                          disabled={trackModalSaving || genreCreating}
                        />
                        <span>{g.name || `Жанр #${g.id}`}</span>
                      </label>
                    );
                  })
                )}
              </div>
              <div className={pageStyle.trackModalGenreAddRow}>
                <input
                  type="text"
                  className={pageStyle.trackModalGenreAddInput}
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  placeholder="Новый жанр"
                  autoComplete="off"
                  disabled={trackModalSaving || genreCreating}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void createGenreFromModal();
                    }
                  }}
                />
                <button
                  type="button"
                  className={pageStyle.trackModalGenreAddBtn}
                  onClick={() => void createGenreFromModal()}
                  disabled={
                    trackModalSaving ||
                    genreCreating ||
                    !String(newGenreName || "").trim()
                  }
                >
                  {genreCreating ? "…" : "Добавить"}
                </button>
              </div>
            </div>

            {trackModalContext !== "editGenres" ? (
            <div className={pageStyle.trackModalField}>
              <span className={pageStyle.trackModalLabel}>Обложка трека</span>
              <input
                ref={trackModalCoverInputRef}
                type="file"
                accept="image/*"
                className={pageStyle.hiddenInput}
                aria-hidden
                tabIndex={-1}
                onChange={onTrackModalCoverSelected}
              />
              <div className={pageStyle.trackModalCoverRow}>
                <button
                  type="button"
                  className={pageStyle.trackModalCoverBtn}
                  onClick={
                    trackModalContext === "albumDraft" ||
                    trackModalContext === "savedAlbum"
                      ? undefined
                      : pickTrackModalCover
                  }
                  disabled={
                    trackModalSaving ||
                    trackModalContext === "albumDraft" ||
                    trackModalContext === "savedAlbum"
                  }
                  aria-label={
                    trackModalContext === "albumDraft" ||
                    trackModalContext === "savedAlbum"
                      ? "Обложка альбома"
                      : "Обложка трека"
                  }
                >
                  {trackModalCoverPreviewUrl ? (
                    <img
                      src={trackModalCoverPreviewUrl}
                      alt=""
                      className={pageStyle.trackModalCoverImg}
                    />
                  ) : trackModalContext === "albumDraft" && draftAlbumPreviewUrl ? (
                    <img
                      src={draftAlbumPreviewUrl}
                      alt=""
                      className={pageStyle.trackModalCoverImg}
                    />
                  ) : trackModalContext === "savedAlbum" &&
                    savedAlbumModalTarget?.id &&
                    albumCoverBlobUrls[savedAlbumModalTarget.id] ? (
                    <img
                      src={albumCoverBlobUrls[savedAlbumModalTarget.id]}
                      alt=""
                      className={pageStyle.trackModalCoverImg}
                    />
                  ) : (
                    <span className={pageStyle.trackModalCoverPlus}>+</span>
                  )}
                </button>
              </div>
            </div>
            ) : null}
            </div>

            <div className={pageStyle.trackModalActions}>
              <button
                type="button"
                className={pageStyle.trackModalCancel}
                onClick={() => {
                  if (!trackModalSaving) resetTrackModal();
                }}
                disabled={trackModalSaving}
              >
                Отмена
              </button>
              {trackModalContext === "editGenres" ? (
                <button
                  type="button"
                  className={pageStyle.trackModalSave}
                  onClick={() => void saveGenreEditModal()}
                  disabled={trackModalSaving}
                >
                  {trackModalSaving ? "Сохранение…" : "Сохранить"}
                </button>
              ) : (
              <button
                type="button"
                className={pageStyle.trackModalSave}
                onClick={() => void saveTrackFromModal()}
                disabled={trackModalSaving || !trackModalAudioFile}
              >
                {trackModalSaving
                  ? "Сохранение…"
                  : trackModalContext === "albumDraft" ||
                      trackModalContext === "savedAlbum"
                    ? "Добавить в альбом"
                    : "Сохранить"}
              </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteAlbum ? (
        <div
          className={pageStyle.confirmModalBackdrop}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !finalDeleteSubmitting) {
              setConfirmDeleteAlbum(null);
            }
          }}
        >
          <div
            className={pageStyle.confirmModalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-album-heading"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3
              id="confirm-delete-album-heading"
              className={pageStyle.confirmModalHeading}
            >
              Удалить альбом окончательно?
            </h3>
            <p className={pageStyle.confirmModalText}>
              Альбом «{confirmDeleteAlbum.name}» и связанные треки будут удалены без возможности
              восстановления.
            </p>
            <div className={pageStyle.confirmModalActions}>
              <button
                type="button"
                className={pageStyle.confirmModalCancel}
                onClick={() => setConfirmDeleteAlbum(null)}
                disabled={finalDeleteSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={pageStyle.confirmModalDelete}
                onClick={() =>
                  void finalizeDeleteAlbumFromList(confirmDeleteAlbum.id)
                }
                disabled={finalDeleteSubmitting}
              >
                {finalDeleteSubmitting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteTrack ? (
        <div
          className={pageStyle.confirmModalBackdrop}
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !finalDeleteSubmitting) {
              setConfirmDeleteTrack(null);
            }
          }}
        >
          <div
            className={pageStyle.confirmModalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-delete-heading"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 id="confirm-delete-heading" className={pageStyle.confirmModalHeading}>
              Удалить трек окончательно?
            </h3>
            <p className={pageStyle.confirmModalText}>
              Трек «{confirmDeleteTrack.name}» будет удален без возможности восстановления.
            </p>
            <div className={pageStyle.confirmModalActions}>
              <button
                type="button"
                className={pageStyle.confirmModalCancel}
                onClick={() => setConfirmDeleteTrack(null)}
                disabled={finalDeleteSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={pageStyle.confirmModalDelete}
                onClick={() => void finalizeDeleteTrackFromList(confirmDeleteTrack.id)}
                disabled={finalDeleteSubmitting}
              >
                {finalDeleteSubmitting ? "Удаление…" : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminArtistAddPage;
