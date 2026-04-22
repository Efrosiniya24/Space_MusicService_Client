import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import style from "./VenueAdmin.module.css";
import {
  AddressStatusChangePopover,
  filterAddressRecordsByApiStatus,
  mapUiStatusToApiParam,
  mapVenueStatusForUi,
  STATUS_LABEL,
  urlVenueConfirm,
  VenueMetricDetailDialog,
} from "./venueAddressStatusUi";
import login from "../../auth/admin/adminAuth.module.css";
import notice from "../../auth/listener/login.module.css";

import Header from "../../../Component/headerAdmin/HeaderAdmin";
import search from "../../../icons/search_black.png";

const API_GATEWAY = "http://localhost:8080";
const URL_VENUE_ALL = `${API_GATEWAY}/space/venue/all`;
const URL_PENDING_COUNT = `${API_GATEWAY}/space/system/venue/count/pending`;

const DEFAULT_ROW_HEIGHT = 53;
const MIN_VISIBLE_ROWS = 4;

function toCreatedYmd(createdAt) {
  if (createdAt == null) return "";
  if (Array.isArray(createdAt) && createdAt.length >= 3) {
    const [y, mo, d] = createdAt;
    const ys = String(y).padStart(4, "0");
    const ms = String(mo).padStart(2, "0");
    const ds = String(d).padStart(2, "0");
    return `${ys}-${ms}-${ds}`;
  }
  const s = String(createdAt);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

function buildVenueAddressData(v) {
  const raw = Array.isArray(v?.addresses) ? v.addresses : [];
  const active = raw.filter((a) => a && !a.deleted);
  const countrySet = new Set();
  const cityPairMap = new Map();
  const addressLines = [];
  const addressRecords = [];
  for (const a of active) {
    const country =
      a.country != null && String(a.country).trim()
        ? String(a.country).trim()
        : "–";
    const city =
      a.city != null && String(a.city).trim()
        ? String(a.city).trim()
        : "–";
    const addressCity =
      a.addressCity != null && String(a.addressCity).trim()
        ? String(a.addressCity).trim()
        : "–";
    if (country !== "–") countrySet.add(country);
    const cityKey = `${country}\0${city}`;
    cityPairMap.set(cityKey, { city, country });
    addressLines.push({ addressCity, city, country });
    addressRecords.push({
      id: a.id,
      status: a.status,
      addressCity,
      city,
      country,
    });
  }
  const countryLines = Array.from(countrySet)
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((country) => ({ country }));
  const cityLines = Array.from(cityPairMap.values()).sort((x, y) => {
    const c = x.city.localeCompare(y.city, "ru");
    return c !== 0 ? c : x.country.localeCompare(y.country, "ru");
  });
  addressLines.sort((x, y) => {
    const c = x.country.localeCompare(y.country, "ru");
    if (c !== 0) return c;
    const d = x.city.localeCompare(y.city, "ru");
    if (d !== 0) return d;
    return x.addressCity.localeCompare(y.addressCity, "ru");
  });
  addressRecords.sort((x, y) => {
    const c = x.country.localeCompare(y.country, "ru");
    if (c !== 0) return c;
    const d = x.city.localeCompare(y.city, "ru");
    if (d !== 0) return d;
    return x.addressCity.localeCompare(y.addressCity, "ru");
  });
  let addrPending = 0;
  let addrProcessing = 0;
  let addrConfirmed = 0;
  let addrRejected = 0;
  for (const a of active) {
    const st = String(a?.status ?? "PENDING").toUpperCase();
    if (st === "PROCESSING") addrProcessing += 1;
    else if (st === "CONFIRMED") addrConfirmed += 1;
    else if (st === "REJECTED") addrRejected += 1;
    else addrPending += 1;
  }
  return {
    addressCount: addressLines.length,
    countryCount: countryLines.length,
    cityCount: cityLines.length,
    addressLines,
    cityLines,
    countryLines,
    addressRecords,
    addrPending,
    addrProcessing,
    addrConfirmed,
    addrRejected,
  };
}

function mapApiVenueToRow(v) {
  const ymd = toCreatedYmd(v?.createdAt);
  const addr = buildVenueAddressData(v);
  return {
    id: v?.id,
    name: v?.name != null ? String(v.name) : "",
    createdAt: ymd,
    // status: mapVenueStatusForUi(v?.status),
    addressCount: addr.addressCount,
    countryCount: addr.countryCount,
    cityCount: addr.cityCount,
    addressLines: addr.addressLines,
    cityLines: addr.cityLines,
    countryLines: addr.countryLines,
    addressRecords: addr.addressRecords,
    addrPending: addr.addrPending,
    addrProcessing: addr.addrProcessing,
    addrConfirmed: addr.addrConfirmed,
    addrRejected: addr.addrRejected,
  };
}

function formatDate(ymd) {
  if (!ymd || ymd.length < 10) return ymd || "—";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}.${m}.${y}`;
}

function SortArrows({ active, direction }) {
  return (
    <span
      className={`${style.sortArrows} ${active ? style.sortArrowsActive : ""}`}
      aria-hidden
    >
      <span
        className={`${style.sortArrowUp} ${active && direction === "asc" ? style.sortArrowLit : ""}`}
      />
      <span
        className={`${style.sortArrowDown} ${active && direction === "desc" ? style.sortArrowLit : ""}`}
      />
    </span>
  );
}

function PendingAddressesDialog({
  open,
  onClose,
  rows,
  onOpenStatusMenu,
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={style.pendingAddressesBackdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={style.pendingAddressesPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-addresses-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={style.pendingAddressesHeader}>
          <h2 id="pending-addresses-title" className={style.pendingAddressesTitle}>
            Адреса со статусом Pending
          </h2>
          <button
            type="button"
            className={style.venueMetricDialogClose}
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <div className={style.pendingAddressesBody}>
          {rows.length === 0 ? (
            <p className={style.pendingAddressesEmpty}>Нет адресов в статусе Pending</p>
          ) : (
            <ul className={style.pendingAddressesList}>
              {rows.map((row) => {
                const statusKey = mapVenueStatusForUi(row.status);
                return (
                  <li key={row.id} className={style.pendingAddressRow}>
                    <div className={style.pendingAddressMain}>
                      <Link
                        className={style.pendingAddressVenueLink}
                        to={`/admin/venue/${row.venueId}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.venueName}
                      </Link>
                      <div className={style.pendingAddressLine}>
                        {row.addressCity}, {row.city} – {row.country}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={style.statusBadgeButton}
                      aria-haspopup="dialog"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStatusMenu(row, e.currentTarget);
                      }}
                    >
                      <span
                        className={`${style.statusBadge} ${style[`status_${statusKey}`] || ""}`}
                      >
                        {STATUS_LABEL[statusKey] ?? statusKey}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

const VenuesAdmin = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [pendingStatusMenu, setPendingStatusMenu] = useState(null);
  const [statusDraft, setStatusDraft] = useState(null);
  const [statusPopoverBox, setStatusPopoverBox] = useState(null);
  const statusPopoverRef = useRef(null);
  const pendingStatusMenuAnchorRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [rowSlots, setRowSlots] = useState(8);
  const [rowHeightPx, setRowHeightPx] = useState(DEFAULT_ROW_HEIGHT);
  const tableScrollRef = useRef(null);
  const [metricDetail, setMetricDetail] = useState(null);

  const closePendingStatusMenu = useCallback(() => {
    setPendingStatusMenu(null);
    setStatusDraft(null);
    setStatusPopoverBox(null);
    pendingStatusMenuAnchorRef.current = null;
  }, []);

  const closePendingDialog = useCallback(() => {
    closePendingStatusMenu();
    setPendingDialogOpen(false);
  }, [closePendingStatusMenu]);

  const updatePendingStatusPopoverPosition = useCallback(() => {
    const el = pendingStatusMenuAnchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStatusPopoverBox({
      top: r.bottom + 6,
      left: r.left,
      minWidth: Math.max(220, r.width),
    });
  }, []);

  const fetchPendingCount = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(URL_PENDING_COUNT, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("pending_count");
      const data = await res.json();
      const n = typeof data === "number" ? data : Number(data);
      setPendingCount(Number.isFinite(n) ? n : 0);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const loadVenues = useCallback(async () => {
    setVenuesLoading(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(URL_VENUE_ALL, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("fetch_failed");
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("invalid_shape");
      const mapped = data.map(mapApiVenueToRow);
      setVenues(mapped);
      setErrorMessage("");
      return mapped;
    } catch {
      setVenues([]);
      setErrorMessage("Не удалось загрузить список заведений");
      return null;
    } finally {
      setVenuesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVenues();
    fetchPendingCount();
  }, [loadVenues, fetchPendingCount]);

  const openPendingAddressStatusMenu = useCallback(
    (row, anchorElement, venueIdOverride) => {
      pendingStatusMenuAnchorRef.current = anchorElement;
      setPendingStatusMenu({
        addressId: row.id,
        venueId: venueIdOverride ?? row.venueId,
        currentStatus: mapVenueStatusForUi(row.status),
      });
      setStatusDraft(null);
    },
    [],
  );

  const handlePendingAddressStatusSave = useCallback(async () => {
    if (!pendingStatusMenu || !statusDraft) return;
    const statusParam = mapUiStatusToApiParam(statusDraft);
    const token = localStorage.getItem("accessToken");
    const url = new URL(urlVenueConfirm(pendingStatusMenu.addressId));
    url.searchParams.set("status", statusParam);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("confirm_failed");
      setSuccessMessage("Статус обновлён");
      setErrorMessage("");
      closePendingStatusMenu();
      const fresh = await loadVenues();
      await fetchPendingCount();
      setMetricDetail((prev) => {
        if (
          !fresh ||
          !prev ||
          prev.kind !== "addresses" ||
          prev.venueId == null
        ) {
          return prev;
        }
        const r = fresh.find((v) => v.id === prev.venueId);
        if (!r) return prev;
        const all = r.addressRecords;
        const items = prev.filterApiStatus
          ? filterAddressRecordsByApiStatus(all, prev.filterApiStatus)
          : all;
        return { ...prev, items };
      });
    } catch {
      setErrorMessage("Не удалось обновить статус");
    }
  }, [
    pendingStatusMenu,
    statusDraft,
    closePendingStatusMenu,
    loadVenues,
    fetchPendingCount,
  ]);

  useLayoutEffect(() => {
    if (!pendingStatusMenu) return undefined;
    updatePendingStatusPopoverPosition();
    const onScrollOrResize = () => updatePendingStatusPopoverPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [pendingStatusMenu, updatePendingStatusPopoverPosition]);

  useEffect(() => {
    if (!pendingStatusMenu) return undefined;
    const onPointerDown = (e) => {
      const pop = statusPopoverRef.current;
      const anchor = pendingStatusMenuAnchorRef.current;
      if (pop?.contains(e.target)) return;
      if (anchor?.contains(e.target)) return;
      closePendingStatusMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [pendingStatusMenu, closePendingStatusMenu]);

  useEffect(() => {
    if (!pendingDialogOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (pendingStatusMenu) closePendingStatusMenu();
      else setPendingDialogOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingDialogOpen, pendingStatusMenu, closePendingStatusMenu]);

  const toggleSort = useCallback(
    (key) => {
      setPage(1);
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    },
    [sortKey],
  );

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = q
      ? venues.filter((v) => v.name.toLowerCase().includes(q))
      : [...venues];

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id") {
        cmp = (Number(a.id) || 0) - (Number(b.id) || 0);
      } else if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name, "ru");
      } else if (sortKey === "created") {
        cmp = (a.createdAt || "").localeCompare(b.createdAt || "");
      } else if (sortKey === "addresses") {
        cmp = (Number(a.addressCount) || 0) - (Number(b.addressCount) || 0);
      } else if (sortKey === "cities") {
        cmp = (Number(a.cityCount) || 0) - (Number(b.cityCount) || 0);
      } else if (sortKey === "countries") {
        cmp = (Number(a.countryCount) || 0) - (Number(b.countryCount) || 0);
      } else if (sortKey === "addrPending") {
        cmp = (Number(a.addrPending) || 0) - (Number(b.addrPending) || 0);
      } else if (sortKey === "addrProcessing") {
        cmp = (Number(a.addrProcessing) || 0) - (Number(b.addrProcessing) || 0);
      } else if (sortKey === "addrConfirmed") {
        cmp = (Number(a.addrConfirmed) || 0) - (Number(b.addrConfirmed) || 0);
      } else if (sortKey === "addrRejected") {
        cmp = (Number(a.addrRejected) || 0) - (Number(b.addrRejected) || 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [venues, searchQuery, sortKey, sortDir]);

  const pendingAddressRows = useMemo(() => {
    const out = [];
    for (const v of venues) {
      for (const ar of v.addressRecords || []) {
        if (String(ar.status ?? "PENDING").toUpperCase() === "PENDING") {
          out.push({
            id: ar.id,
            venueId: v.id,
            venueName: v.name,
            status: ar.status,
            addressCity: ar.addressCity,
            city: ar.city,
            country: ar.country,
          });
        }
      }
    }
    return out;
  }, [venues]);

  const pageSize = rowSlots;

  const pageCount = Math.max(
    1,
    Math.ceil(filteredSorted.length / pageSize) || 1,
  );
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const pageRows = filteredSorted.slice(pageStart, pageStart + pageSize);
  const fillerCount =
    pageRows.length > 0 ? Math.max(0, pageSize - pageRows.length) : 0;
  const fillerHeightPx = fillerCount * rowHeightPx;

  useLayoutEffect(() => {
    const scrollEl = tableScrollRef.current;
    if (!scrollEl) return undefined;

    const measure = () => {
      const theadRow = scrollEl.querySelector("thead tr");
      const sampleRow = scrollEl.querySelector("tbody tr[data-venue-row]");
      const theadH = theadRow?.getBoundingClientRect().height ?? 56;
      const rowH =
        sampleRow?.getBoundingClientRect().height ?? DEFAULT_ROW_HEIGHT;
      const available = scrollEl.clientHeight - theadH;
      const slots = Math.max(
        MIN_VISIBLE_ROWS,
        Math.floor(available / Math.max(1, rowH)),
      );
      setRowHeightPx(rowH);
      setRowSlots(slots);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [filteredSorted.length, pageRows.length]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    if (!errorMessage) return;

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!metricDetail) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (pendingStatusMenu) closePendingStatusMenu();
      else setMetricDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [metricDetail, pendingStatusMenu, closePendingStatusMenu]);

  return (
    <div className={login.mainLogin}>
      {errorMessage && (
        <div className={notice.errorBanner} role="alert">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className={notice.successBanner} role="status">
          {successMessage}
        </div>
      )}
      <div className={style.pageShell}>
        <Header />
        <div className={style.main}>
          <div className={style.titleWrap}>
            <h1>Общественные места</h1>
          </div>
          <div className={`${style.venues} ${style.venuesWide}`}>
            <div className={style.venuesToolbar}>
              <div className={style.venuesToolbarCluster}>
                <div className={style.search}>
                  <img src={search} alt="" />
                  <input
                    type="text"
                    name="search"
                    placeholder="Найти общественное место"
                    className={style.searchInput}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div
                  className={`${style.pendingToolbarBadge} ${pendingCount > 0 ? style.pendingToolbarBadgeWithCount : ""}`}
                >
                  <span className={style.pendingToolbarLabel}>Pending</span>
                  <button
                    type="button"
                    className={style.pendingToolbarCount}
                    aria-label={`Адресов в статусе Pending: ${pendingCount}`}
                    onClick={() => setPendingDialogOpen(true)}
                  >
                    {pendingCount}
                  </button>
                </div>
              </div>
            </div>

            <div
              className={`${style.tableCard} ${style.venuesListTableCard}`}
            >
              <div ref={tableScrollRef} className={style.tableScroll}>
                <table
                  className={`${style.venuesTable} ${style.venuesListVenuesTable}`}
                >
                  <thead>
                    <tr>
                      <th scope="col">
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("id")}
                          aria-sort={
                            sortKey === "id"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          ID
                          <SortArrows
                            active={sortKey === "id"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col">
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("name")}
                          aria-sort={
                            sortKey === "name"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          Название
                          <SortArrows
                            active={sortKey === "name"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col">
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("created")}
                          aria-sort={
                            sortKey === "created"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          Создан
                          <SortArrows
                            active={sortKey === "created"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col">
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("addresses")}
                          aria-sort={
                            sortKey === "addresses"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          Кол. адресов
                          <SortArrows
                            active={sortKey === "addresses"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col">
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("cities")}
                          aria-sort={
                            sortKey === "cities"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          Кол. городов
                          <SortArrows
                            active={sortKey === "cities"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col">
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("countries")}
                          aria-sort={
                            sortKey === "countries"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          Кол. стран
                          <SortArrows
                            active={sortKey === "countries"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col" className={style.venueStatusMetricCol}>
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("addrPending")}
                          aria-sort={
                            sortKey === "addrPending"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <span
                            className={`${style.statusBadge} ${style.status_PENDING} ${style.thStatusBadge}`}
                          >
                            Pending
                          </span>
                          <SortArrows
                            active={sortKey === "addrPending"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col" className={style.venueStatusMetricCol}>
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("addrProcessing")}
                          aria-sort={
                            sortKey === "addrProcessing"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <span
                            className={`${style.statusBadge} ${style.status_PROCESSING} ${style.thStatusBadge}`}
                          >
                            Processing
                          </span>
                          <SortArrows
                            active={sortKey === "addrProcessing"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col" className={style.venueStatusMetricCol}>
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("addrConfirmed")}
                          aria-sort={
                            sortKey === "addrConfirmed"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <span
                            className={`${style.statusBadge} ${style.status_APPROVED} ${style.thStatusBadge}`}
                          >
                            Approved
                          </span>
                          <SortArrows
                            active={sortKey === "addrConfirmed"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                      <th scope="col" className={style.venueStatusMetricCol}>
                        <button
                          type="button"
                          className={style.thSort}
                          onClick={() => toggleSort("addrRejected")}
                          aria-sort={
                            sortKey === "addrRejected"
                              ? sortDir === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                        >
                          <span
                            className={`${style.statusBadge} ${style.status_DENIED} ${style.thStatusBadge}`}
                          >
                            Denied
                          </span>
                          <SortArrows
                            active={sortKey === "addrRejected"}
                            direction={sortDir}
                          />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {venuesLoading ? (
                      <tr>
                        <td colSpan={11} className={style.tableEmpty}>
                          Загрузка…
                        </td>
                      </tr>
                    ) : venues.length === 0 ? (
                      <tr>
                        <td colSpan={11} className={style.tableEmpty}>
                          Нет заведений
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className={style.tableEmpty}>
                          Ничего не найдено
                        </td>
                      </tr>
                    ) : (
                      <>
                        {pageRows.map((row, i) => {
                          return (
                            <tr
                              key={`${row.id}-${pageStart}-${i}`}
                              data-venue-row={String(row.id)}
                            >
                              <td>{row.id}</td>
                              <td className={style.cellNameBold}>
                                <Link
                                  className={style.venueCellLink}
                                  to={`/admin/venue/${row.id}`}
                                >
                                  {row.name}
                                </Link>
                              </td>
                              <td>
                                <Link
                                  className={style.venueCellLink}
                                  to={`/admin/venue/${row.id}`}
                                >
                                  {formatDate(row.createdAt)}
                                </Link>
                              </td>
                              <td className={style.venueMetricCell}>
                                <div className={style.venueMetricCellInner}>
                                  <span className={style.venueMetricNum}>
                                    {row.addressCount}
                                  </span>
                                  {row.addressCount > 0 ? (
                                    <span className={style.venueMetricHover}>
                                      <button
                                        type="button"
                                        className={style.venueMetricViewBtn}
                                        onClick={() =>
                                          setMetricDetail({
                                            kind: "addresses",
                                            venueName: row.name,
                                            venueId: row.id,
                                            items: row.addressRecords,
                                          })
                                        }
                                      >
                                        Смотреть
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className={style.venueMetricCell}>
                                <div className={style.venueMetricCellInner}>
                                  <span className={style.venueMetricNum}>
                                    {row.cityCount}
                                  </span>
                                  {row.cityCount > 0 ? (
                                    <span className={style.venueMetricHover}>
                                      <button
                                        type="button"
                                        className={style.venueMetricViewBtn}
                                        onClick={() =>
                                          setMetricDetail({
                                            kind: "cities",
                                            venueName: row.name,
                                            items: row.cityLines,
                                          })
                                        }
                                      >
                                        Смотреть
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className={style.venueMetricCell}>
                                <div className={style.venueMetricCellInner}>
                                  <span className={style.venueMetricNum}>
                                    {row.countryCount}
                                  </span>
                                  {row.countryCount > 0 ? (
                                    <span className={style.venueMetricHover}>
                                      <button
                                        type="button"
                                        className={style.venueMetricViewBtn}
                                        onClick={() =>
                                          setMetricDetail({
                                            kind: "countries",
                                            venueName: row.name,
                                            items: row.countryLines,
                                          })
                                        }
                                      >
                                        Смотреть
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td
                                className={`${style.venueMetricCell} ${style.venueStatusMetricCol}`}
                              >
                                <div className={style.venueMetricCellInner}>
                                  <span className={style.venueMetricNum}>
                                    {row.addrPending}
                                  </span>
                                  {row.addrPending > 0 ? (
                                    <span className={style.venueMetricHover}>
                                      <button
                                        type="button"
                                        className={style.venueMetricViewBtn}
                                        onClick={() =>
                                          setMetricDetail({
                                            kind: "addresses",
                                            venueName: row.name,
                                            venueId: row.id,
                                            items: filterAddressRecordsByApiStatus(
                                              row.addressRecords,
                                              "PENDING",
                                            ),
                                            filterApiStatus: "PENDING",
                                          })
                                        }
                                      >
                                        Смотреть
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td
                                className={`${style.venueMetricCell} ${style.venueStatusMetricCol}`}
                              >
                                <div className={style.venueMetricCellInner}>
                                  <span className={style.venueMetricNum}>
                                    {row.addrProcessing}
                                  </span>
                                  {row.addrProcessing > 0 ? (
                                    <span className={style.venueMetricHover}>
                                      <button
                                        type="button"
                                        className={style.venueMetricViewBtn}
                                        onClick={() =>
                                          setMetricDetail({
                                            kind: "addresses",
                                            venueName: row.name,
                                            venueId: row.id,
                                            items: filterAddressRecordsByApiStatus(
                                              row.addressRecords,
                                              "PROCESSING",
                                            ),
                                            filterApiStatus: "PROCESSING",
                                          })
                                        }
                                      >
                                        Смотреть
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td
                                className={`${style.venueMetricCell} ${style.venueStatusMetricCol}`}
                              >
                                <div className={style.venueMetricCellInner}>
                                  <span className={style.venueMetricNum}>
                                    {row.addrConfirmed}
                                  </span>
                                  {row.addrConfirmed > 0 ? (
                                    <span className={style.venueMetricHover}>
                                      <button
                                        type="button"
                                        className={style.venueMetricViewBtn}
                                        onClick={() =>
                                          setMetricDetail({
                                            kind: "addresses",
                                            venueName: row.name,
                                            venueId: row.id,
                                            items: filterAddressRecordsByApiStatus(
                                              row.addressRecords,
                                              "CONFIRMED",
                                            ),
                                            filterApiStatus: "CONFIRMED",
                                          })
                                        }
                                      >
                                        Смотреть
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td
                                className={`${style.venueMetricCell} ${style.venueStatusMetricCol}`}
                              >
                                <div className={style.venueMetricCellInner}>
                                  <span className={style.venueMetricNum}>
                                    {row.addrRejected}
                                  </span>
                                  {row.addrRejected > 0 ? (
                                    <span className={style.venueMetricHover}>
                                      <button
                                        type="button"
                                        className={style.venueMetricViewBtn}
                                        onClick={() =>
                                          setMetricDetail({
                                            kind: "addresses",
                                            venueName: row.name,
                                            venueId: row.id,
                                            items: filterAddressRecordsByApiStatus(
                                              row.addressRecords,
                                              "REJECTED",
                                            ),
                                            filterApiStatus: "REJECTED",
                                          })
                                        }
                                      >
                                        Смотреть
                                      </button>
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {fillerHeightPx > 0 ? (
                          <tr className={style.fillerRow} aria-hidden="true">
                            <td
                              colSpan={11}
                              style={{ height: fillerHeightPx }}
                            />
                          </tr>
                        ) : null}
                      </>
                    )}
                  </tbody>
                </table>
              </div>

              <div className={style.pagination}>
                <button
                  type="button"
                  className={style.pageNav}
                  disabled={venuesLoading || safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Предыдущая страница"
                >
                  ◀
                </button>
                <span className={style.pageCurrent}>{safePage}</span>
                <button
                  type="button"
                  className={style.pageNav}
                  disabled={venuesLoading || safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  aria-label="Следующая страница"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {pendingDialogOpen ? (
        <PendingAddressesDialog
          open={pendingDialogOpen}
          onClose={closePendingDialog}
          rows={pendingAddressRows}
          onOpenStatusMenu={openPendingAddressStatusMenu}
        />
      ) : null}
      {pendingStatusMenu && statusPopoverBox ? (
        <AddressStatusChangePopover
          currentStatus={pendingStatusMenu.currentStatus}
          draftStatus={statusDraft}
          onSelect={setStatusDraft}
          onSave={handlePendingAddressStatusSave}
          popoverRef={statusPopoverRef}
          styleBox={statusPopoverBox}
          radioGroupName={`pending-addr-${pendingStatusMenu.addressId}`}
        />
      ) : null}
      {metricDetail ? (
        <VenueMetricDetailDialog
          detail={metricDetail}
          onClose={() => setMetricDetail(null)}
          onAddressStatusClick={openPendingAddressStatusMenu}
        />
      ) : null}
    </div>
  );
};

export default VenuesAdmin;
