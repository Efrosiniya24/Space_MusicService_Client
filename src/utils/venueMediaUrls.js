const API_GATEWAY =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_GATEWAY) ||
  "http://localhost:8080";

/**
 * Обложка заведения из media-service (таблица image_venue + MinIO).
 * Предпочтительный способ — всегда по venueId.
 */
export function getVenueCoverImageUrl(venueId) {
  if (venueId == null || venueId === "") {
    return null;
  }
  const u = new URL(`${API_GATEWAY}/space/media/getVenueCover`);
  u.searchParams.set("venueId", String(venueId));
  return u.toString();
}

/**
 * Старое поле cover в venue: полный URL, путь или object key в MinIO.
 */
export function resolveVenueCoverFromDtoField(cover) {
  if (cover == null || !String(cover).trim()) {
    return null;
  }
  const c = String(cover).trim();
  if (/^https?:\/\//i.test(c)) {
    return c;
  }
  if (c.startsWith("/space/media/")) {
    return `${API_GATEWAY}${c}`;
  }
  if (c.startsWith("/")) {
    return `${API_GATEWAY}${c}`;
  }
  return `${API_GATEWAY}/space/media/download?key=${encodeURIComponent(c)}`;
}

export { API_GATEWAY };
