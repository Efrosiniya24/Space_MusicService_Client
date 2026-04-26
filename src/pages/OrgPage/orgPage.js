import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";

import index from "../../index.module.css";
import style from "./orgPage.module.css";
import orgStyle from "../venues/organizations.module.css";
import login from "../auth/listener/login.module.css";

import Header from "../../Component/HeaderListener/headerListener";

import Music from "../../icons/music.png";
import Genres from "../../icons/genres.png";
import Org from "../../icons/org.png";
import ReturnPage from "../../icons/return.png";
import {
  API_GATEWAY,
  getVenueCoverImageUrl,
  resolveVenueCoverFromDtoField,
} from "../../utils/venueMediaUrls";

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

function splitCityHeadingForGrid(city) {
  const full = formatCityHeading(city);
  if (full === "—") {
    return { hasPrefix: false, rest: "—" };
  }
  const m = full.match(/^г\.\s*(.+)$/i);
  if (m) {
    return { hasPrefix: true, rest: m[1].trim() || "—" };
  }
  return { hasPrefix: false, rest: full };
}

function groupVenueAddressesByCity(addresses) {
  if (!Array.isArray(addresses) || addresses.length === 0) return [];
  const map = new Map();
  for (const a of addresses) {
    const city = String(a?.city ?? "").trim() || "—";
    if (!map.has(city)) map.set(city, []);
    map.get(city).push(a);
  }
  return Array.from(map.entries());
}

/** Сетка адресов: 3 колонки, не более 5 рядов карточек городов на странице. */
const ADDRESS_GRID_COLS = 3;
const ADDRESS_GRID_MAX_ROWS = 5;
const ADDRESSES_CITIES_PER_PAGE =
  ADDRESS_GRID_COLS * ADDRESS_GRID_MAX_ROWS;

const OrgPage = () => {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const preferenceNavigateTimerRef = useRef(null);
  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(Boolean(venueId));
  const [error, setError] = useState("");
  const [coverStep, setCoverStep] = useState(0);
  const [selectedAddressIds, setSelectedAddressIds] = useState(() => new Set());
  const [preferenceError, setPreferenceError] = useState("");
  const [preferenceSuccess, setPreferenceSuccess] = useState("");
  const [addressesPage, setAddressesPage] = useState(1);

  const idNum = useMemo(() => {
    if (venueId == null || venueId === "") return NaN;
    const n = Number(venueId);
    return Number.isFinite(n) ? n : NaN;
  }, [venueId]);

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
    venue?.name != null && String(venue.name).trim()
      ? String(venue.name)
      : "—";
  const description =
    venue?.description != null && String(venue.description).trim()
      ? String(venue.description)
      : "Нет описания";
  const email =
    venue?.email != null && String(venue.email).trim()
      ? String(venue.email)
      : "—";
  const phone =
    venue?.phone != null && String(venue.phone).trim()
      ? String(venue.phone)
      : "—";
  const urlWebSite =
    venue?.urlWebSite != null && String(venue.urlWebSite).trim()
      ? String(venue.urlWebSite).trim()
      : "";

  const addressesByCity = useMemo(
    () => groupVenueAddressesByCity(venue?.addresses),
    [venue?.addresses],
  );

  const addressCityPageCount = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(addressesByCity.length / ADDRESSES_CITIES_PER_PAGE),
      ),
    [addressesByCity.length],
  );

  const safeAddressPage = Math.min(
    Math.max(1, addressesPage),
    addressCityPageCount,
  );

  const pagedAddressesByCity = useMemo(() => {
    const start = (safeAddressPage - 1) * ADDRESSES_CITIES_PER_PAGE;
    return addressesByCity.slice(start, start + ADDRESSES_CITIES_PER_PAGE);
  }, [addressesByCity, safeAddressPage]);

  useEffect(() => {
    setAddressesPage(1);
  }, [venue?.id]);

  useEffect(() => {
    setAddressesPage((p) => Math.min(p, addressCityPageCount));
  }, [addressCityPageCount]);

  useEffect(() => {
    setSelectedAddressIds(new Set());
    setPreferenceError("");
    setPreferenceSuccess("");
  }, [venue?.id]);

  useEffect(() => {
    if (!preferenceError && !preferenceSuccess) return undefined;
    const t = setTimeout(() => {
      setPreferenceError("");
      setPreferenceSuccess("");
    }, 3000);
    return () => clearTimeout(t);
  }, [preferenceError, preferenceSuccess]);

  useEffect(() => {
    return () => {
      if (preferenceNavigateTimerRef.current != null) {
        clearTimeout(preferenceNavigateTimerRef.current);
        preferenceNavigateTimerRef.current = null;
      }
    };
  }, []);

  const toggleAddressSelected = (addressId) => {
    if (addressId == null) return;
    setSelectedAddressIds((prev) => {
      const next = new Set(prev);
      if (next.has(addressId)) next.delete(addressId);
      else next.add(addressId);
      return next;
    });
  };

  const handleAddPreferences = () => {
    setPreferenceError("");
    setPreferenceSuccess("");
    if (addressesByCity.length === 0) return;
    if (selectedAddressIds.size === 0) {
      setPreferenceError("Необходимо выбрать минимум 1 адрес");
      return;
    }
    setPreferenceSuccess("Адреса выбраны");
    if (preferenceNavigateTimerRef.current != null) {
      clearTimeout(preferenceNavigateTimerRef.current);
    }
    preferenceNavigateTimerRef.current = setTimeout(() => {
      preferenceNavigateTimerRef.current = null;
      navigate(`/orgPage/${idNum}/addPreferences`, {
        state: { selectedAddressIds: Array.from(selectedAddressIds) },
      });
    }, 1400);
  };

  return (
    <div className={`${index.mainListener} ${style.orgPageRoot}`}>
      <Header />
      <div className={`${orgStyle.main} ${style.orgPageMain}`}>
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
        <div className={style.form}>
          {preferenceError ? (
            <div className={login.errorBanner} role="alert">
              {preferenceError}
            </div>
          ) : null}
          {preferenceSuccess ? (
            <div className={login.successBanner} role="status">
              {preferenceSuccess}
            </div>
          ) : null}
          <NavLink className={style.return} to="/venues">
            <img src={ReturnPage} alt="" />
            <p>Общественные места</p>
          </NavLink>

          {!Number.isFinite(idNum) ? (
            <p className={style.hint}>
              Выберите заведение в списке на странице «Общественные заведения».
            </p>
          ) : null}

          {Number.isFinite(idNum) && loading ? (
            <p className={style.hint}>Загрузка…</p>
          ) : null}

          {Number.isFinite(idNum) && error ? (
            <p className={style.hint}>{error}</p>
          ) : null}

          {venue && !loading ? (
            <div className={style.venuePageColumn}>
              <div className={style.venueInfo}>
                <div className={style.venueHead}>
                  <div className={style.logo}>
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
                  <div className={style.venueMeta}>
                    <div className={style.venueMetaBlock}>
                      <div className={style.venueMetaText}>
                        <h1 className={style.venueName}>{name}</h1>
                        <p className={style.venueDescription}>{description}</p>
                      </div>
                      <div className={style.venueMetaContacts}>
                        <div className={style.venueRow}>
                          <span className={style.venueLabel}>Телефон:</span>
                          <span>{phone}</span>
                        </div>
                        {urlWebSite ? (
                          <div
                            className={`${style.venueRow} ${style.venueRowSite}`}
                          >
                            <span className={style.venueLabel}>Сайт:</span>
                            <div className={style.venueWebLinkScroll}>
                              <a
                                className={style.venueWebLink}
                                href={
                                  /^https?:\/\//i.test(urlWebSite)
                                    ? urlWebSite
                                    : `https://${urlWebSite}`
                                }
                                title={urlWebSite}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {urlWebSite}
                              </a>
                            </div>
                          </div>
                        ) : null}
                        <div className={style.venueRow}>
                          <span className={style.venueLabel}>Email:</span>
                          <span>{email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <section className={style.venueAddressesSection} aria-label="Адреса">
                <div className={style.venueAddressesToolbar}>
                  <div className={style.venueAddressesTitle}>Наши адреса</div>
                  <button
                    type="button"
                    className={style.venuePreferencesBtn}
                    disabled={addressesByCity.length === 0}
                    onClick={handleAddPreferences}
                  >
                    Добавить предпочтения
                  </button>
                </div>

                {addressesByCity.length === 0 ? (
                  <div className={style.venueAddressesEmpty}>
                    <p className={style.venueAddressesEmptyTitle}>
                      Адресов пока нет
                    </p>
                    <p className={style.venueAddressesEmptyText}>
                      Когда заведение добавит точки на карте, они появятся здесь.
                    </p>
                  </div>
                ) : (
                  <div className={style.venueAddressesGridWrap}>
                  <div className={style.venueAddressesGrid}>
                    {pagedAddressesByCity.map(([city, rows]) => {
                      const { hasPrefix, rest } = splitCityHeadingForGrid(city);
                      return (
                      <div key={city} className={style.venueCityCard}>
                        {hasPrefix ? (
                          <>
                            <span className={style.venueCityPrefix}>Г.</span>
                            <span className={style.venueCityRest}>{rest}</span>
                          </>
                        ) : (
                          <span
                            className={`${style.venueCityRest} ${style.venueCityRestFull}`}
                          >
                            {rest}
                          </span>
                        )}
                        <div
                          className={
                            hasPrefix
                              ? style.venueCityAddresses
                              : `${style.venueCityAddresses} ${style.venueCityAddressesFull}`
                          }
                        >
                          {rows.map((row, idx) => {
                            const line = String(row?.addressCity ?? "").trim();
                            const label =
                              line ||
                              [row?.country, row?.city]
                                .filter(Boolean)
                                .join(", ") ||
                              "—";
                            const id = row?.id;
                            const selected =
                              id != null && selectedAddressIds.has(id);
                            const rowKey =
                              id != null ? String(id) : `${city}-${idx}`;
                            return (
                              <div
                                key={rowKey}
                                className={`${style.venueAddressRow} ${id != null ? style.venueAddressRowClickable : ""}`}
                                role={id != null ? "checkbox" : undefined}
                                aria-checked={
                                  id != null ? selected : undefined
                                }
                                aria-label={
                                  id != null
                                    ? selected
                                      ? `Снять выбор: ${label}`
                                      : `Выбрать: ${label}`
                                    : undefined
                                }
                                tabIndex={id != null ? 0 : -1}
                                onClick={() =>
                                  id != null && toggleAddressSelected(id)
                                }
                                onKeyDown={(e) => {
                                  if (id == null) return;
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleAddressSelected(id);
                                  }
                                }}
                              >
                                <div
                                  className={style.venueAddressTextScroll}
                                  title={label}
                                >
                                  <span className={style.venueAddressText}>
                                    {label}
                                  </span>
                                </div>
                                <span
                                  aria-hidden
                                  className={`${style.venueAddressCheck} ${selected ? style.venueAddressCheckOn : ""} ${id == null ? style.venueAddressCheckInactive : ""}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                  {addressCityPageCount > 1 ? (
                    <div
                      className={style.addressPagination}
                      aria-label="Страницы адресов"
                    >
                      <button
                        type="button"
                        className={style.addressPageNav}
                        disabled={safeAddressPage <= 1}
                        onClick={() =>
                          setAddressesPage((p) => Math.max(1, p - 1))
                        }
                        aria-label="Предыдущая страница"
                      >
                        ◀
                      </button>
                      <span className={style.addressPageCurrent}>
                        {safeAddressPage}
                      </span>
                      <button
                        type="button"
                        className={style.addressPageNav}
                        disabled={safeAddressPage >= addressCityPageCount}
                        onClick={() =>
                          setAddressesPage((p) =>
                            Math.min(addressCityPageCount, p + 1),
                          )
                        }
                        aria-label="Следующая страница"
                      >
                        ▶
                      </button>
                    </div>
                  ) : null}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default OrgPage;
