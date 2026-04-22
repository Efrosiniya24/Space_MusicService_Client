import React from "react";
import { createPortal } from "react-dom";

import style from "./VenueAdmin.module.css";

export const API_GATEWAY_VENUE = "http://localhost:8080";

export function urlVenueConfirm(id) {
  return `${API_GATEWAY_VENUE}/space/system/venue/confirm/${id}`;
}

export function mapUiStatusToApiParam(uiKey) {
  switch (uiKey) {
    case "APPROVED":
      return "CONFIRMED";
    case "DENIED":
      return "REJECTED";
    default:
      return uiKey;
  }
}

export const STATUS_LABEL = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  APPROVED: "Approved",
  DENIED: "Denied",
};

export const ALL_STATUS_KEYS = ["PENDING", "PROCESSING", "APPROVED", "DENIED"];

export function mapVenueStatusForUi(apiStatus) {
  const s = String(apiStatus ?? "").toUpperCase();
  if (s === "CONFIRMED") return "APPROVED";
  if (s === "REJECTED") return "DENIED";
  if (s === "PROCESSING") return "PROCESSING";
  return "PENDING";
}

export function filterAddressRecordsByApiStatus(records, apiStatus) {
  const target = String(apiStatus).toUpperCase();
  return (Array.isArray(records) ? records : []).filter((r) => {
    const st = String(r?.status ?? "PENDING").toUpperCase();
    return st === target;
  });
}

export function buildAddressRecordsFromVenue(venue) {
  const raw = Array.isArray(venue?.addresses) ? venue.addresses : [];
  const active = raw.filter((a) => a && !a.deleted);
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
    addressRecords.push({
      id: a.id,
      status: a.status,
      addressCity,
      city,
      country,
    });
  }
  addressRecords.sort((x, y) => {
    const c = x.country.localeCompare(y.country, "ru");
    if (c !== 0) return c;
    const d = x.city.localeCompare(y.city, "ru");
    if (d !== 0) return d;
    return x.addressCity.localeCompare(y.addressCity, "ru");
  });
  return addressRecords;
}

const METRIC_DETAIL_TITLE = {
  addresses: "Адреса",
  cities: "Города",
  countries: "Страны",
};

export function VenueMetricDetailDialog({ detail, onClose, onAddressStatusClick }) {
  if (!detail || typeof document === "undefined") return null;
  const title = METRIC_DETAIL_TITLE[detail.kind] ?? "";
  const count = Array.isArray(detail.items) ? detail.items.length : 0;
  const headline = `${title} (${count}) – ${detail.venueName ?? ""}`;
  return createPortal(
    <div
      className={style.venueMetricDialogBackdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        className={style.venueMetricDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="venue-metric-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={style.venueMetricDialogHeader}>
          <h2
            id="venue-metric-dialog-title"
            className={style.venueMetricDialogTitle}
          >
            {headline}
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
        <ul className={style.venueMetricDialogList}>
          {detail.kind === "countries" &&
            detail.items.map((it, i) => (
              <li key={`${it.country}-${i}`}>{it.country}</li>
            ))}
          {detail.kind === "cities" &&
            detail.items.map((it, i) => (
              <li key={`${it.city}-${it.country}-${i}`}>
                {it.city}
                {" – "}
                {it.country}
              </li>
            ))}
          {detail.kind === "addresses" &&
            detail.items.map((it) => {
              const statusKey = mapVenueStatusForUi(it.status);
              return (
                <li key={it.id} className={style.venueMetricDialogAddressRow}>
                  <div className={style.venueMetricDialogAddressText}>
                    <span className={style.venueMetricDialogLine}>
                      {it.addressCity}
                    </span>
                    {", "}
                    {it.city}
                    {" – "}
                    {it.country}
                  </div>
                  {onAddressStatusClick && detail.venueId != null ? (
                    <button
                      type="button"
                      className={style.statusBadgeButton}
                      aria-haspopup="dialog"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddressStatusClick(it, e.currentTarget, detail.venueId);
                      }}
                    >
                      <span
                        className={`${style.statusBadge} ${style[`status_${statusKey}`] || ""}`}
                      >
                        {STATUS_LABEL[statusKey] ?? statusKey}
                      </span>
                    </button>
                  ) : null}
                </li>
              );
            })}
        </ul>
      </div>
    </div>,
    document.body,
  );
}

export function AddressStatusChangePopover({
  currentStatus,
  draftStatus,
  onSelect,
  onSave,
  popoverRef,
  styleBox,
  radioGroupName,
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
        zIndex: 10050,
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
              name={radioGroupName}
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
      <button
        type="button"
        className={style.statusPopoverSave}
        disabled={!draftStatus}
        onClick={onSave}
      >
        Сохранить
      </button>
    </div>,
    document.body,
  );
}
