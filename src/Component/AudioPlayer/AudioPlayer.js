import { useRef, useState, useEffect } from "react";

import style from "./AudioPlayer.module.css";

import Next from "../../Next.png";
import Prev from "../../Prev.png";
import Pause from "../../Pause.png";
import Play from "../../Play.png";

export default function AudioPlayer({ src, className }) {
  const audioRef = useRef(null);
  const [isPlaying, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(225);

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
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const onLoaded = (e) => setDur(e.currentTarget.duration || 225);
  const onTime = (e) => setTime(e.currentTarget.currentTime || 0);

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
    <div className={style.main}>
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="metadata"
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTime}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
        }}
        style={{ display: "none" }}
      />

      <div className={style.controls}>
        <a>
          <img className={style.icon} src={Prev} />
        </a>
        <a
          className={style.play}
          onClick={toggle}
          aria-label="Play/Pause"
        >
          {isPlaying ? <img src={Play} /> : <img src={Pause} />}
        </a>
        <a>
          <img className={style.icon} src={Next} />
        </a>
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
  );
}
