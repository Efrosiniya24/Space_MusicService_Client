import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useParams } from "react-router-dom";

import index from "../../index.module.css";
import orgPageStyle from "./orgPage.module.css";
import orgStyle from "../venues/organizations.module.css";
import listStyle from "./preferencesListPage.module.css";
import apStyle from "./AddPreferences/addPreferencesPage.module.css";
import StatusBanner from "../../Component/StatusBanner/StatusBanner";
import Header from "../../Component/HeaderListener/headerListener";

import Music from "../../icons/music.png";
import Genres from "../../icons/genres.png";
import Org from "../../icons/org.png";
import ReturnPage from "../../icons/return.png";
import DeleteIcon from "../../icons/delete.png";
import { API_GATEWAY } from "../../utils/venueMediaUrls";

const WEEKDAY_LABEL = {
  0: "Воскресенье",
  1: "Понедельник",
  2: "Вторник",
  3: "Среда",
  4: "Четверг",
  5: "Пятница",
  6: "Суббота",
};

const VOLUME_LABEL = { QUIET: "Тихо", MEDIUM: "Средне", LOUD: "Громко" };
const PRESET_LABEL = {
  morning: "Утро",
  day: "День",
  evening: "Вечер",
  night: "Ночь",
};
const MEDIA_TAB = { tracks: "tracks", playlists: "playlists" };
const SQUARE_PAGE_SIZE = 4;

function formatDateTime(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paginate(values, page, pageSize = SQUARE_PAGE_SIZE) {
  const list = Array.isArray(values) ? values : [];
  const total = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(Math.max(1, page), total);
  const start = (safePage - 1) * pageSize;
  return { total, safePage, items: list.slice(start, start + pageSize) };
}

const PreferencesListPage = () => {
  const { venueId } = useParams();
  const venueNum = Number(venueId);
  const [items, setItems] = useState([]);
  const [venueName, setVenueName] = useState("");
  const [addressMap, setAddressMap] = useState(new Map());
  const [genresMap, setGenresMap] = useState(new Map());
  const [mediaTabByPreference, setMediaTabByPreference] = useState({});
  const [squarePageByKey, setSquarePageByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deletingByPreference, setDeletingByPreference] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    Promise.all([
      fetch(`${API_GATEWAY}/space/venue/${venueNum}`, { headers }).then(
        (res) => (res.ok ? res.json() : null),
      ),
      fetch(`${API_GATEWAY}/space/media/genre/all`, { headers }).then((res) =>
        res.ok ? res.json() : [],
      ),
      fetch(
        `${API_GATEWAY}/space/personalization/preferences/venue/${venueNum}?userId=${encodeURIComponent(userId || "")}`,
        { headers },
      ).then((res) => {
        if (!res.ok) throw new Error("fetch_preferences_failed");
        return res.json();
      }),
    ])
      .then(([venue, genres, prefs]) => {
        const map = new Map();
        const addresses = new Map();
        if (Array.isArray(venue?.addresses)) {
          venue.addresses.forEach((row) => {
            if (row?.id == null) return;
            const line = String(row?.addressCity || "").trim();
            const fallback = [row?.country, row?.city].filter(Boolean).join(", ");
            addresses.set(Number(row.id), line || fallback || `Адрес #${row.id}`);
          });
        }
        if (Array.isArray(genres)) {
          genres.forEach((g) => {
            if (g && g.id != null && g.name != null)
              map.set(Number(g.id), String(g.name));
          });
        }
        setVenueName(String(venue?.name || ""));
        setAddressMap(addresses);
        setGenresMap(map);
        setItems(Array.isArray(prefs) ? prefs : []);
        const tabState = {};
        (Array.isArray(prefs) ? prefs : []).forEach((p) => {
          if (p?.preferenceId != null) {
            tabState[p.preferenceId] = MEDIA_TAB.tracks;
          }
        });
        setMediaTabByPreference(tabState);
        setSquarePageByKey({});
        setError("");
      })
      .catch(() => setError("Не удалось загрузить предпочтения"))
      .finally(() => setLoading(false));
  }, [venueNum]);

  const cards = useMemo(
    () =>
      items.map((item) => {
        const blockCount = Array.isArray(item.scheduleBlocks)
          ? item.scheduleBlocks.length
          : 0;
        const genreCount = Array.isArray(item.genreIds)
          ? item.genreIds.length
          : 0;
        const addressCount = Array.isArray(item.addressIds)
          ? item.addressIds.length
          : 0;
        return { ...item, blockCount, genreCount, addressCount };
      }),
    [items],
  );

  const handleDelete = (preferenceId) => {
    if (deletingByPreference[preferenceId]) return;
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    setDeletingByPreference((prev) => ({ ...prev, [preferenceId]: true }));
    fetch(
      `${API_GATEWAY}/space/personalization/preferences/${preferenceId}?userId=${encodeURIComponent(userId || "")}`,
      { method: "DELETE", headers },
    )
      .then((res) => {
        if (!res.ok) throw new Error("delete_failed");
        setItems((prev) => prev.filter((it) => it.preferenceId !== preferenceId));
        setMediaTabByPreference((prev) => {
          const next = { ...prev };
          delete next[preferenceId];
          return next;
        });
        setSquarePageByKey((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((k) => {
            if (k.startsWith(`${preferenceId}-`)) delete next[k];
          });
          return next;
        });
        setSuccess("Предпочтение удалено");
        setError("");
      })
      .catch(() => setError("Не удалось удалить предпочтение"))
      .finally(() =>
        setDeletingByPreference((prev) => ({ ...prev, [preferenceId]: false })),
      );
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
          <nav className={apStyle.addPrefsBreadcrumbRow} aria-label="Навигация">
            <NavLink
              className={apStyle.addPrefsBreadcrumbBack}
              to={`/orgPage/${venueNum}`}
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
                to={`/orgPage/${venueNum}`}
              >
                {venueName || `Заведение #${venueNum}`}
              </NavLink>
            </div>
          </nav>

          <div className={listStyle.pageColumn}>
            <div className={listStyle.toolbar}>
              <h1 className={listStyle.title}>Мои предпочтения</h1>
            </div>
            <StatusBanner
              type="error"
              message={error}
              onClose={() => setError("")}
            />
            <StatusBanner
              type="success"
              message={success}
              onClose={() => setSuccess("")}
            />

            {loading ? <p className={orgPageStyle.hint}>Загрузка...</p> : null}
            {!loading && cards.length === 0 ? (
              <div className={listStyle.empty}>
                <p className={orgPageStyle.hint}>
                  Предпочтения для этого заведения пока не добавлены.
                </p>
              </div>
            ) : null}

            {!loading && cards.length > 0 ? (
              <div className={listStyle.cards}>
                {cards.map((item) => {
                  const genreNames = (item.genreIds || []).map(
                    (id) => genresMap.get(Number(id)) || `Жанр #${id}`,
                  );
                  const addressNames = (item.addressIds || []).map(
                    (id) => addressMap.get(Number(id)) || `Адрес #${id}`,
                  );
                  const preferenceId = item.preferenceId;

                  const addressesKey = `${preferenceId}-addresses`;
                  const genresKey = `${preferenceId}-genres`;
                  const mediaTab = mediaTabByPreference[preferenceId] || MEDIA_TAB.tracks;
                  const mediaValues =
                    mediaTab === MEDIA_TAB.tracks ? item.trackIds || [] : item.playlistIds || [];
                  const mediaKey = `${preferenceId}-media-${mediaTab}`;

                  const addressesPage = paginate(addressNames, squarePageByKey[addressesKey] || 1);
                  const genresPage = paginate(genreNames, squarePageByKey[genresKey] || 1);
                  const mediaPage = paginate(mediaValues, squarePageByKey[mediaKey] || 1);

                  const setPage = (key, nextPage) =>
                    setSquarePageByKey((prev) => ({ ...prev, [key]: nextPage }));

                  return (
                    <div key={item.preferenceId} className={listStyle.card}>
                      <div className={listStyle.cardTop}>
                        <span className={listStyle.preferenceId}>{item.preferenceId}</span>
                        <div className={listStyle.cardTopRight}>
                          <span className={listStyle.muted}>
                            {formatDateTime(item.createdAt)}
                          </span>
                          <button
                            type="button"
                            className={listStyle.deleteBtn}
                            onClick={() => handleDelete(preferenceId)}
                            disabled={Boolean(deletingByPreference[preferenceId])}
                            aria-label="Удалить предпочтение"
                            title="Удалить предпочтение"
                          >
                            <img src={DeleteIcon} alt="" className={listStyle.deleteIcon} />
                          </button>
                        </div>
                      </div>
                      <div className={listStyle.squaresRow}>
                        <section className={listStyle.square}>
                          <h3 className={listStyle.squareTitle}>Адреса</h3>
                          <ul className={listStyle.squareList}>
                            {addressesPage.items.length === 0 ? (
                              <li className={listStyle.squarePlaceholder}>Нет адресов</li>
                            ) : (
                              addressesPage.items.map((label, i) => (
                                <li key={`${preferenceId}-addr-${i}`} className={listStyle.squareItem}>
                                  {label}
                                </li>
                              ))
                            )}
                          </ul>
                          {addressesPage.total > 1 ? (
                            <div className={listStyle.squarePager}>
                              <button
                                type="button"
                                onClick={() => setPage(addressesKey, Math.max(1, addressesPage.safePage - 1))}
                                disabled={addressesPage.safePage <= 1}
                              >
                                ◀
                              </button>
                              <span>{addressesPage.safePage}/{addressesPage.total}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPage(addressesKey, Math.min(addressesPage.total, addressesPage.safePage + 1))
                                }
                                disabled={addressesPage.safePage >= addressesPage.total}
                              >
                                ▶
                              </button>
                            </div>
                          ) : null}
                        </section>

                        <section className={listStyle.square}>
                          <h3 className={listStyle.squareTitle}>Жанры</h3>
                          <ul className={listStyle.squareList}>
                            {genresPage.items.length === 0 ? (
                              <li className={listStyle.squarePlaceholder}>Нет жанров</li>
                            ) : (
                              genresPage.items.map((label, i) => (
                                <li key={`${preferenceId}-genre-${i}`} className={listStyle.squareItem}>
                                  {label}
                                </li>
                              ))
                            )}
                          </ul>
                          {genresPage.total > 1 ? (
                            <div className={listStyle.squarePager}>
                              <button
                                type="button"
                                onClick={() => setPage(genresKey, Math.max(1, genresPage.safePage - 1))}
                                disabled={genresPage.safePage <= 1}
                              >
                                ◀
                              </button>
                              <span>{genresPage.safePage}/{genresPage.total}</span>
                              <button
                                type="button"
                                onClick={() => setPage(genresKey, Math.min(genresPage.total, genresPage.safePage + 1))}
                                disabled={genresPage.safePage >= genresPage.total}
                              >
                                ▶
                              </button>
                            </div>
                          ) : null}
                        </section>

                        <section className={`${listStyle.square} ${listStyle.squareMedia}`}>
                          <div className={listStyle.mediaSquareTop}>
                            <div className={listStyle.mediaTabs}>
                              <button
                                type="button"
                                className={`${listStyle.mediaTabBtn} ${mediaTab === MEDIA_TAB.tracks ? listStyle.mediaTabBtnActive : ""}`}
                                onClick={() => setMediaTabByPreference((prev) => ({ ...prev, [preferenceId]: MEDIA_TAB.tracks }))}
                              >
                                Треки
                              </button>
                              <button
                                type="button"
                                className={`${listStyle.mediaTabBtn} ${mediaTab === MEDIA_TAB.playlists ? listStyle.mediaTabBtnActive : ""}`}
                                onClick={() => setMediaTabByPreference((prev) => ({ ...prev, [preferenceId]: MEDIA_TAB.playlists }))}
                              >
                                Плейлисты
                              </button>
                            </div>
                          </div>
                          <div className={listStyle.mediaSquareBottom}>
                            <ul className={listStyle.squareList}>
                              {mediaPage.items.length === 0 ? (
                                <li className={listStyle.squarePlaceholder}>
                                  {mediaTab === MEDIA_TAB.tracks ? "Треки не выбраны" : "Плейлисты не выбраны"}
                                </li>
                              ) : (
                                mediaPage.items.map((id, i) => (
                                  <li key={`${preferenceId}-media-${mediaTab}-${i}`} className={listStyle.squareItem}>
                                    {mediaTab === MEDIA_TAB.tracks ? `Трек #${id}` : `Плейлист #${id}`}
                                  </li>
                                ))
                              )}
                            </ul>
                            {mediaPage.total > 1 ? (
                              <div className={listStyle.squarePager}>
                                <button
                                  type="button"
                                  onClick={() => setPage(mediaKey, Math.max(1, mediaPage.safePage - 1))}
                                  disabled={mediaPage.safePage <= 1}
                                >
                                  ◀
                                </button>
                                <span>{mediaPage.safePage}/{mediaPage.total}</span>
                                <button
                                  type="button"
                                  onClick={() => setPage(mediaKey, Math.min(mediaPage.total, mediaPage.safePage + 1))}
                                  disabled={mediaPage.safePage >= mediaPage.total}
                                >
                                  ▶
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </section>
                      </div>
                      <div className={listStyle.bottomSection}>
                        <div className={listStyle.bottomCol}>
                          <div className={listStyle.rowTitle}>Громкость</div>
                          <div className={listStyle.chipsWrap}>
                            {(item.volumeLevels || []).length === 0 ? (
                              <span className={listStyle.softText}>Не выбрана</span>
                            ) : (
                              (item.volumeLevels || []).map((v) => (
                                <span key={`${preferenceId}-vol-${v}`} className={listStyle.bottomChip}>
                                  {VOLUME_LABEL[v] || v}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        <div className={listStyle.bottomCol}>
                          <div className={listStyle.rowTitle}>Даты и время</div>
                          <div className={listStyle.scheduleWrap}>
                            {(item.scheduleBlocks || []).length === 0 ? (
                              <span className={listStyle.softText}>Не выбрано</span>
                            ) : (
                              (item.scheduleBlocks || []).map((block) => {
                                const days = (block.weekDays || [])
                                  .map((d) => WEEKDAY_LABEL[d] || String(d))
                                  .join(", ");
                                const presets = (block.timePresets || [])
                                  .map((p) => PRESET_LABEL[p] || p)
                                  .join(", ");
                                const intervals = (block.customIntervals || [])
                                  .map((it) => `${it.from} - ${it.to}`)
                                  .join(", ");
                                const dates = (block.specificDates || []).join(", ");
                                return (
                                  <div key={block.blockId} className={listStyle.scheduleItem}>
                                    <p className={listStyle.rowText}><strong>Дни:</strong> {days || "—"}</p>
                                    <p className={listStyle.rowText}><strong>Пресеты:</strong> {presets || "—"}</p>
                                    <p className={listStyle.rowText}><strong>Интервалы:</strong> {intervals || "—"}</p>
                                    <p className={listStyle.rowText}><strong>Даты:</strong> {dates || "—"}</p>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesListPage;
