import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import style from "./SingleVenueAdmin.module.css";
import chevronDown from "../../../icons/down.png";

const API_GATEWAY = "http://localhost:8080";

function urlVenueDocuments(venueId, venueAddressId) {
  const u = new URL(`${API_GATEWAY}/space/media/venueDocuments`);
  u.searchParams.set("venueId", String(venueId));
  if (venueAddressId != null) {
    u.searchParams.set("venueAddressId", String(venueAddressId));
  }
  return u.toString();
}

function urlVenueDocumentDownload(documentId) {
  const u = new URL(`${API_GATEWAY}/space/media/venueDocument/download`);
  u.searchParams.set("documentId", String(documentId));
  return u.toString();
}

function safeDownloadFileName(name) {
  const raw = name != null && String(name).trim() ? String(name).trim() : "document";
  return raw.replace(/[/\\:*?"<>|]/g, "_");
}

/** PDF/картинки открываем во вкладке; docx и др. — скачивание с именем из списка (иначе браузер даёт имя вида uuid у blob: URL). */
function shouldOpenBlobInNewTab(contentType, fileName) {
  const ct = (contentType || "").split(";")[0].trim().toLowerCase();
  if (ct === "application/pdf" || ct.startsWith("image/")) {
    return true;
  }
  if (ct && ct !== "application/octet-stream") {
    return false;
  }
  const lower = (fileName || "").toLowerCase();
  return /\.(pdf|png|jpe?g|gif|webp|txt)$/i.test(lower);
}

function formatAddressOption(a) {
  const line =
    a?.addressCity != null && String(a.addressCity).trim()
      ? String(a.addressCity).trim()
      : "—";
  const city =
    a?.city != null && String(a.city).trim() ? String(a.city).trim() : "—";
  return `${line}, г. ${city}`;
}

const VenueDocumentsPanel = ({ venue, venueLoading }) => {
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addressFilter, setAddressFilter] = useState(null);
  const wrapRef = useRef(null);

  const activeAddresses = useMemo(() => {
    const raw = Array.isArray(venue?.addresses) ? venue.addresses : [];
    return raw.filter((a) => a && !a.deleted);
  }, [venue?.addresses]);

  const filterLabel = useMemo(() => {
    if (addressFilter == null) return "Все";
    const a = activeAddresses.find((x) => x.id === addressFilter);
    return a ? formatAddressOption(a) : "Все";
  }, [addressFilter, activeAddresses]);

  const loadDocs = useCallback(async () => {
    if (venueLoading || !venue?.id) {
      setDocs([]);
      return;
    }
    setDocsLoading(true);
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(
        urlVenueDocuments(venue.id, addressFilter ?? undefined),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) {
        setDocs([]);
        return;
      }
      const data = await res.json();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setDocs([]);
    } finally {
      setDocsLoading(false);
    }
  }, [venue?.id, venueLoading, addressFilter]);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [filterOpen]);

  const openDocument = async (documentId, title) => {
    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(urlVenueDocumentDownload(documentId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const contentType = res.headers.get("content-type");
      const name = title ?? "document";

      if (shouldOpenBlobInNewTab(contentType, name)) {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
      } else {
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = safeDownloadFileName(name);
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000);
    } catch {
      /* ignore */
    }
  };

  const selectFilter = (next) => {
    setAddressFilter(next);
    setFilterOpen(false);
  };

  return (
    <aside className={style.documentsPanel} aria-label="Документы заведения">
      <h2 className={style.documentsPanelTitle}>Документы</h2>
      <div className={style.documentsFilterWrap} ref={wrapRef}>
        <button
          type="button"
          className={style.documentsFilterTrigger}
          aria-expanded={filterOpen}
          aria-haspopup="listbox"
          onClick={() => setFilterOpen((o) => !o)}
        >
          <span className={style.documentsFilterTriggerLabel}>{filterLabel}</span>
          <img src={chevronDown} alt="" className={style.documentsFilterChevron} />
        </button>
        {filterOpen ? (
          <ul className={style.documentsFilterList} role="listbox">
            <li>
              <button
                type="button"
                className={style.documentsFilterOption}
                onClick={() => selectFilter(null)}
              >
                Все
              </button>
            </li>
            {activeAddresses.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={style.documentsFilterOption}
                  onClick={() => selectFilter(a.id)}
                >
                  {formatAddressOption(a)}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className={style.documentsList}>
        {docsLoading || venueLoading ? (
          <p className={style.documentsListEmpty}>Загрузка…</p>
        ) : docs.length === 0 ? (
          <p className={style.documentsListEmpty}>Нет документов</p>
        ) : (
          <ul className={style.documentsListInner}>
            {docs.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className={style.documentsLink}
                  onClick={() => openDocument(d.id, d.title)}
                >
                  {d.title ?? "файл"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default VenueDocumentsPanel;
