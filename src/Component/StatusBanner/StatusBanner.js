import { useEffect } from "react";
import style from "./StatusBanner.module.css";

const DEFAULT_DURATION_MS = 2500;

function StatusBanner({ type, message, onClose, durationMs = DEFAULT_DURATION_MS }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = window.setTimeout(() => {
      if (onClose) onClose();
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [message, onClose, durationMs, type]);

  if (!message) return null;

  const toneClass = type === "error" ? style.error : style.success;
  const role = type === "error" ? "alert" : "status";

  return (
    <div className={`${style.banner} ${toneClass}`} role={role}>
      {message}
    </div>
  );
}

export default StatusBanner;
