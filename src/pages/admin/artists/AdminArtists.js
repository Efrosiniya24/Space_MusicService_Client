import React, { useEffect, useMemo, useState } from "react";
import style from "../venues/VenueAdmin.module.css";
import pageStyle from "./AdminArtists.module.css";
import login from "../../auth/admin/adminAuth.module.css";
import notice from "../../auth/listener/login.module.css";

import Header from "../../../Component/headerAdmin/HeaderAdmin";
import search from "../../../icons/search_black.png";

const API_GATEWAY = "http://localhost:8080";
const URL_ARTIST_ALL = `${API_GATEWAY}/space/media/artist/all`;
const URL_ARTIST_SEARCH = `${API_GATEWAY}/space/media/artist/search`;
const URL_ARTIST_CREATE = `${API_GATEWAY}/space/media/artist/create`;

const ROLE_TEXT = "Исполнитель\nКомпозитор\nАвтор\nПродюсер";

function formatDate(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  const d = String(dt.getDate()).padStart(2, "0");
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = String(dt.getFullYear());
  return `${d}.${m}.${y}`;
}

const AdminArtists = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", cover: "", description: "" });

  const pageSize = 8;

  const loadArtists = async (query = "") => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    const q = String(query || "").trim();
    const url = q
      ? `${URL_ARTIST_SEARCH}?query=${encodeURIComponent(q)}`
      : URL_ARTIST_ALL;
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    if (!errorMessage) return undefined;
    const timer = setTimeout(() => setErrorMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 2200);
    return () => clearTimeout(timer);
  }, [successMessage]);

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
  }, [artists, searchQuery, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const toggleSort = (key) => {
    setPage(1);
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const handleCreate = async () => {
    if (saving) return;
    const name = String(form.name || "").trim();
    if (!name) {
      setErrorMessage("Введите имя исполнителя");
      return;
    }
    setSaving(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(URL_ARTIST_CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          cover: String(form.cover || "").trim() || null,
          description: String(form.description || "").trim() || null,
        }),
      });
      if (!res.ok) throw new Error("artist_create_failed");
      setModalOpen(false);
      setForm({ name: "", cover: "", description: "" });
      await loadArtists();
      setSuccessMessage("Исполнитель добавлен");
      setErrorMessage("");
    } catch {
      setErrorMessage("Не удалось добавить исполнителя");
    } finally {
      setSaving(false);
    }
  };

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

          <div className={style.venues}>
            <div className={style.venuesToolbar}>
              <div className={style.search}>
                <img src={search} alt="" />
                <input
                  type="text"
                  placeholder="Найти исполнителя"
                  className={style.searchInput}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <div className={pageStyle.actions}>
                <button
                  type="button"
                  className={pageStyle.addBtn}
                  onClick={() => setModalOpen(true)}
                >
                  Добавить
                </button>
              </div>
            </div>

            <div className={`${style.tableCard} ${pageStyle.tableCard}`}>
              <div className={style.tableScroll}>
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
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td className={style.cellNameBold}>{row.name || "—"}</td>
                          <td className={pageStyle.roleCell}>{ROLE_TEXT}</td>
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
          </div>
        </div>
      </div>

      {modalOpen ? (
        <div
          className={pageStyle.modalBackdrop}
          onClick={() => !saving && setModalOpen(false)}
        >
          <div className={pageStyle.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={pageStyle.modalTitle}>Добавить исполнителя</h2>
            <div className={pageStyle.field}>
              <label>Имя</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Введите имя"
              />
            </div>
            <div className={pageStyle.field}>
              <label>Cover URL</label>
              <input
                value={form.cover}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cover: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className={pageStyle.field}>
              <label>Описание</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Короткое описание"
              />
            </div>
            <div className={pageStyle.modalActions}>
              <button
                type="button"
                className={pageStyle.cancelBtn}
                onClick={() => !saving && setModalOpen(false)}
                disabled={saving}
              >
                Отмена
              </button>
              <button
                type="button"
                className={pageStyle.addBtn}
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AdminArtists;
