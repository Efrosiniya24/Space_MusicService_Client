import React from "react";

import { getUserAvatarLetters } from "../../utils/getUserAvatarLetters";
import header from "./HeaderAdmin.module.css";
import logo from "../../icons/logo.png";
import music from "../../icons/Music_black.png";
import playlist from "../../icons/playlist_black.png";
import users from "../../icons/users_black.png";
import venues from "../../icons/venues_black.png";

const NAV_ICONS = [
  { src: music, label: "Музыка" },
  { src: playlist, label: "Плейлисты" },
  { src: users, label: "Пользователи" },
  { src: venues, label: "Заведения" },
];

const HeaderAdmin = () => {
  const avatarLetters = getUserAvatarLetters();

  return (
    <div className={header.main}>
      <div className={header.logo}>
        <img src={logo} alt="" />
        <p>Space</p>
      </div>
      <div className={header.search}>
        {NAV_ICONS.map(({ src, label }) => (
          <div key={label} className={header.navIconWrap}>
            <button
              type="button"
              className={header.navIconBtn}
              aria-label={label}
            >
              <img src={src} alt="" />
            </button>
            <span className={header.navIconLabel}>{label}</span>
          </div>
        ))}
      </div>
      <div className={header.account}>
        <p>{avatarLetters}</p>
      </div>
    </div>
  );
};

export default HeaderAdmin;
