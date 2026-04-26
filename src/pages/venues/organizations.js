import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { NavLink } from "react-router-dom";

import style from "./organizations.module.css";
import index from "../../index.module.css";
import venueAdmin from "../admin/venues/VenueAdmin.module.css";

import Music from "../../icons/music.png";
import Genres from "../../icons/genres.png";
import Org from "../../icons/org.png";

import Header from "../../Component/HeaderListener/headerListener";
import AudioPlayer from "../../Component/AudioPlayer/AudioPlayer";
import main from "../../pages/mainListenerPage/mainListenerPage.module.css";
import { API_GATEWAY, getVenueCoverImageUrl } from "../../utils/venueMediaUrls";

const ORG_CARD_W = 125;
const ORG_CARD_H = 125;
const ORG_GAP_X = 20;
const ORG_GAP_Y = 12;

function computeOrgGridSlots(width, height) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return 12;
  }
  const cols = Math.max(
    1,
    Math.floor((width + ORG_GAP_X) / (ORG_CARD_W + ORG_GAP_X)),
  );
  const rows = Math.max(
    1,
    Math.floor((height + ORG_GAP_Y) / (ORG_CARD_H + ORG_GAP_Y)),
  );
  return Math.max(1, cols * rows);
}

const Organizations = () => {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [gridSlots, setGridSlots] = useState(12);
  const orgAreaRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("accessToken");
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      try {
        const res = await fetch(`${API_GATEWAY}/space/venue/allConfirmed`, {
          headers,
        });
        if (!res.ok) {
          throw new Error("load_failed");
        }
        const data = await res.json();
        if (!cancelled) {
          setVenues(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить список");
          setVenues([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    const el = orgAreaRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      setGridSlots(computeOrgGridSlots(w, h));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageSize = Math.max(1, gridSlots);

  const pageCount = Math.max(
    1,
    Math.ceil(venues.length / pageSize) || 1,
  );
  const safePage = Math.min(page, pageCount);

  const pageVenues = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return venues.slice(start, start + pageSize);
  }, [venues, safePage, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className={index.mainListener}>
      <Header />
      <div className={style.main}>
        <div className={style.icons}>
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
          <div className={style.formIntro}>
            <div className={index.texInLine}>
              <h1>Общественные заведения</h1>
              <button type="button">Мои</button>
            </div>

            {error ? <p className={style.loadHint}>{error}</p> : null}
            {loading ? (
              <p className={style.loadHint}>Загрузка…</p>
            ) : null}
            {!loading && venues.length === 0 && !error ? (
              <p className={style.loadHint}>Пока нет подтверждённых мест</p>
            ) : null}
          </div>

          <div ref={orgAreaRef} className={style.organizationsArea}>
            <div className={style.organizations}>
              {pageVenues.map((v) => (
                <NavLink
                  key={v.id}
                  to={`/orgPage/${v.id}`}
                  className={style.orgCardLink}
                  aria-label={
                    v.name != null && String(v.name).trim()
                      ? String(v.name)
                      : `Заведение ${v.id}`
                  }
                >
                  <div className={style.orgCardWrap}>
                    <div className={`${main.musician} ${main.org}`}>
                      <img
                        key={`cover-${v.id}`}
                        src={getVenueCoverImageUrl(v.id) || ""}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.opacity = "0.35";
                        }}
                      />
                      <h2>
                        {v.name != null && String(v.name).trim()
                          ? v.name
                          : "—"}
                      </h2>
                    </div>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
          {!loading && venues.length > 0 ? (
            <div className={style.orgsPagination}>
              <button
                type="button"
                className={`${venueAdmin.pageNav} ${style.orgsPageNav}`}
                disabled={loading || safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Предыдущая страница"
              >
                ◀
              </button>
              <span
                className={`${venueAdmin.pageCurrent} ${style.orgsPageCurrent}`}
              >
                {safePage}
              </span>
              <button
                type="button"
                className={`${venueAdmin.pageNav} ${style.orgsPageNav}`}
                disabled={loading || safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                aria-label="Следующая страница"
              >
                ▶
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <AudioPlayer />
    </div>
  );
};

export default Organizations;
