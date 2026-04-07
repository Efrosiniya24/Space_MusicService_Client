import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import style from "./VenueAdmin.module.css";
import login from "../../auth/admin/adminAuth.module.css";
import notice from "../../auth/listener/login.module.css";

import Header from "../../../Component/headerAdmin/HeaderAdmin";
import search from "../../../icons/search_black.png";

const API_GATEWAY = "http://localhost:8080";
const URL_VENUE_ALL = `${API_GATEWAY}/space/venue/all`;
const URL_PENDING_COUNT = `${API_GATEWAY}/space/system/venue/count/pending`;

function urlVenueConfirm(id) {
  return `${API_GATEWAY}/space/system/venue/confirm/${id}`;
}

/** UI-ключ статуса → значение для query `status` (enum StatusVenue на бэкенде). */
function mapUiStatusToApiParam(uiKey) {
  switch (uiKey) {
    case "APPROVED":
      return "CONFIRMED";
    case "DENIED":
      return "REJECTED";
    default:
      return uiKey;
  }
}

const DEFAULT_ROW_HEIGHT = 53;
const MIN_VISIBLE_ROWS = 4;

const STATUS_LABEL = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  APPROVED: "Approved",
  DENIED: "Denied",
};

const ALL_STATUS_KEYS = ["PENDING", "PROCESSING", "APPROVED", "DENIED"];

function mapVenueStatusForUi(apiStatus) {
  const s = String(apiStatus ?? "").toUpperCase();
  if (s === "CONFIRMED") return "APPROVED";
  if (s === "REJECTED") return "DENIED";
  if (s === "PROCESSING") return "PROCESSING";
  return "PENDING";
}

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

function mapApiVenueToRow(v) {
  const ymd = toCreatedYmd(v?.createdAt);
  return {
    id: v?.id,
    name: v?.name != null ? String(v.name) : "",
    createdAt: ymd,
    status: mapVenueStatusForUi(v?.status),
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

function StatusChangePopover({
  currentStatus,
  draftStatus,
  onSelect,
  onSave,
  popoverRef,
  styleBox,
}) {
  const otherKeys = ALL_STATUS_KEYS.filter((k) => k !== currentStatus);

  if (typeof document === "undefined" || !styleBox) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className={style.statusPopover}
      style={{
        position: "fixed",
        top: styleBox.top,
        left: styleBox.left,
        minWidth: styleBox.minWidth,
        zIndex: 10000,
      }}
      role="dialog"
      aria-label="Изменить статус"
    >
      <div className={style.statusPopoverTitle}>Изменить статус</div>
      <div className={style.statusPopoverList} role="listbox">
        {otherKeys.map((key) => (
          <label key={key} className={style.statusPopoverOption}>
            <input
              type="radio"
              name="venue-status-draft"
              value={key}
              checked={draftStatus === key}
              onChange={() => onSelect(key)}
            />
            <span
              className={`${style.statusBadge} ${style[`status_${key}`] || ""} ${style.statusPopoverBadge}`}
            >
              {STATUS_LABEL[key] ?? key}
            </span>
          </label>
        ))}
      </div>
      <p
        type="button"
        className={style.statusPopoverSave}
        disabled={!draftStatus}
        onClick={onSave}
      >
        Сохранить
      </p>
    </div>,
    document.body,
  );
}

const VenuesAdmin = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [rowSlots, setRowSlots] = useState(8);
  const [rowHeightPx, setRowHeightPx] = useState(DEFAULT_ROW_HEIGHT);
  const tableScrollRef = useRef(null);

  const [statusMenu, setStatusMenu] = useState(null);
  const [statusDraft, setStatusDraft] = useState(null);
  const [statusPopoverBox, setStatusPopoverBox] = useState(null);
  const statusPopoverRef = useRef(null);
  const statusMenuAnchorRef = useRef(null);

  const closeStatusMenu = useCallback(() => {
    setStatusMenu(null);
    setStatusDraft(null);
    setStatusPopoverBox(null);
    statusMenuAnchorRef.current = null;
  }, []);

  const updateStatusPopoverPosition = useCallback(() => {
    const el = statusMenuAnchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStatusPopoverBox({
      top: r.bottom + 6,
      left: r.left,
      minWidth: Math.max(220, r.width),
    });
  }, []);

  useLayoutEffect(() => {
    if (!statusMenu) return undefined;
    updateStatusPopoverPosition();
    const onScrollOrResize = () => updateStatusPopoverPosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [statusMenu, updateStatusPopoverPosition]);

  useEffect(() => {
    if (!statusMenu) return undefined;
    const onPointerDown = (e) => {
      const pop = statusPopoverRef.current;
      const anchor = statusMenuAnchorRef.current;
      if (pop?.contains(e.target)) return;
      if (anchor?.contains(e.target)) return;
      closeStatusMenu();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [statusMenu, closeStatusMenu]);

  useEffect(() => {
    if (!statusMenu) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeStatusMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [statusMenu, closeStatusMenu]);

  const openStatusMenu = useCallback((row, anchorElement) => {
    statusMenuAnchorRef.current = anchorElement;
    setStatusMenu({ venueId: row.id, currentStatus: row.status });
    setStatusDraft(null);
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

  const handleStatusSave = useCallback(async () => {
    if (!statusMenu || !statusDraft) return;
    const statusParam = mapUiStatusToApiParam(statusDraft);
    const token = localStorage.getItem("accessToken");
    const url = new URL(urlVenueConfirm(statusMenu.venueId));
    url.searchParams.set("status", statusParam);
    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("confirm_failed");
      setVenues((prev) =>
        prev.map((r) =>
          r.id === statusMenu.venueId ? { ...r, status: statusDraft } : r,
        ),
      );
      setSuccessMessage("Статус обновлён");
      setErrorMessage("");
      fetchPendingCount();
      closeStatusMenu();
    } catch {
      setErrorMessage("Не удалось обновить статус");
    }
  }, [statusMenu, statusDraft, closeStatusMenu, fetchPendingCount]);

  useEffect(() => {
    let cancelled = false;

    const loadVenues = async () => {
      setVenuesLoading(true);
      const token = localStorage.getItem("accessToken");
      try {
        const res = await fetch(URL_VENUE_ALL, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("fetch_failed");
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("invalid_shape");
        if (cancelled) return;
        setVenues(data.map(mapApiVenueToRow));
        setErrorMessage("");
      } catch {
        if (cancelled) return;
        setVenues([]);
        setErrorMessage("Не удалось загрузить список заведений");
      } finally {
        if (!cancelled) setVenuesLoading(false);
      }
    };

    loadVenues();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount, venuesLoading]);

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
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [venues, searchQuery, sortKey, sortDir]);

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
          <div className={style.venues}>
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
                  {pendingCount > 0 ? (
                    <span
                      className={style.pendingToolbarCount}
                      aria-label={`Ожидают: ${pendingCount}`}
                    >
                      {pendingCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={style.tableCard}>
              <div ref={tableScrollRef} className={style.tableScroll}>
                <table className={style.venuesTable}>
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
                      <th scope="col" className={style.thPlain}>
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {venuesLoading ? (
                      <tr>
                        <td colSpan={4} className={style.tableEmpty}>
                          Загрузка…
                        </td>
                      </tr>
                    ) : venues.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={style.tableEmpty}>
                          Нет заведений
                        </td>
                      </tr>
                    ) : pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={style.tableEmpty}>
                          Ничего не найдено
                        </td>
                      </tr>
                    ) : (
                      <>
                        {pageRows.map((row, i) => {
                          const globalIndex = pageStart + i;
                          return (
                            <tr
                              key={`${row.id}-${pageStart}-${i}`}
                              data-venue-row={String(row.id)}
                            >
                              <td>{row.id}</td>
                              <td className={style.cellNameBold}>{row.name}</td>
                              <td>{formatDate(row.createdAt)}</td>
                              <td className={style.cellStatus}>
                                <button
                                  type="button"
                                  className={style.statusBadgeButton}
                                  aria-expanded={statusMenu?.venueId === row.id}
                                  aria-haspopup="dialog"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (statusMenu?.venueId === row.id) {
                                      closeStatusMenu();
                                    } else {
                                      openStatusMenu(row, e.currentTarget);
                                    }
                                  }}
                                >
                                  <span
                                    className={`${style.statusBadge} ${style[`status_${row.status}`] || ""}`}
                                  >
                                    {STATUS_LABEL[row.status] ?? row.status}
                                  </span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {fillerHeightPx > 0 ? (
                          <tr className={style.fillerRow} aria-hidden="true">
                            <td
                              colSpan={4}
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

      {statusMenu ? (
        <StatusChangePopover
          currentStatus={statusMenu.currentStatus}
          draftStatus={statusDraft}
          onSelect={setStatusDraft}
          onSave={handleStatusSave}
          popoverRef={statusPopoverRef}
          styleBox={statusPopoverBox}
        />
      ) : null}
    </div>
  );
};

export default VenuesAdmin;
