import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from "react";
import { NavLink, useParams } from "react-router-dom";

import adminStyle from "../venues/VenueAdmin.module.css";
import style from "./SingleVenueAdmin.module.css";
import login from "../../auth/admin/adminAuth.module.css";
import notice from "../../auth/listener/login.module.css";

import Header from "../../../Component/headerAdmin/HeaderAdmin";
import search from "../../../icons/search_black.png";
import chevronDown from "../../../icons/down.png";
import returnPage from "../../../icons/return.png";

const API_GATEWAY = "http://localhost:8080";

const VENUE_SECTION_TABS = [
  { id: "addresses", label: "Адреса" },
  { id: "admins", label: "Администраторы" },
  { id: "listeners", label: "Слушатели" },
  { id: "music", label: "Музыка" },
];

function urlVenueById(id) {
  return `${API_GATEWAY}/space/venue/${id}`;
}

function urlVenueCurators(id) {
  return `${API_GATEWAY}/space/users/venueCurators/${id}`;
}

const STATUS_LABEL = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  APPROVED: "Approved",
  DENIED: "Denied",
};

function resolveVenueCoverUrl(cover) {
  if (cover == null || !String(cover).trim()) return null;
  const c = String(cover).trim();
  if (/^https?:\/\//i.test(c)) return c;
  if (c.startsWith("/")) return `${API_GATEWAY}${c}`;
  return `${API_GATEWAY}/${c}`;
}

const CURATOR_DEFAULT_ROW_HEIGHT = 53;
const CURATOR_MIN_VISIBLE_ROWS = 4;
const ADDRESS_COUNTRIES_PER_PAGE = 3;

/** Group venue addresses: country → cities → addressCity lines */
function buildVenueAddressBlocks(venue) {
  const raw = Array.isArray(venue?.addresses) ? venue.addresses : [];
  const active = raw.filter((a) => a && !a.deleted);
  const byCountry = new Map();
  for (const a of active) {
    const country =
      a.country != null && String(a.country).trim()
        ? String(a.country).trim()
        : "—";
    const city =
      a.city != null && String(a.city).trim()
        ? String(a.city).trim()
        : "—";
    const lineRaw =
      a.addressCity != null && String(a.addressCity).trim()
        ? String(a.addressCity).trim()
        : "—";
    if (!byCountry.has(country)) byCountry.set(country, new Map());
    const byCity = byCountry.get(country);
    if (!byCity.has(city)) byCity.set(city, new Set());
    byCity.get(city).add(lineRaw);
  }
  const blocks = [];
  for (const [country, cityMap] of byCountry) {
    const cities = [];
    for (const [city, lineSet] of cityMap) {
      cities.push({ city, lines: Array.from(lineSet) });
    }
    cities.sort((x, y) => x.city.localeCompare(y.city, "ru"));
    blocks.push({ country, cities });
  }
  blocks.sort((a, b) => a.country.localeCompare(b.country, "ru"));
  return blocks;
}

function buildCuratorDisplayRows(curators, venue) {
  const list = Array.isArray(curators) ? curators : [];
  const addresses = Array.isArray(venue?.addresses) ? venue.addresses : [];
  const addrById = new Map(addresses.map((a) => [a.id, a]));
  return list.map((c) => {
    const addr = c?.addressId != null ? addrById.get(c.addressId) : null;
    const u = c?.user ?? {};
    const phoneRaw = u.phone != null ? String(u.phone).trim() : "";
    return {
      rowKey: String(c.id ?? `${c.curatorId}-${c.addressId ?? "na"}`),
      curatorRecordId: c.id,
      name: u.name != null && String(u.name).trim() ? String(u.name) : "—",
      email: u.email != null && String(u.email).trim() ? String(u.email) : "—",
      phone: phoneRaw || "—",
      isUserAdmin: Boolean(c.isUserAdmin),
      country:
        addr?.country != null && String(addr.country).trim()
          ? String(addr.country)
          : "—",
      city:
        addr?.city != null && String(addr.city).trim()
          ? String(addr.city)
          : "—",
      addressCity:
        addr?.addressCity != null && String(addr.addressCity).trim()
          ? String(addr.addressCity)
          : "—",
    };
  });
}

function SortArrows({ active, direction }) {
  return (
    <span
      className={`${adminStyle.sortArrows} ${active ? adminStyle.sortArrowsActive : ""}`}
      aria-hidden
    >
      <span
        className={`${adminStyle.sortArrowUp} ${active && direction === "asc" ? adminStyle.sortArrowLit : ""}`}
      />
      <span
        className={`${adminStyle.sortArrowDown} ${active && direction === "desc" ? adminStyle.sortArrowLit : ""}`}
      />
    </span>
  );
}

const SingleVenueAdmin = () => {
  const { venueId } = useParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [venue, setVenue] = useState(null);
  const [venueLoading, setVenueLoading] = useState(true);
  const [coverBroken, setCoverBroken] = useState(false);
  const [activeVenueSection, setActiveVenueSection] = useState(
    VENUE_SECTION_TABS[0].id,
  );
  const [addressCountryPage, setAddressCountryPage] = useState(1);
  const [selectedAddressCountries, setSelectedAddressCountries] = useState(
    [],
  );
  const [selectedAddressCities, setSelectedAddressCities] = useState([]);
  const [addressCountryFilterOpen, setAddressCountryFilterOpen] =
    useState(false);
  const [addressCityFilterOpen, setAddressCityFilterOpen] = useState(false);
  const addressCountryFilterWrapRef = useRef(null);
  const addressCityFilterWrapRef = useRef(null);

  const [venueCurators, setVenueCurators] = useState([]);
  const [curatorsLoading, setCuratorsLoading] = useState(false);
  const [curatorSortKey, setCuratorSortKey] = useState("id");
  const [curatorSortDir, setCuratorSortDir] = useState("asc");
  const [curatorPage, setCuratorPage] = useState(1);
  const [curatorRowSlots, setCuratorRowSlots] = useState(8);
  const [curatorRowHeightPx, setCuratorRowHeightPx] = useState(
    CURATOR_DEFAULT_ROW_HEIGHT,
  );
  const curatorsTableScrollRef = useRef(null);

  const addressStatusCounts = useMemo(() => {
    const raw = Array.isArray(venue?.addresses) ? venue.addresses : [];
    const active = raw.filter((a) => a && !a.deleted);
    let pending = 0;
    let processing = 0;
    let confirmed = 0;
    let rejected = 0;
    for (const a of active) {
      const st = String(a?.status ?? "PENDING").toUpperCase();
      if (st === "PROCESSING") processing += 1;
      else if (st === "CONFIRMED") confirmed += 1;
      else if (st === "REJECTED") rejected += 1;
      else pending += 1;
    }
    return { pending, processing, confirmed, rejected };
  }, [venue?.addresses]);

  const coverSrc = useMemo(() => {
    if (coverBroken) return returnPage;
    const u = resolveVenueCoverUrl(venue?.cover);
    return u || returnPage;
  }, [venue?.cover, coverBroken]);

  const loadVenue = useCallback(async () => {
    const id = Number(venueId);
    if (!venueId || !Number.isFinite(id)) {
      setVenue(null);
      setVenueLoading(false);
      setErrorMessage("Некорректный идентификатор заведения");
      return;
    }
    setVenueLoading(true);
    setCoverBroken(false);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(urlVenueById(id), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("fetch_failed");
      const data = await res.json();
      setVenue(data);
      setErrorMessage("");
    } catch {
      setVenue(null);
      setErrorMessage("Не удалось загрузить заведение");
    } finally {
      setVenueLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadVenue();
  }, [loadVenue]);

  useEffect(() => {
    setCuratorPage(1);
  }, [venueId]);

  useEffect(() => {
    const id = Number(venueId);
    if (!venue?.id || !Number.isFinite(id)) {
      setVenueCurators([]);
      return undefined;
    }
    let cancelled = false;
    setCuratorsLoading(true);
    const token = localStorage.getItem("accessToken");
    fetch(urlVenueCurators(id), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("curators_failed");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setVenueCurators(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setVenueCurators([]);
      })
      .finally(() => {
        if (!cancelled) setCuratorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venue?.id, venueId]);

  const curatorDisplayRows = useMemo(
    () => buildCuratorDisplayRows(venueCurators, venue),
    [venueCurators, venue],
  );

  const addressBlocks = useMemo(() => buildVenueAddressBlocks(venue), [venue]);

  const selectedAddressCountriesSet = useMemo(
    () => new Set(selectedAddressCountries),
    [selectedAddressCountries],
  );
  const selectedAddressCitiesSet = useMemo(
    () => new Set(selectedAddressCities),
    [selectedAddressCities],
  );

  const addressCountryOptions = useMemo(
    () =>
      [...new Set(addressBlocks.map((b) => b.country))].sort((a, b) =>
        a.localeCompare(b, "ru"),
      ),
    [addressBlocks],
  );

  const addressCityOptions = useMemo(() => {
    const set = new Set();
    const blocks =
      selectedAddressCountries.length === 0
        ? addressBlocks
        : addressBlocks.filter((b) =>
            selectedAddressCountriesSet.has(b.country),
          );
    blocks.forEach((b) => b.cities.forEach((c) => set.add(c.city)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ru"));
  }, [addressBlocks, selectedAddressCountries, selectedAddressCountriesSet]);

  const filteredAddressBlocks = useMemo(() => {
    let blocks = addressBlocks;
    if (selectedAddressCountries.length > 0) {
      blocks = blocks.filter((b) =>
        selectedAddressCountriesSet.has(b.country),
      );
    }
    return blocks
      .map((b) => ({
        country: b.country,
        cities: b.cities.filter(
          (c) =>
            selectedAddressCities.length === 0 ||
            selectedAddressCitiesSet.has(c.city),
        ),
      }))
      .filter((b) => b.cities.length > 0);
  }, [
    addressBlocks,
    selectedAddressCountries,
    selectedAddressCountriesSet,
    selectedAddressCities,
    selectedAddressCitiesSet,
  ]);

  const addressCountryPageCount = useMemo(() => {
    if (filteredAddressBlocks.length <= ADDRESS_COUNTRIES_PER_PAGE) return 1;
    return Math.max(
      1,
      Math.ceil(filteredAddressBlocks.length / ADDRESS_COUNTRIES_PER_PAGE),
    );
  }, [filteredAddressBlocks.length]);

  const addressCountrySafePage = Math.min(
    addressCountryPage,
    addressCountryPageCount,
  );

  const addressBlocksPageSlice = useMemo(() => {
    if (filteredAddressBlocks.length <= ADDRESS_COUNTRIES_PER_PAGE) {
      return filteredAddressBlocks;
    }
    const start =
      (addressCountrySafePage - 1) * ADDRESS_COUNTRIES_PER_PAGE;
    return filteredAddressBlocks.slice(
      start,
      start + ADDRESS_COUNTRIES_PER_PAGE,
    );
  }, [filteredAddressBlocks, addressCountrySafePage]);

  useEffect(() => {
    setAddressCountryPage(1);
    setSelectedAddressCountries([]);
    setSelectedAddressCities([]);
    setAddressCountryFilterOpen(false);
    setAddressCityFilterOpen(false);
  }, [venue?.id, venueId]);

  useEffect(() => {
    setAddressCountryPage(1);
  }, [selectedAddressCountries, selectedAddressCities]);

  useEffect(() => {
    if (addressCountryPage > addressCountryPageCount) {
      setAddressCountryPage(addressCountryPageCount);
    }
  }, [addressCountryPage, addressCountryPageCount]);

  useEffect(() => {
    const valid = new Set(addressCityOptions);
    setSelectedAddressCities((prev) => prev.filter((c) => valid.has(c)));
  }, [addressCityOptions]);

  useEffect(() => {
    if (!addressCountryFilterOpen && !addressCityFilterOpen) return undefined;
    const onDown = (e) => {
      const c = addressCountryFilterWrapRef.current;
      const t = addressCityFilterWrapRef.current;
      if (c?.contains(e.target) || t?.contains(e.target)) return;
      setAddressCountryFilterOpen(false);
      setAddressCityFilterOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [addressCountryFilterOpen, addressCityFilterOpen]);

  const toggleAddressCountryFilter = useCallback((country) => {
    setSelectedAddressCountries((prev) =>
      prev.includes(country) ? prev.filter((x) => x !== country) : [...prev, country],
    );
  }, []);

  const toggleAddressCityFilter = useCallback((city) => {
    setSelectedAddressCities((prev) =>
      prev.includes(city) ? prev.filter((x) => x !== city) : [...prev, city],
    );
  }, []);

  const toggleCuratorSort = useCallback(
    (key) => {
      setCuratorPage(1);
      if (curatorSortKey !== key) {
        setCuratorSortKey(key);
        setCuratorSortDir("asc");
      } else {
        setCuratorSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    },
    [curatorSortKey],
  );

  const sortedCuratorRows = useMemo(() => {
    const rows = [...curatorDisplayRows];
    rows.sort((a, b) => {
      let cmp = 0;
      if (curatorSortKey === "id") {
        cmp =
          (Number(a.curatorRecordId) || 0) - (Number(b.curatorRecordId) || 0);
      } else if (curatorSortKey === "name") {
        cmp = a.name.localeCompare(b.name, "ru");
      } else if (curatorSortKey === "email") {
        cmp = a.email.localeCompare(b.email, "ru");
      } else if (curatorSortKey === "country") {
        cmp = a.country.localeCompare(b.country, "ru");
      } else if (curatorSortKey === "city") {
        cmp = a.city.localeCompare(b.city, "ru");
      } else if (curatorSortKey === "addressCity") {
        cmp = a.addressCity.localeCompare(b.addressCity, "ru");
      }
      return curatorSortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [curatorDisplayRows, curatorSortKey, curatorSortDir]);

  const curatorPageSize = curatorRowSlots;
  const curatorPageCount = Math.max(
    1,
    Math.ceil(sortedCuratorRows.length / curatorPageSize) || 1,
  );
  const curatorSafePage = Math.min(curatorPage, curatorPageCount);
  const curatorPageStart = (curatorSafePage - 1) * curatorPageSize;
  const curatorPageRows = sortedCuratorRows.slice(
    curatorPageStart,
    curatorPageStart + curatorPageSize,
  );
  const curatorFillerCount =
    curatorPageRows.length > 0
      ? Math.max(0, curatorPageSize - curatorPageRows.length)
      : 0;
  const curatorFillerHeightPx = curatorFillerCount * curatorRowHeightPx;

  useLayoutEffect(() => {
    if (activeVenueSection !== "admins") return undefined;
    const scrollEl = curatorsTableScrollRef.current;
    if (!scrollEl) return undefined;

    const measure = () => {
      const theadRow = scrollEl.querySelector("thead tr");
      const sampleRow = scrollEl.querySelector("tbody tr[data-curator-row]");
      const theadH = theadRow?.getBoundingClientRect().height ?? 56;
      const rowH =
        sampleRow?.getBoundingClientRect().height ??
        CURATOR_DEFAULT_ROW_HEIGHT;
      const available = scrollEl.clientHeight - theadH;
      const slots = Math.max(
        CURATOR_MIN_VISIBLE_ROWS,
        Math.floor(available / Math.max(1, rowH)),
      );
      setCuratorRowHeightPx(rowH);
      setCuratorRowSlots(slots);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(scrollEl);
    return () => ro.disconnect();
  }, [activeVenueSection, sortedCuratorRows.length, curatorPageRows.length]);

  useEffect(() => {
    if (curatorPage > curatorPageCount) setCuratorPage(curatorPageCount);
  }, [curatorPage, curatorPageCount]);

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

  const name = venue?.name != null ? String(venue.name) : "";
  const description =
    venue?.description != null ? String(venue.description) : "";
  const email = venue?.email != null ? String(venue.email) : "—";
  const phone = venue?.phone != null ? String(venue.phone) : "—";

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
      <div className={adminStyle.pageShell}>
        <Header />
        <div className={adminStyle.main}>
          <div className={adminStyle.titleWrap}>
            <h1>Общественные места</h1>
          </div>
          <div className={adminStyle.venues}>
            <div className={adminStyle.venuesToolbar}>
              <div className={style.venuesToolbarCluster}>
                <div className={adminStyle.search}>
                  <img src={search} alt="" />
                  <input
                    type="text"
                    name="search"
                    placeholder="Найти общественное место"
                    className={adminStyle.searchInput}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                  />
                </div>
                <NavLink className={style.return} to="/admin/venues">
                  <img src={returnPage} alt="" />
                  <p>Общественные места</p>
                </NavLink>
                <div className={style.frame}>
                  <div className={style.up}>
                    <div className={style.firstPartUp}>
                      <div className={style.venueInfo}>
                        <div className={style.valueDescription}>
                          <img
                            src={coverSrc}
                            alt=""
                            onError={() => setCoverBroken(true)}
                          />
                          <div className={style.nameDescription}>
                            <h1>
                              {venueLoading
                                ? "Загрузка…"
                                : name || "Без названия"}
                            </h1>
                            <p>
                              {venueLoading
                                ? ""
                                : description || "Нет описания"}
                            </p>
                          </div>
                        </div>
                        <div className={style.venueInfoUp}>
                          <div className={style.contactRow}>
                            <span className={style.contactLabel}>Email:</span>
                            <span className={style.contactValue}>
                              {venueLoading ? "…" : email}
                            </span>
                          </div>
                          <div className={style.addressStatusCell}>
                            <span
                              className={`${style.addressStatusLabel} ${style.addressStatusLabel_pending}`}
                            >
                              {STATUS_LABEL.PENDING}
                            </span>
                            <span
                              className={`${style.addressStatusCount} ${style.addressStatusCount_pending}`}
                            >
                              {addressStatusCounts.pending}
                            </span>
                          </div>
                          <div className={style.addressStatusCell}>
                            <span
                              className={`${style.addressStatusLabel} ${style.addressStatusLabel_processing}`}
                            >
                              {STATUS_LABEL.PROCESSING}
                            </span>
                            <span
                              className={`${style.addressStatusCount} ${style.addressStatusCount_processing}`}
                            >
                              {addressStatusCounts.processing}
                            </span>
                          </div>
                          <div className={style.contactRow}>
                            <span className={style.contactLabel}>
                              Моб. тел.:
                            </span>
                            <span className={style.contactValue}>
                              {venueLoading ? "…" : phone}
                            </span>
                          </div>
                          <div className={style.addressStatusCell}>
                            <span
                              className={`${style.addressStatusLabel} ${style.addressStatusLabel_approved}`}
                            >
                              {STATUS_LABEL.APPROVED}
                            </span>
                            <span
                              className={`${style.addressStatusCount} ${style.addressStatusCount_approved}`}
                            >
                              {addressStatusCounts.confirmed}
                            </span>
                          </div>
                          <div className={style.addressStatusCell}>
                            <span
                              className={`${style.addressStatusLabel} ${style.addressStatusLabel_denied}`}
                            >
                              {STATUS_LABEL.DENIED}
                            </span>
                            <span
                              className={`${style.addressStatusCount} ${style.addressStatusCount_denied}`}
                            >
                              {addressStatusCounts.rejected}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={style.down}>
                      <div
                        className={style.buttonsMenu}
                        role="tablist"
                        aria-label="Разделы заведения"
                      >
                        {VENUE_SECTION_TABS.map((tab) => {
                          const isActive = activeVenueSection === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              role="tab"
                              aria-selected={isActive}
                              id={`venue-section-tab-${tab.id}`}
                              aria-controls={`venue-section-panel-${tab.id}`}
                              className={`${style.menuTabBtn} ${isActive ? style.menuTabBtnActive : ""}`}
                              onClick={() => setActiveVenueSection(tab.id)}
                            >
                              {tab.label}
                            </button>
                          );
                        })}
                      </div>
                      <div
                        id={`venue-section-panel-${activeVenueSection}`}
                        role="tabpanel"
                        aria-labelledby={`venue-section-tab-${activeVenueSection}`}
                        className={style.tabPanel}
                      >
                        {activeVenueSection === "addresses" && (
                          <div className={style.addressSection}>
                            {venueLoading ? (
                              <p className={style.tabPanelPlaceholder}>
                                Загрузка…
                              </p>
                            ) : !venue?.id ? (
                              <p className={style.tabPanelPlaceholder}>—</p>
                            ) : addressBlocks.length === 0 ? (
                              <p className={style.tabPanelPlaceholder}>
                                Нет адресов
                              </p>
                            ) : (
                              <>
                                <div className={style.addressFilterRow}>
                                  <div
                                    ref={addressCountryFilterWrapRef}
                                    className={style.addressFilterWrap}
                                  >
                                    <button
                                      type="button"
                                      className={style.addressFilterTrigger}
                                      aria-expanded={addressCountryFilterOpen}
                                      aria-haspopup="listbox"
                                      onClick={() => {
                                        setAddressCountryFilterOpen((o) => !o);
                                        setAddressCityFilterOpen(false);
                                      }}
                                    >
                                      <img
                                        src={search}
                                        alt=""
                                        className={style.addressFilterIcon}
                                      />
                                      <span
                                        className={style.addressFilterLabel}
                                      >
                                        Страна
                                      </span>
                                      <img
                                        src={chevronDown}
                                        alt=""
                                        className={style.addressFilterArrow}
                                        aria-hidden
                                      />
                                    </button>
                                    {addressCountryFilterOpen ? (
                                      <ul
                                        className={style.addressFilterDropdown}
                                        role="listbox"
                                        aria-label="Страны"
                                        onMouseDown={(e) =>
                                          e.stopPropagation()
                                        }
                                      >
                                        {addressCountryOptions.map(
                                          (country) => (
                                            <li key={country}>
                                              <label
                                                className={
                                                  style.addressFilterOption
                                                }
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={selectedAddressCountries.includes(
                                                    country,
                                                  )}
                                                  onChange={() =>
                                                    toggleAddressCountryFilter(
                                                      country,
                                                    )
                                                  }
                                                />
                                                <span>{country}</span>
                                              </label>
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    ) : null}
                                  </div>
                                  <div
                                    ref={addressCityFilterWrapRef}
                                    className={style.addressFilterWrap}
                                  >
                                    <button
                                      type="button"
                                      className={style.addressFilterTrigger}
                                      aria-expanded={addressCityFilterOpen}
                                      aria-haspopup="listbox"
                                      onClick={() => {
                                        setAddressCityFilterOpen((o) => !o);
                                        setAddressCountryFilterOpen(false);
                                      }}
                                    >
                                      <img
                                        src={search}
                                        alt=""
                                        className={style.addressFilterIcon}
                                      />
                                      <span
                                        className={style.addressFilterLabel}
                                      >
                                        Город
                                      </span>
                                      <img
                                        src={chevronDown}
                                        alt=""
                                        className={style.addressFilterArrow}
                                        aria-hidden
                                      />
                                    </button>
                                    {addressCityFilterOpen ? (
                                      <ul
                                        className={style.addressFilterDropdown}
                                        role="listbox"
                                        aria-label="Города"
                                        onMouseDown={(e) =>
                                          e.stopPropagation()
                                        }
                                      >
                                        {addressCityOptions.map((city) => (
                                          <li key={city}>
                                            <label
                                              className={
                                                style.addressFilterOption
                                              }
                                            >
                                              <input
                                                type="checkbox"
                                                checked={selectedAddressCities.includes(
                                                  city,
                                                )}
                                                onChange={() =>
                                                  toggleAddressCityFilter(city)
                                                }
                                              />
                                              <span>{city}</span>
                                            </label>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                </div>
                                {filteredAddressBlocks.length === 0 ? (
                                  <p className={style.tabPanelPlaceholder}>
                                    Ничего не найдено
                                  </p>
                                ) : (
                                  <>
                                    {addressBlocksPageSlice.map((block) => (
                                      <section
                                        key={block.country}
                                        className={
                                          style.addressCountrySection
                                        }
                                      >
                                        <h2
                                          className={style.addressCountryTitle}
                                        >
                                          {block.country}
                                        </h2>
                                        <div className={style.addressCityGrid}>
                                          {block.cities.map(
                                            ({ city, lines }) => (
                                              <article
                                                key={`${block.country}-${city}`}
                                                className={
                                                  style.addressCityCard
                                                }
                                              >
                                                <div
                                                  className={
                                                    style.addressCityRow
                                                  }
                                                >
                                                  <span
                                                    className={
                                                      style.addressCityPrefix
                                                    }
                                                  >
                                                    Г.{" "}
                                                  </span>
                                                  <div
                                                    className={
                                                      style.addressCityCol
                                                    }
                                                  >
                                                    <span
                                                      className={
                                                        style.addressCityName
                                                      }
                                                    >
                                                      {city}
                                                    </span>
                                                    <div
                                                      className={
                                                        style.addressLineList
                                                      }
                                                    >
                                                      {lines.map(
                                                        (line, idx) => (
                                                          <p
                                                            key={`${line}-${idx}`}
                                                            className={
                                                              style.addressLine
                                                            }
                                                          >
                                                            {line}
                                                          </p>
                                                        ),
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </article>
                                            ),
                                          )}
                                        </div>
                                      </section>
                                    ))}
                                    {filteredAddressBlocks.length >
                                      ADDRESS_COUNTRIES_PER_PAGE && (
                                      <div
                                        className={`${adminStyle.pagination} ${style.addressCountryPagination}`}
                                      >
                                        <button
                                          type="button"
                                          className={adminStyle.pageNav}
                                          disabled={
                                            venueLoading ||
                                            addressCountrySafePage <= 1
                                          }
                                          onClick={() =>
                                            setAddressCountryPage((p) =>
                                              Math.max(1, p - 1),
                                            )
                                          }
                                          aria-label="Предыдущая страница стран"
                                        >
                                          ◀
                                        </button>
                                        <span
                                          className={adminStyle.pageCurrent}
                                        >
                                          {addressCountrySafePage}
                                        </span>
                                        <button
                                          type="button"
                                          className={adminStyle.pageNav}
                                          disabled={
                                            venueLoading ||
                                            addressCountrySafePage >=
                                              addressCountryPageCount
                                          }
                                          onClick={() =>
                                            setAddressCountryPage((p) =>
                                              Math.min(
                                                addressCountryPageCount,
                                                p + 1,
                                              ),
                                            )
                                          }
                                          aria-label="Следующая страница стран"
                                        >
                                          ▶
                                        </button>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {activeVenueSection === "admins" && (
                          <div
                            className={`${adminStyle.tableCard} ${style.curatorsTableCard}`}
                          >
                            <div
                              ref={curatorsTableScrollRef}
                              className={`${adminStyle.tableScroll} ${style.curatorsTableScroll}`}
                            >
                              <table
                                className={`${adminStyle.venuesTable} ${style.curatorsVenuesTable}`}
                              >
                                <thead>
                                  <tr>
                                    <th scope="col" className={style.curatorsCellLeft}>
                                      <button
                                        type="button"
                                        className={adminStyle.thSort}
                                        onClick={() => toggleCuratorSort("id")}
                                        aria-sort={
                                          curatorSortKey === "id"
                                            ? curatorSortDir === "asc"
                                              ? "ascending"
                                              : "descending"
                                            : "none"
                                        }
                                      >
                                        ID
                                        <SortArrows
                                          active={curatorSortKey === "id"}
                                          direction={curatorSortDir}
                                        />
                                      </button>
                                    </th>
                                    <th scope="col" className={style.curatorsCellLeft}>
                                      <button
                                        type="button"
                                        className={adminStyle.thSort}
                                        onClick={() =>
                                          toggleCuratorSort("name")
                                        }
                                        aria-sort={
                                          curatorSortKey === "name"
                                            ? curatorSortDir === "asc"
                                              ? "ascending"
                                              : "descending"
                                            : "none"
                                        }
                                      >
                                        Имя
                                        <SortArrows
                                          active={curatorSortKey === "name"}
                                          direction={curatorSortDir}
                                        />
                                      </button>
                                    </th>
                                    <th scope="col" className={style.curatorsCellLeft}>
                                      <button
                                        type="button"
                                        className={adminStyle.thSort}
                                        onClick={() =>
                                          toggleCuratorSort("email")
                                        }
                                        aria-sort={
                                          curatorSortKey === "email"
                                            ? curatorSortDir === "asc"
                                              ? "ascending"
                                              : "descending"
                                            : "none"
                                        }
                                      >
                                        Email
                                        <SortArrows
                                          active={curatorSortKey === "email"}
                                          direction={curatorSortDir}
                                        />
                                      </button>
                                    </th>
                                    <th
                                      scope="col"
                                      className={`${adminStyle.thPlain} ${style.curatorsCellLeft}`}
                                    >
                                      Телефон
                                    </th>
                                    <th
                                      scope="col"
                                      className={`${adminStyle.thPlain} ${style.curatorsCellLeft}`}
                                    >
                                      Владелец
                                    </th>
                                    <th scope="col" className={style.curatorsCellLeft}>
                                      <button
                                        type="button"
                                        className={adminStyle.thSort}
                                        onClick={() =>
                                          toggleCuratorSort("country")
                                        }
                                        aria-sort={
                                          curatorSortKey === "country"
                                            ? curatorSortDir === "asc"
                                              ? "ascending"
                                              : "descending"
                                            : "none"
                                        }
                                      >
                                        Страна
                                        <SortArrows
                                          active={
                                            curatorSortKey === "country"
                                          }
                                          direction={curatorSortDir}
                                        />
                                      </button>
                                    </th>
                                    <th scope="col" className={style.curatorsCellLeft}>
                                      <button
                                        type="button"
                                        className={adminStyle.thSort}
                                        onClick={() =>
                                          toggleCuratorSort("city")
                                        }
                                        aria-sort={
                                          curatorSortKey === "city"
                                            ? curatorSortDir === "asc"
                                              ? "ascending"
                                              : "descending"
                                            : "none"
                                        }
                                      >
                                        Город
                                        <SortArrows
                                          active={curatorSortKey === "city"}
                                          direction={curatorSortDir}
                                        />
                                      </button>
                                    </th>
                                    <th scope="col" className={style.curatorsCellLeft}>
                                      <button
                                        type="button"
                                        className={adminStyle.thSort}
                                        onClick={() =>
                                          toggleCuratorSort("addressCity")
                                        }
                                        aria-sort={
                                          curatorSortKey === "addressCity"
                                            ? curatorSortDir === "asc"
                                              ? "ascending"
                                              : "descending"
                                            : "none"
                                        }
                                      >
                                        Адрес
                                        <SortArrows
                                          active={
                                            curatorSortKey === "addressCity"
                                          }
                                          direction={curatorSortDir}
                                        />
                                      </button>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {venueLoading || !venue?.id ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className={adminStyle.tableEmpty}
                                      >
                                        Загрузка…
                                      </td>
                                    </tr>
                                  ) : curatorsLoading ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className={adminStyle.tableEmpty}
                                      >
                                        Загрузка…
                                      </td>
                                    </tr>
                                  ) : sortedCuratorRows.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className={adminStyle.tableEmpty}
                                      >
                                        Нет записей
                                      </td>
                                    </tr>
                                  ) : curatorPageRows.length === 0 ? (
                                    <tr>
                                      <td
                                        colSpan={8}
                                        className={adminStyle.tableEmpty}
                                      >
                                        Нет данных на странице
                                      </td>
                                    </tr>
                                  ) : (
                                    <>
                                      {curatorPageRows.map((row, i) => (
                                        <tr
                                          key={`${row.rowKey}-${curatorPageStart}-${i}`}
                                          data-curator-row={row.rowKey}
                                        >
                                          <td className={style.curatorsCellLeft}>
                                            {row.curatorRecordId ?? "—"}
                                          </td>
                                          <td
                                            className={`${adminStyle.cellNameBold} ${style.curatorsCellLeft}`}
                                          >
                                            {row.name}
                                          </td>
                                          <td className={style.curatorsCellLeft}>
                                            {row.email}
                                          </td>
                                          <td className={style.curatorsCellLeft}>
                                            {row.phone}
                                          </td>
                                          <td
                                            className={`${style.ownerDotCell} ${style.curatorsCellLeft}`}
                                          >
                                            <span
                                              className={`${style.ownerDot} ${row.isUserAdmin ? style.ownerDotAdmin : style.ownerDotNotAdmin}`}
                                              role="img"
                                              aria-label={
                                                row.isUserAdmin
                                                  ? "Владелец"
                                                  : "Не владелец"
                                              }
                                            />
                                          </td>
                                          <td className={style.curatorsCellLeft}>
                                            {row.country}
                                          </td>
                                          <td className={style.curatorsCellLeft}>
                                            {row.city}
                                          </td>
                                          <td className={style.curatorsCellLeft}>
                                            {row.addressCity}
                                          </td>
                                        </tr>
                                      ))}
                                      {curatorFillerHeightPx > 0 ? (
                                        <tr
                                          className={adminStyle.fillerRow}
                                          aria-hidden="true"
                                        >
                                          <td
                                            colSpan={8}
                                            style={{
                                              height: curatorFillerHeightPx,
                                            }}
                                          />
                                        </tr>
                                      ) : null}
                                    </>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            <div
                              className={`${adminStyle.pagination} ${style.curatorsPagination}`}
                            >
                              <button
                                type="button"
                                className={adminStyle.pageNav}
                                disabled={
                                  curatorsLoading ||
                                  venueLoading ||
                                  curatorSafePage <= 1
                                }
                                onClick={() =>
                                  setCuratorPage((p) => Math.max(1, p - 1))
                                }
                                aria-label="Предыдущая страница"
                              >
                                ◀
                              </button>
                              <span className={adminStyle.pageCurrent}>
                                {curatorSafePage}
                              </span>
                              <button
                                type="button"
                                className={adminStyle.pageNav}
                                disabled={
                                  curatorsLoading ||
                                  venueLoading ||
                                  curatorSafePage >= curatorPageCount
                                }
                                onClick={() =>
                                  setCuratorPage((p) =>
                                    Math.min(curatorPageCount, p + 1),
                                  )
                                }
                                aria-label="Следующая страница"
                              >
                                ▶
                              </button>
                            </div>
                          </div>
                        )}
                        {activeVenueSection === "listeners" && (
                          <p className={style.tabPanelPlaceholder}>
                            Раздел «Слушатели».
                          </p>
                        )}
                        {activeVenueSection === "music" && (
                          <p className={style.tabPanelPlaceholder}>
                            Раздел «Музыка».
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SingleVenueAdmin;

