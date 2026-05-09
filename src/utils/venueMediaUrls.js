const API_GATEWAY =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_GATEWAY) ||
  "http://localhost:8080";


export function getVenueCoverImageUrl(venueId) {
  if (venueId == null || venueId === "") {
    return null;
  }
  const u = new URL(`${API_GATEWAY}/space/media/getVenueCover`);
  u.searchParams.set("venueId", String(venueId));
  return u.toString();
}


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
