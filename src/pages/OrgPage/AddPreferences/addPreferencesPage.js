import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NavLink, useLocation, useParams } from "react-router-dom";

import index from "../../../index.module.css";
import orgPageStyle from "../orgPage.module.css";
import orgStyle from "../../venues/organizations.module.css";
import apStyle from "./addPreferencesPage.module.css";
import venueAdminStyle from "../../admin/venues/VenueAdmin.module.css";
import { WEEKDAY_CHIPS } from "./preferencesConstants";

import searchBlack from "../../../icons/search_black.png";

import Header from "../../../Component/HeaderListener/headerListener";
import StatusBanner from "../../../Component/StatusBanner/StatusBanner";

import Music from "../../../icons/music.png";
import Genres from "../../../icons/genres.png";
import Org from "../../../icons/org.png";
import ReturnPage from "../../../icons/return.png";
import {
  API_GATEWAY,
  getVenueCoverImageUrl,
  resolveVenueCoverFromDtoField,
} from "../../../utils/venueMediaUrls";

function urlVenueById(id) {
  return `${API_GATEWAY}/space/venue/${id}`;
}

function formatCityHeading(city) {
  const c = String(city ?? "").trim();
  if (!c) return "—";
  if (/^г\.?\s/i.test(c)) {
    return c.replace(/^г\./i, "Г.");
  }
  return `Г. ${c}`;
}

function addressRowLabel(row) {
  const line = String(row?.addressCity ?? "").trim();
  if (line) return line;
  const fallback = [row?.country, row?.city].filter(Boolean).join(", ");
  return fallback || "—";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

const TIME_PICKER_HOURS = Array.from({ length: 24 }, (_, i) => pad2(i));
const TIME_PICKER_MINUTES = Array.from({ length: 60 }, (_, i) => pad2(i));

function toIsoDate(y, m0, d) {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}

function buildCalendarCells(year, month0) {
  const first = new Date(year, month0, 1);
  const startPad = (first.getDay() + 6) % 7;
  const cells = [];
  let d = 1 - startPad;
  for (let i = 0; i < 42; i++) {
    const dt = new Date(year, month0, d);
    const inMonth = dt.getMonth() === month0;
    const y = dt.getFullYear();
    const m = dt.getMonth();
    const day = dt.getDate();
    cells.push({
      iso: toIsoDate(y, m, day),
      day,
      inMonth,
    });
    d += 1;
  }
  return cells;
}

function customIntervalPairKey(from, to) {
  return `${String(from)}|${String(to)}`;
}

/** Повторяющиеся пары «с — до»: для UI и блокировки «+». */
function getCustomIntervalDuplicateState(rows) {
  const counts = new Map();
  for (const r of rows) {
    const k = customIntervalPairKey(r.from, r.to);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const dupKeys = new Set();
  for (const [k, c] of counts) {
    if (c >= 2) dupKeys.add(k);
  }
  if (dupKeys.size === 0) {
    return { hasDuplicate: false, duplicateRowIds: new Set() };
  }
  const duplicateRowIds = new Set();
  for (const r of rows) {
    if (dupKeys.has(customIntervalPairKey(r.from, r.to))) {
      duplicateRowIds.add(r.id);
    }
  }
  return { hasDuplicate: true, duplicateRowIds };
}

function parseIntervalTimeParts(value) {
  const parts = String(value ?? "00:00").split(":");
  const hRaw = parseInt(parts[0], 10);
  const mRaw = parseInt(parts[1], 10);
  const h = Number.isFinite(hRaw) ? Math.min(23, Math.max(0, hRaw)) : 0;
  const m = Number.isFinite(mRaw) ? Math.min(59, Math.max(0, mRaw)) : 0;
  return { h: pad2(h), m: pad2(m) };
}

/**
 * Время: как раньше — один щелчок открывает список; плюс ввод ЧЧ:ММ с клавиатуры.
 * Пока список открыт, щелчок по полю только ставит курсор (список не закрывается).
 */
function PrefIntervalTimePicker({
  value,
  onChange,
  ariaLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const { h, m } = useMemo(() => parseIntervalTimeParts(value), [value]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (ev) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target)) {
        setOpen(false);
      }
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleBlur = useCallback(() => {
    const p = parseIntervalTimeParts(value);
    const norm = `${p.h}:${p.m}`;
    if (norm !== value) onChange(norm);
  }, [value, onChange]);

  const handleInputKeyDown = useCallback(
    (ev) => {
      if (disabled) return;
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setOpen(true);
      }
    },
    [disabled],
  );

  const handleInputClick = useCallback(() => {
    if (disabled) return;
    if (!open) setOpen(true);
  }, [open, disabled]);

  return (
    <div className={apStyle.prefTimePickerWrap} ref={wrapRef}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        maxLength={5}
        className={apStyle.prefTimePickerTrigger}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
        onClick={handleInputClick}
        onKeyDown={handleInputKeyDown}
        aria-label={ariaLabel}
        aria-expanded={open}
        title="Введите время (ЧЧ:ММ) или щёлкните по полю, чтобы открыть список; клавиша «вниз» — тоже открывает список."
      />
      {open && !disabled ? (
        <div className={apStyle.prefTimePickerPopover} role="dialog">
          <div className={apStyle.prefTimePickerCol} aria-label="Часы">
            {TIME_PICKER_HOURS.map((hh) => (
              <button
                key={hh}
                type="button"
                className={`${apStyle.prefTimePickerCell} ${hh === h ? apStyle.prefTimePickerCellSel : ""}`}
                onClick={() => {
                  onChange(`${hh}:${m}`);
                  setOpen(false);
                }}
              >
                {hh}
              </button>
            ))}
          </div>
          <div className={apStyle.prefTimePickerCol} aria-label="Минуты">
            {TIME_PICKER_MINUTES.map((mm) => (
              <button
                key={mm}
                type="button"
                className={`${apStyle.prefTimePickerCell} ${mm === m ? apStyle.prefTimePickerCellSel : ""}`}
                onClick={() => {
                  onChange(`${h}:${mm}`);
                  setOpen(false);
                }}
              >
                {mm}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const MONTH_NAMES_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const VOLUME_OPTIONS = [
  {
    id: "quiet",
    title: "Тихо",
    hint: "не мешает разговору, удобно для чтения",
  },
  {
    id: "medium",
    title: "Средне",
    hint: "не мешает разговору",
  },
  {
    id: "loud",
    title: "Громко",
    hint: "не подходит для спокойного разговора",
  },
];

const TIME_PRESETS = [
  { id: "morning", label: "Утро", sub: "06:00 — 12:00" },
  { id: "day", label: "День", sub: "12:00 — 17:00" },
  { id: "evening", label: "Вечер", sub: "17:00 — 22:00" },
  { id: "night", label: "Ночь", sub: "22:00 — 06:00" },
];

function initialCalMonth() {
  const n = new Date();
  return { y: n.getFullYear(), m: n.getMonth() };
}

const AddPreferencesPage = () => {
  const { venueId } = useParams();
  const location = useLocation();
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(Boolean(venueId));
  const [error, setError] = useState("");
  const [coverStep, setCoverStep] = useState(0);
  const [localSelectedIds, setLocalSelectedIds] = useState(() => new Set());

  const nextBlockId = useRef(2);
  const nextIntervalId = useRef(2);
  const [scheduleBlocks, setScheduleBlocks] = useState(() => [
    {
      id: 1,
      weekDays: new Set(),
      customIntervalsEditorOpen: false,
      timePresetsSelected: new Set(),
      timeIrrelevant: false,
      customIntervals: [],
      calMonth: initialCalMonth(),
      pickedDates: new Set(),
    },
  ]);

  const [volumeLevels, setVolumeLevels] = useState(() => new Set());
  const [genreQuery, setGenreQuery] = useState("");
  const [genres, setGenres] = useState([]);
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreError, setGenreError] = useState("");
  const [pickedGenreIds, setPickedGenreIds] = useState(() => new Set());
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");

  const idNum = useMemo(() => {
    if (venueId == null || venueId === "") return NaN;
    const n = Number(venueId);
    return Number.isFinite(n) ? n : NaN;
  }, [venueId]);

  const selectedAddressIds = useMemo(() => {
    const raw = location.state?.selectedAddressIds;
    if (!Array.isArray(raw)) return new Set();
    const next = new Set();
    for (const v of raw) {
      const n = Number(v);
      if (Number.isFinite(n)) next.add(n);
    }
    return next;
  }, [location.state]);

  useEffect(() => {
    if (!Number.isFinite(idNum)) {
      setVenue(null);
      setLoading(false);
      setError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    setVenue(null);
    setCoverStep(0);

    const token = localStorage.getItem("accessToken");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    fetch(urlVenueById(idNum), { headers })
      .then((res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setVenue(data);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVenue(null);
          setError("Не удалось загрузить заведение");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idNum]);

  const coverSrc = useMemo(() => {
    if (!venue) return "";
    if (coverStep >= 2) return "";
    if (coverStep === 1) {
      return resolveVenueCoverFromDtoField(venue.cover) || "";
    }
    const byId = getVenueCoverImageUrl(venue.id);
    if (byId) return byId;
    return resolveVenueCoverFromDtoField(venue.cover) || "";
  }, [venue, coverStep]);

  const name =
    venue?.name != null && String(venue.name).trim() ? String(venue.name) : "—";

  const crumbVenueLabel =
    venue && !loading ? name : Number.isFinite(idNum) ? "…" : "—";

  const selectedRows = useMemo(() => {
    if (!venue?.addresses || !Array.isArray(venue.addresses)) return [];
    const list = [];
    for (const row of venue.addresses) {
      const id = row?.id;
      if (id == null) continue;
      if (!selectedAddressIds.has(Number(id))) continue;
      list.push(row);
    }
    list.sort((a, b) => {
      const ca = String(a?.city ?? "").localeCompare(
        String(b?.city ?? ""),
        "ru",
      );
      if (ca !== 0) return ca;
      return addressRowLabel(a).localeCompare(addressRowLabel(b), "ru");
    });
    return list;
  }, [venue?.addresses, selectedAddressIds]);

  useEffect(() => {
    const next = new Set();
    for (const row of selectedRows) {
      const id = row?.id;
      if (id != null) next.add(Number(id));
    }
    setLocalSelectedIds(next);
  }, [selectedRows]);

  const toggleLocalAddress = (id) => {
    if (id == null) return;
    setLocalSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBlockWeekDay = useCallback((blockId, dayId) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        const ws = new Set(block.weekDays);
        if (ws.has(dayId)) ws.delete(dayId);
        else ws.add(dayId);
        return { ...block, weekDays: ws };
      }),
    );
  }, []);

  const toggleBlockTimePreset = useCallback((blockId, presetId) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        if (block.timeIrrelevant) return block;
        const next = new Set(block.timePresetsSelected);
        if (next.has(presetId)) next.delete(presetId);
        else next.add(presetId);
        return { ...block, timePresetsSelected: next };
      }),
    );
  }, []);

  const toggleBlockTimeIrrelevant = useCallback((blockId) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        const turningOn = !block.timeIrrelevant;
        if (turningOn) {
          return {
            ...block,
            timeIrrelevant: true,
            timePresetsSelected: new Set(),
            customIntervalsEditorOpen: false,
            customIntervals: [],
          };
        }
        return { ...block, timeIrrelevant: false };
      }),
    );
  }, []);

  const openCustomIntervalsEditor = useCallback((blockId) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        if (block.timeIrrelevant) return block;
        if (block.customIntervalsEditorOpen) return block;
        return {
          ...block,
          customIntervalsEditorOpen: true,
          customIntervals: [
            {
              id: nextIntervalId.current++,
              from: "12:00",
              to: "17:00",
            },
          ],
        };
      }),
    );
  }, []);

  const closeCustomIntervalsEditor = useCallback((blockId) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              customIntervalsEditorOpen: false,
              customIntervals: [],
            }
          : block,
      ),
    );
  }, []);

  const addScheduleBlock = useCallback(() => {
    setScheduleBlocks((blocks) => {
      const newBlockId = nextBlockId.current++;
      return [
        ...blocks,
        {
          id: newBlockId,
          weekDays: new Set(),
          customIntervalsEditorOpen: false,
          timePresetsSelected: new Set(),
          timeIrrelevant: false,
          customIntervals: [],
          calMonth: initialCalMonth(),
          pickedDates: new Set(),
        },
      ];
    });
  }, []);

  const removeScheduleBlock = useCallback((blockId) => {
    setScheduleBlocks((blocks) =>
      blocks.length <= 1 ? blocks : blocks.filter((b) => b.id !== blockId),
    );
  }, []);

  const toggleVolumeLevel = useCallback((id) => {
    setVolumeLevels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const blockDupStates = useMemo(
    () =>
      scheduleBlocks.map((b) =>
        b.customIntervalsEditorOpen
          ? getCustomIntervalDuplicateState(b.customIntervals)
          : { hasDuplicate: false, duplicateRowIds: new Set() },
      ),
    [scheduleBlocks],
  );

  const hasAnyIntervalDup = blockDupStates.some((s) => s.hasDuplicate);

  const [duplicateFlashOn, setDuplicateFlashOn] = useState(false);
  const dupEnteredRef = useRef(false);
  const dupFlashTimerRef = useRef(null);

  useEffect(() => {
    const dup = hasAnyIntervalDup;
    if (!dup) {
      dupEnteredRef.current = false;
      setDuplicateFlashOn(false);
      if (dupFlashTimerRef.current != null) {
        clearTimeout(dupFlashTimerRef.current);
        dupFlashTimerRef.current = null;
      }
      return;
    }
    if (!dupEnteredRef.current) {
      dupEnteredRef.current = true;
      setDuplicateFlashOn(true);
      if (dupFlashTimerRef.current != null) {
        clearTimeout(dupFlashTimerRef.current);
      }
      dupFlashTimerRef.current = setTimeout(() => {
        setDuplicateFlashOn(false);
        dupFlashTimerRef.current = null;
      }, 2500);
    }
  }, [hasAnyIntervalDup]);

  useEffect(
    () => () => {
      if (dupFlashTimerRef.current != null) {
        clearTimeout(dupFlashTimerRef.current);
      }
    },
    [],
  );

  const showDuplicateFlash = duplicateFlashOn && hasAnyIntervalDup;

  const addCustomIntervalRow = useCallback((blockId) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        if (block.timeIrrelevant) return block;
        if (!block.customIntervalsEditorOpen) return block;
        if (getCustomIntervalDuplicateState(block.customIntervals).hasDuplicate)
          return block;
        return {
          ...block,
          customIntervals: [
            ...block.customIntervals,
            {
              id: nextIntervalId.current++,
              from: "09:00",
              to: "12:00",
            },
          ],
        };
      }),
    );
  }, []);

  const removeCustomIntervalRow = useCallback((blockId, rowId) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        if (block.timeIrrelevant) return block;
        if (!block.customIntervalsEditorOpen) return block;
        if (block.customIntervals.length <= 1) {
          return {
            ...block,
            customIntervalsEditorOpen: false,
            customIntervals: [],
          };
        }
        return {
          ...block,
          customIntervals: block.customIntervals.filter((r) => r.id !== rowId),
        };
      }),
    );
  }, []);

  const updateCustomInterval = useCallback((blockId, rowId, field, value) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        if (block.timeIrrelevant) return block;
        if (!block.customIntervalsEditorOpen) return block;
        return {
          ...block,
          customIntervals: block.customIntervals.map((r) =>
            r.id === rowId ? { ...r, [field]: value } : r,
          ),
        };
      }),
    );
  }, []);

  const toggleBlockCalendarDate = useCallback((blockId, iso) => {
    setScheduleBlocks((blocks) => {
      const now = new Date();
      const todayIso = toIsoDate(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      return blocks.map((block) => {
        if (block.id !== blockId) return block;
        const dates = new Set(block.pickedDates ?? []);
        if (dates.has(iso)) {
          dates.delete(iso);
          return { ...block, pickedDates: dates };
        }
        if (iso < todayIso) return block;
        dates.add(iso);
        return { ...block, pickedDates: dates };
      });
    });
  }, []);

  const shiftBlockCalMonth = useCallback((blockId, delta) => {
    setScheduleBlocks((blocks) =>
      blocks.map((block) => {
        if (block.id !== blockId) return block;
        const cm = block.calMonth ?? initialCalMonth();
        const d = new Date(cm.y, cm.m + delta, 1);
        if (delta < 0) {
          const now = new Date();
          const minY = now.getFullYear();
          const minM = now.getMonth();
          if (
            d.getFullYear() < minY ||
            (d.getFullYear() === minY && d.getMonth() < minM)
          ) {
            return block;
          }
        }
        return { ...block, calMonth: { y: d.getFullYear(), m: d.getMonth() } };
      }),
    );
  }, []);

  const filteredGenres = useMemo(() => {
    const q = genreQuery.trim().toLowerCase();
    if (!q) return genres;
    return genres.filter((g) => String(g.name).toLowerCase().includes(q));
  }, [genreQuery, genres]);

  const toggleGenre = useCallback((genreId) => {
    setPickedGenreIds((prev) => {
      const next = new Set(prev);
      if (next.has(genreId)) next.delete(genreId);
      else next.add(genreId);
      return next;
    });
  }, []);

  const removeGenre = useCallback((genreId) => {
    setPickedGenreIds((prev) => {
      const next = new Set(prev);
      next.delete(genreId);
      return next;
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    setGenreLoading(true);
    setGenreError("");
    fetch(`${API_GATEWAY}/space/media/genre/all`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error("genre_fetch_failed");
        return res.json();
      })
      .then((data) => {
        const mapped = Array.isArray(data)
          ? data
              .filter((g) => g && g.id != null && g.name != null)
              .map((g) => ({ id: Number(g.id), name: String(g.name) }))
          : [];
        mapped.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        setGenres(mapped);
      })
      .catch(() => {
        setGenreError("Не удалось загрузить жанры");
      })
      .finally(() => {
        setGenreLoading(false);
      });
  }, []);

  const handleSave = () => {
    if (saveLoading) return;
    setSaveError("");
    setSaveOk("");

    const token = localStorage.getItem("accessToken");
    const userIdRaw = localStorage.getItem("userId");
    const userIdNum = Number(userIdRaw);
    if (!Number.isFinite(userIdNum) || userIdNum <= 0) {
      setSaveError("Не найден userId. Перезайдите в аккаунт");
      return;
    }
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const payload = {
      userId: userIdNum,
      venueId: Number.isFinite(idNum) ? idNum : null,
      addressIds: Array.from(localSelectedIds),
      scheduleBlocks: scheduleBlocks.map((b) => ({
        weekDays: Array.from(b.weekDays).sort(
          (a, d) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(d),
        ),
        timePresets: Array.from(b.timePresetsSelected),
        customIntervals: b.customIntervalsEditorOpen
          ? b.customIntervals.map(({ from, to }) => ({ from, to }))
          : [],
        timeIrrelevant: Boolean(b.timeIrrelevant),
        specificDates: Array.from(b.pickedDates ?? []).sort(),
      })),
      volumeLevels: Array.from(volumeLevels),
      genreIds: Array.from(pickedGenreIds),
    };

    setSaveLoading(true);
    fetch(`${API_GATEWAY}/space/personalization/preferences`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("save_failed");
        return res.json();
      })
      .then(() => {
        setSaveOk("Предпочтения сохранены");
      })
      .catch(() => {
        setSaveError("Не удалось сохранить предпочтения");
      })
      .finally(() => {
        setSaveLoading(false);
      });
  };

  return (
    <div className={`${index.mainListener} ${orgPageStyle.orgPageRoot}`}>
      <Header />
      <div className={`${orgStyle.main} ${orgPageStyle.orgPageMain}`}>
        <div className={orgStyle.icons}>
          <NavLink to="/main">
            <img src={Music} alt="" />
          </NavLink>
          <NavLink to="/main">
            <img src={Genres} alt="" />
          </NavLink>
          <NavLink to="/venues">
            <img src={Org} alt="" />
          </NavLink>
        </div>
        <div className={orgPageStyle.form}>
          {Number.isFinite(idNum) ? (
            <nav
              className={apStyle.addPrefsBreadcrumbRow}
              aria-label="Навигация"
            >
              <NavLink
                className={apStyle.addPrefsBreadcrumbBack}
                to={`/orgPage/${venueId}`}
                aria-label="К карточке заведения"
                title="К карточке заведения"
              >
                <img
                  src={ReturnPage}
                  alt=""
                  className={apStyle.addPrefsBreadcrumbIcon}
                />
              </NavLink>
              <div className={apStyle.addPrefsBreadcrumbLinks}>
                <NavLink className={apStyle.addPrefsCrumbLink} to="/venues">
                  Общественные места
                </NavLink>
                <span className={apStyle.addPrefsCrumbSep} aria-hidden="true">
                  /
                </span>
                <NavLink
                  className={apStyle.addPrefsCrumbVenue}
                  to={`/orgPage/${venueId}`}
                >
                  {crumbVenueLabel}
                </NavLink>
              </div>
            </nav>
          ) : null}

          {!Number.isFinite(idNum) ? (
            <p className={orgPageStyle.hint}>
              Выберите заведение в списке на странице «Общественные заведения».
            </p>
          ) : null}

          {Number.isFinite(idNum) && loading ? (
            <p className={orgPageStyle.hint}>Загрузка…</p>
          ) : null}

          {Number.isFinite(idNum) && error ? (
            <p className={orgPageStyle.hint}>{error}</p>
          ) : null}

          {venue && !loading ? (
            <div className={apStyle.addPrefsInner}>
              <h1 className={apStyle.addPrefsPageHeading}>Ваши предпочтения</h1>

              {selectedAddressIds.size === 0 ? (
                <div className={apStyle.addPrefsEmpty}>
                  <p className={apStyle.addPrefsEmptyTitle}>
                    Адреса не переданы
                  </p>
                  <p className={apStyle.addPrefsEmptyText}>
                    Вернитесь к карточке заведения, отметьте хотя бы один адрес
                    и снова нажмите «Добавить предпочтения».
                  </p>
                  <p className={apStyle.addPrefsEmptyText}>
                    <NavLink
                      className={apStyle.addPrefsBackLink}
                      to={`/orgPage/${venueId}`}
                    >
                      Перейти к выбору адресов
                    </NavLink>
                  </p>
                </div>
              ) : (
                <>
                  <div className={apStyle.addPrefsHeroPanel}>
                    <div className={apStyle.addPrefsHeroImgWrap}>
                      {coverSrc ? (
                        <img
                          key={`${venue.id}-${coverStep}`}
                          src={coverSrc}
                          alt=""
                          onError={() => {
                            setCoverStep((step) => {
                              if (step >= 2) return 2;
                              if (step === 0) {
                                const legacy = resolveVenueCoverFromDtoField(
                                  venue?.cover,
                                );
                                return legacy ? 1 : 2;
                              }
                              return 2;
                            });
                          }}
                        />
                      ) : null}
                    </div>
                    <div className={apStyle.addPrefsHeroContent}>
                      <p className={apStyle.addPrefsVenueName}>{name}</p>
                      <div className={apStyle.addPrefsAddressCards}>
                        {selectedRows.length === 0 ? (
                          <p className={apStyle.addPrefsNoAddresses}>
                            Выбранные адреса не найдены в данных заведения.
                          </p>
                        ) : (
                          selectedRows.map((row, idx) => {
                            const id = row?.id;
                            const city = String(row?.city ?? "").trim() || "—";
                            const label = addressRowLabel(row);
                            const selected =
                              id != null && localSelectedIds.has(Number(id));
                            const rowKey =
                              id != null ? String(id) : `addr-${idx}`;
                            return (
                              <div
                                key={rowKey}
                                className={`${apStyle.addPrefsAddressCard} ${id != null ? apStyle.addPrefsAddressCardClickable : ""}`}
                                role={id != null ? "checkbox" : undefined}
                                aria-checked={id != null ? selected : undefined}
                                aria-label={
                                  id != null
                                    ? selected
                                      ? `Снять выбор: ${label}`
                                      : `Выбрать: ${label}`
                                    : undefined
                                }
                                tabIndex={id != null ? 0 : -1}
                                onClick={() =>
                                  id != null && toggleLocalAddress(Number(id))
                                }
                                onKeyDown={(e) => {
                                  if (id == null) return;
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleLocalAddress(Number(id));
                                  }
                                }}
                              >
                                <p className={apStyle.addPrefsAddressCardCity}>
                                  {formatCityHeading(city)}
                                </p>
                                <div className={apStyle.addPrefsAddressCardRow}>
                                  <div
                                    className={orgPageStyle.venueWebLinkScroll}
                                    title={label}
                                  >
                                    <span
                                      className={orgPageStyle.venueAddressText}
                                    >
                                      {label}
                                    </span>
                                  </div>
                                  <span
                                    aria-hidden
                                    className={`${orgPageStyle.venueAddressCheck} ${selected ? orgPageStyle.venueAddressCheckOn : ""} ${id == null ? orgPageStyle.venueAddressCheckInactive : ""}`}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={apStyle.addPrefsMainBlock}>
                    <div className={apStyle.addPrefsThreeCol}>
                      <div className={apStyle.addPrefsColSettings}>
                        <section className={apStyle.prefSection}>
                          <h2 className={apStyle.prefSectionTitle}>
                            Когда проигрывать музыку
                          </h2>
                          <p className={apStyle.prefSectionLead}>
                            В рамках одной анкеты можно указать только один
                            набор музыкальных предпочтений
                          </p>
                          <p className={apStyle.prefHint}>
                            Добавьте второе расписание, чтобы задать другое
                            время для выходных, смены графика и т.п.
                          </p>

                          {(() => {
                            const todayNow = new Date();
                            const todayIso = toIsoDate(
                              todayNow.getFullYear(),
                              todayNow.getMonth(),
                              todayNow.getDate(),
                            );
                            return scheduleBlocks.map((block, blockIndex) => {
                              const dupState = blockDupStates[blockIndex];
                              const blockDates = block.pickedDates ?? new Set();
                              const blockCal =
                                block.calMonth ?? initialCalMonth();
                              const canGoCalPrev =
                                blockCal.y > todayNow.getFullYear() ||
                                (blockCal.y === todayNow.getFullYear() &&
                                  blockCal.m > todayNow.getMonth());
                              return (
                                <div
                                  key={block.id}
                                  className={apStyle.prefScheduleBlock}
                                >
                                  <div
                                    className={apStyle.prefScheduleBlockHead}
                                  >
                                    <div
                                      className={
                                        apStyle.prefScheduleBlockTitles
                                      }
                                    >
                                      <span
                                        className={
                                          apStyle.prefScheduleBlockName
                                        }
                                      >
                                        Расписание {blockIndex + 1}
                                      </span>
                                    </div>
                                    {scheduleBlocks.length > 1 ? (
                                      <button
                                        type="button"
                                        className={
                                          apStyle.prefScheduleBlockRemoveBtn
                                        }
                                        onClick={() =>
                                          removeScheduleBlock(block.id)
                                        }
                                      >
                                        Удалить
                                      </button>
                                    ) : null}
                                  </div>

                                  <fieldset className={apStyle.prefFieldset}>
                                    <legend className={apStyle.prefLegend}>
                                      Время суток
                                    </legend>
                                    <p className={apStyle.prefHint}>
                                      Можно выбрать готовый промежуток времени,
                                      добавить свой интервал или указать и то, и
                                      другое
                                    </p>
                                    <div
                                      className={`${apStyle.prefToggleGrid} ${apStyle.prefToggleGridTime}`}
                                    >
                                      {TIME_PRESETS.map((p) => {
                                        const on =
                                          block.timePresetsSelected.has(p.id);
                                        return (
                                          <button
                                            key={p.id}
                                            type="button"
                                            className={`${apStyle.prefToggleTile} ${on ? apStyle.prefToggleTileOn : ""}`}
                                            aria-pressed={on}
                                            disabled={Boolean(
                                              block.timeIrrelevant,
                                            )}
                                            onClick={() =>
                                              toggleBlockTimePreset(
                                                block.id,
                                                p.id,
                                              )
                                            }
                                          >
                                            <span
                                              className={
                                                apStyle.prefToggleTitle
                                              }
                                            >
                                              {p.label}
                                            </span>
                                            <span
                                              className={apStyle.prefToggleSub}
                                            >
                                              {p.sub}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </fieldset>

                                  {!block.customIntervalsEditorOpen ? (
                                    <div
                                      className={
                                        apStyle.prefCustomIntervalsIntro
                                      }
                                    >
                                      <button
                                        type="button"
                                        className={
                                          apStyle.prefAddCustomIntervalsBtn
                                        }
                                        disabled={Boolean(block.timeIrrelevant)}
                                        onClick={() =>
                                          openCustomIntervalsEditor(block.id)
                                        }
                                      >
                                        + Добавить интервал времени
                                      </button>
                                    </div>
                                  ) : (
                                    <fieldset className={apStyle.prefFieldset}>
                                      <legend className={apStyle.prefLegend}>
                                        Интервалы времени
                                      </legend>
                                      {dupState.hasDuplicate ? (
                                        <div
                                          className={
                                            apStyle.prefDuplicateBanner
                                          }
                                          role="alert"
                                        >
                                          Вы указали 2 одинаковых промежутка
                                          времени
                                        </div>
                                      ) : null}
                                      <div className={apStyle.prefIntervalRows}>
                                        {block.customIntervals.map(
                                          (row, index) => {
                                            const rowDup =
                                              showDuplicateFlash &&
                                              dupState.duplicateRowIds.has(
                                                row.id,
                                              );
                                            return (
                                              <div
                                                key={row.id}
                                                className={`${apStyle.prefIntervalRow} ${rowDup ? apStyle.prefIntervalRowError : ""}`}
                                              >
                                                <div
                                                  className={
                                                    apStyle.prefIntervalFields
                                                  }
                                                >
                                                  <div
                                                    className={
                                                      apStyle.prefTimeRow
                                                    }
                                                  >
                                                    <label
                                                      className={
                                                        apStyle.prefTimeLabel
                                                      }
                                                    >
                                                      С
                                                      <PrefIntervalTimePicker
                                                        value={row.from}
                                                        disabled={Boolean(
                                                          block.timeIrrelevant,
                                                        )}
                                                        onChange={(v) =>
                                                          updateCustomInterval(
                                                            block.id,
                                                            row.id,
                                                            "from",
                                                            v,
                                                          )
                                                        }
                                                        ariaLabel={`Блок ${blockIndex + 1}, время «с», строка ${index + 1}`}
                                                      />
                                                    </label>
                                                    <label
                                                      className={
                                                        apStyle.prefTimeLabel
                                                      }
                                                    >
                                                      До
                                                      <PrefIntervalTimePicker
                                                        value={row.to}
                                                        disabled={Boolean(
                                                          block.timeIrrelevant,
                                                        )}
                                                        onChange={(v) =>
                                                          updateCustomInterval(
                                                            block.id,
                                                            row.id,
                                                            "to",
                                                            v,
                                                          )
                                                        }
                                                        ariaLabel={`Блок ${blockIndex + 1}, время «до», строка ${index + 1}`}
                                                      />
                                                    </label>
                                                  </div>
                                                </div>
                                                <div
                                                  className={
                                                    apStyle.prefIntervalRowBtns
                                                  }
                                                >
                                                  <button
                                                    type="button"
                                                    className={
                                                      apStyle.prefIntervalRowBtn
                                                    }
                                                    disabled={Boolean(
                                                      block.timeIrrelevant,
                                                    )}
                                                    onClick={() =>
                                                      removeCustomIntervalRow(
                                                        block.id,
                                                        row.id,
                                                      )
                                                    }
                                                    aria-label="Удалить интервал"
                                                  >
                                                    −
                                                  </button>
                                                </div>
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                      <div
                                        className={
                                          apStyle.prefIntervalFooterActions
                                        }
                                      >
                                        <button
                                          type="button"
                                          className={apStyle.prefIntervalAddBtn}
                                          disabled={
                                            dupState.hasDuplicate ||
                                            Boolean(block.timeIrrelevant)
                                          }
                                          onClick={() =>
                                            addCustomIntervalRow(block.id)
                                          }
                                        >
                                          Добавить
                                        </button>
                                        <button
                                          type="button"
                                          className={
                                            apStyle.prefRemoveCustomIntervalsBtn
                                          }
                                          onClick={() =>
                                            closeCustomIntervalsEditor(block.id)
                                          }
                                        >
                                          Удалить все интервалы
                                        </button>
                                      </div>
                                    </fieldset>
                                  )}

                                  <div
                                    className={apStyle.prefTimeIrrelevantRow}
                                  >
                                    <div
                                      role="checkbox"
                                      aria-checked={Boolean(
                                        block.timeIrrelevant,
                                      )}
                                      tabIndex={0}
                                      className={`${apStyle.prefGenreRow} ${apStyle.prefTimeIrrelevantToggle}`}
                                      onClick={() =>
                                        toggleBlockTimeIrrelevant(block.id)
                                      }
                                      onKeyDown={(e) => {
                                        if (
                                          e.key === "Enter" ||
                                          e.key === " "
                                        ) {
                                          e.preventDefault();
                                          toggleBlockTimeIrrelevant(block.id);
                                        }
                                      }}
                                    >
                                      <span
                                        className={`${orgPageStyle.venueAddressCheck} ${block.timeIrrelevant ? orgPageStyle.venueAddressCheckOn : apStyle.prefGenreToggleOff}`}
                                        aria-hidden
                                      />
                                      <span className={apStyle.prefGenreName}>
                                        Время не важно
                                      </span>
                                    </div>
                                  </div>
                                  {block.timeIrrelevant ? (
                                    <p className={apStyle.prefHint}>
                                      При включённом «Время не важно» не
                                      разрешено выбирать и указывать промежутки
                                      времени
                                    </p>
                                  ) : null}

                                  <fieldset className={apStyle.prefFieldset}>
                                    <legend className={apStyle.prefLegend}>
                                      Дни недели
                                    </legend>
                                    <p className={apStyle.prefHint}>
                                      Один и тот же день недели можно указать в
                                      нескольких расписаниях
                                    </p>
                                    <div className={apStyle.prefDayChips}>
                                      {WEEKDAY_CHIPS.map(
                                        ({ id: dId, label }) => (
                                          <button
                                            key={dId}
                                            type="button"
                                            className={`${apStyle.prefDayChip} ${block.weekDays.has(dId) ? apStyle.prefDayChipOn : ""}`}
                                            aria-pressed={block.weekDays.has(
                                              dId,
                                            )}
                                            onClick={() =>
                                              toggleBlockWeekDay(block.id, dId)
                                            }
                                          >
                                            {label}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  </fieldset>

                                  <fieldset className={apStyle.prefFieldset}>
                                    <legend className={apStyle.prefLegend}>
                                      Календарные дни
                                    </legend>
                                    <p className={apStyle.prefHint}>
                                      Вы можете выбрать и дни недели, и
                                      конкретные даты в календаре: они работают
                                      вместе. Например, выберите «Пн» и
                                      дополнительно укажите каждый второй
                                      четверг с мая по август — будут
                                      учитываться и понедельники, и эти четверги
                                    </p>
                                    <div className={apStyle.prefCalHead}>
                                      <button
                                        type="button"
                                        className={apStyle.prefCalNav}
                                        disabled={!canGoCalPrev}
                                        onClick={() =>
                                          shiftBlockCalMonth(block.id, -1)
                                        }
                                        aria-label="Предыдущий месяц"
                                      >
                                        ◀
                                      </button>
                                      <span className={apStyle.prefCalTitle}>
                                        {MONTH_NAMES_RU[blockCal.m]}{" "}
                                        {blockCal.y}
                                      </span>
                                      <button
                                        type="button"
                                        className={apStyle.prefCalNav}
                                        onClick={() =>
                                          shiftBlockCalMonth(block.id, 1)
                                        }
                                        aria-label="Следующий месяц"
                                      >
                                        ▶
                                      </button>
                                    </div>
                                    <div className={apStyle.prefCalWeekdays}>
                                      {WEEKDAY_CHIPS.map(({ label }) => (
                                        <span
                                          key={label}
                                          className={apStyle.prefCalWd}
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                    <div className={apStyle.prefCalGrid}>
                                      {buildCalendarCells(
                                        blockCal.y,
                                        blockCal.m,
                                      ).map((c) => (
                                        <button
                                          key={c.iso}
                                          type="button"
                                          className={`${apStyle.prefCalCell} ${!c.inMonth ? apStyle.prefCalCellMuted : ""} ${blockDates.has(c.iso) ? apStyle.prefCalCellOn : ""}`}
                                          onClick={() =>
                                            toggleBlockCalendarDate(
                                              block.id,
                                              c.iso,
                                            )
                                          }
                                          aria-pressed={blockDates.has(c.iso)}
                                          disabled={
                                            !c.inMonth ||
                                            (c.iso < todayIso &&
                                              !blockDates.has(c.iso))
                                          }
                                        >
                                          {c.day}
                                        </button>
                                      ))}
                                    </div>
                                  </fieldset>
                                </div>
                              );
                            });
                          })()}

                          <div className={apStyle.prefAddBlockRow}>
                            <button
                              type="button"
                              className={apStyle.prefAddScheduleBlockBtn}
                              onClick={addScheduleBlock}
                            >
                              + Добавить расписание для других дней
                            </button>
                          </div>
                        </section>

                        <section className={apStyle.prefSection}>
                          <h2 className={apStyle.prefSectionTitle}>
                            Громкость музыки
                          </h2>
                          <p className={apStyle.prefHint}>
                            Можно выбрать несколько уровней, один или не
                            указывать громкость.
                          </p>
                          <div
                            className={`${apStyle.prefToggleGrid} ${apStyle.prefToggleGridVolume}`}
                          >
                            {VOLUME_OPTIONS.map((v) => {
                              const on = volumeLevels.has(v.id);
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  className={`${apStyle.prefToggleTile} ${on ? apStyle.prefToggleTileOn : ""}`}
                                  aria-pressed={on}
                                  onClick={() => toggleVolumeLevel(v.id)}
                                >
                                  <span className={apStyle.prefToggleTitle}>
                                    {v.title}
                                  </span>
                                  <span className={apStyle.prefToggleSub}>
                                    {v.hint}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </section>

                        <section className={apStyle.prefSection}>
                          <h2 className={apStyle.prefSectionTitle}>Жанры</h2>
                          <div className={apStyle.prefGenreLayout}>
                            <div className={apStyle.prefGenrePick}>
                              <div
                                className={`${venueAdminStyle.search} ${apStyle.prefSearchVenueStyle}`}
                              >
                                <img src={searchBlack} alt="" />
                                <input
                                  type="text"
                                  name="genreSearch"
                                  placeholder="Найти жанр"
                                  className={venueAdminStyle.searchInput}
                                  value={genreQuery}
                                  onChange={(e) =>
                                    setGenreQuery(e.target.value)
                                  }
                                  aria-label="Поиск жанра"
                                />
                              </div>
                              <div
                                className={apStyle.prefGenreList}
                                aria-label="Список жанров"
                              >
                                {genreLoading ? (
                                  <p className={apStyle.prefGenreListEmpty}>
                                    Загрузка жанров...
                                  </p>
                                ) : null}
                                {genreError ? (
                                  <p className={apStyle.prefGenreListEmpty}>
                                    {genreError}
                                  </p>
                                ) : null}
                                {filteredGenres.length === 0 &&
                                genreQuery.trim() !== "" &&
                                !genreLoading &&
                                !genreError ? (
                                  <p
                                    className={apStyle.prefGenreListEmpty}
                                    role="status"
                                  >
                                    Жанры не найдены
                                  </p>
                                ) : (
                                  filteredGenres.map((g) => {
                                    const on = pickedGenreIds.has(g.id);
                                    return (
                                      <div
                                        key={g.id}
                                        role="checkbox"
                                        aria-checked={on}
                                        tabIndex={0}
                                        className={apStyle.prefGenreRow}
                                        onClick={() => toggleGenre(g.id)}
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === "Enter" ||
                                            e.key === " "
                                          ) {
                                            e.preventDefault();
                                            toggleGenre(g.id);
                                          }
                                        }}
                                      >
                                        <span className={apStyle.prefGenreName}>
                                          {g.name}
                                        </span>
                                        <span
                                          className={`${orgPageStyle.venueAddressCheck} ${on ? orgPageStyle.venueAddressCheckOn : apStyle.prefGenreToggleOff}`}
                                          aria-hidden
                                        />
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                            <div className={apStyle.prefGenreChosen}>
                              <div className={apStyle.prefGenreChosenTitle}>
                                Выбрано ({pickedGenreIds.size})
                              </div>
                              <div className={apStyle.prefChipWrap}>
                                {Array.from(pickedGenreIds)
                                  .map((id) =>
                                    genres.find((genre) => genre.id === id),
                                  )
                                  .filter(Boolean)
                                  .map((g) => (
                                  <span key={g.id} className={apStyle.prefChip}>
                                    <span>{g.name}</span>
                                    <button
                                      type="button"
                                      className={apStyle.prefChipX}
                                      aria-label={`Убрать ${g.name}`}
                                      onClick={() => removeGenre(g.id)}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                      <div className={apStyle.blockPrefMusic}>
                        <h2 className={apStyle.prefSectionTitle}>
                          Добавить треки
                        </h2>
                        <div
                          className={`${apStyle.addPrefsColSlot} ${apStyle.addPrefsColSlotCenter}`}
                        >
                          <button
                            type="button"
                            className={apStyle.prefSlotAddBtn}
                            aria-label="Добавить треки"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className={apStyle.blockPrefMusic}>
                        <h2 className={apStyle.prefSectionTitle}>
                          Добавить плейлисты
                        </h2>
                        <div
                          className={`${apStyle.addPrefsColSlot} ${apStyle.addPrefsColSlotCenter}`}
                        >
                          <button
                            type="button"
                            className={apStyle.prefSlotAddBtn}
                            aria-label="Добавить треки"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={apStyle.addPrefsSaveRow}>
                      <StatusBanner
                        type={saveError ? "error" : "success"}
                        message={saveError || saveOk}
                        onClose={() => {
                          setSaveError("");
                          setSaveOk("");
                        }}
                      />
                      <button
                        type="button"
                        className={apStyle.addPrefsSaveBtn}
                        onClick={handleSave}
                        disabled={saveLoading}
                      >
                        {saveLoading ? "Сохранение..." : "Сохранить"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AddPreferencesPage;
