/**
 * До 2 символов для аватарки: из localStorage `name`, иначе локальная часть `email` (до @).
 * Одна буква — если в имени или в части до @ только одна буква.
 */
export function getUserAvatarLetters() {
  const rawName = localStorage.getItem("name");
  const trimmedName = rawName != null ? String(rawName).trim() : "";

  if (trimmedName.length >= 1) {
    return trimmedName
      .slice(0, Math.min(2, trimmedName.length))
      .toUpperCase();
  }

  const rawEmail = localStorage.getItem("email");
  const email = rawEmail != null ? String(rawEmail).trim() : "";
  const at = email.indexOf("@");
  const localPart = at >= 0 ? email.slice(0, at).trim() : email;

  if (localPart.length >= 1) {
    return localPart.slice(0, Math.min(2, localPart.length)).toUpperCase();
  }

  return "";
}
