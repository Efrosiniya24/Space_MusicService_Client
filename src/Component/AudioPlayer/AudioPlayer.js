import { useRef, useState, useEffect } from "react";

import style from "./AudioPlayer.module.css";

import Next from "../../icons/Next.png";
import Prev from "../../icons/Prev.png";
import Pause from "../../icons/Pause.png";
import Play from "../../icons/Play.png";
import Playlist from "../../icons/PlaylistWhite.png";
import Like from "../../icons/like.png";
import NotLike from "../../icons/NotLike.png";

import main from "../../pages/mainListenerPage/mainListenerPage.module.css";

export default function AudioPlayer({
  src,
  title = "Name of song",
  artist = "Musician",
  coverSrc = "",
  onClose,
  adminMode = false,
  onPlayingChange,
  onDurationKnown,
  onEnded,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(225);
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked((v) => !v);

  const hasSrc = Boolean(src);

  const toggle = () => {
    const a = audioRef.current;
    if (!hasSrc || !a) {
      setPlaying((p) => !p);
      return;
    }
    if (a.paused) {
      a.play();
      setPlaying(true);
      onPlayingChange?.(true);
    } else {
      a.pause();
      setPlaying(false);
      onPlayingChange?.(false);
    }
  };

  const onLoaded = (e) => {
    const d = e.currentTarget.duration || 225;
    setDur(d);
    if (Number.isFinite(d) && d > 0) {
      onDurationKnown?.(Math.round(d));
    }
  };
  const onTime = (e) => setTime(e.currentTarget.currentTime || 0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!hasSrc) {
      a.pause();
      setPlaying(false);
      onPlayingChange?.(false);
      setTime(0);
      return;
    }
    setTime(0);
    const p = a.play();
    if (p && typeof p.then === "function") {
      p
        .then(() => {
          setPlaying(true);
          onPlayingChange?.(true);
        })
        .catch(() => {
          setPlaying(false);
          onPlayingChange?.(false);
        });
    } else {
      setPlaying(true);
      onPlayingChange?.(true);
    }
  }, [src, hasSrc, onPlayingChange]);

  useEffect(() => {
    if (!isPlaying || hasSrc) return;
    const id = setInterval(() => setTime((t) => Math.min(t + 0.2, dur)), 200);
    return () => clearInterval(id);
  }, [isPlaying, hasSrc, dur]);

  const seek = (v) => {
    setTime(v);
    const a = audioRef.current;
    if (hasSrc && a?.duration) a.currentTime = v;
  };

  const pct = dur ? (time / dur) * 100 : 0;
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className={style.playingLine}>
      <div className={main.photoText}>
        <img src={coverSrc || ""} alt="" />
        <div className={main.text}>
          <a>
            <h1>{title}</h1>
          </a>
          <a>
            <p>{artist}</p>
          </a>
        </div>
        {!adminMode ? (
          <>
            <div className={main.iconInPhotoText}>
              <a onClick={toggleLike}>
                <img src={liked ? NotLike : Like} />
              </a>
            </div>
            <div className={main.iconInPhotoText}>
              <a>
                <img src={Playlist} />
              </a>
            </div>
          </>
        ) : null}
      </div>
      <div className={style.main}>
        <audio
          ref={audioRef}
          src={src || undefined}
          preload="metadata"
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTime}
          onEnded={() => {
            setPlaying(false);
            onPlayingChange?.(false);
            setTime(0);
            onEnded?.();
          }}
          style={{ display: "none" }}
        />

        <div className={style.controls}>
          {adminMode ? (
            <button
              type="button"
              className={style.adminPlayBtn}
              onClick={toggle}
              aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
          ) : (
            <>
              <a>
                <img className={style.icon} src={Prev} />
              </a>
              <a className={style.play} onClick={toggle} aria-label="Play/Pause">
                {isPlaying ? <img src={Pause} /> : <img src={Play} />}
              </a>
              <a>
                <img className={style.icon} src={Next} />
              </a>
            </>
          )}
        </div>

        <div className={style.progress}>
          <span className={style.time}>{fmt(time)}</span>
          <input
            type="range"
            className={style.range}
            min="0"
            max={dur || 0}
            step="0.01"
            value={time}
            onChange={(e) => seek(+e.target.value)}
            style={{ ["--fill"]: `${pct}%` }}
          />
          <span className={style.time}>{fmt(dur)}</span>
        </div>
      </div>
      <button
        type="button"
        className={adminMode ? style.closeBtn : style.fullBtn}
        onClick={onClose}
        aria-label={adminMode ? "Скрыть плеер" : "Полный экран"}
      >
        {adminMode ? "×" : "⤢"}
      </button>
    </div>
  );
}
