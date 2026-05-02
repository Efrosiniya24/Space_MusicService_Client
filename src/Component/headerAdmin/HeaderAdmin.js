import React from "react";
import { useNavigate } from "react-router-dom";

import { getUserAvatarLetters } from "../../utils/getUserAvatarLetters";
import header from "./HeaderAdmin.module.css";
import logo from "../../icons/logo.png";
import music from "../../icons/Music_black.png";
import playlist from "../../icons/playlist_black.png";
import users from "../../icons/users_black.png";
import venues from "../../icons/venues_black.png";

const NAV_ICONS = [
  { src: music, label: "Музыка", to: "/admin/artists" },
  { src: playlist, label: "Плейлисты", to: null },
  { src: users, label: "Пользователи", to: null },
  { src: venues, label: "Заведения", to: "/admin/venues" },
];

const HeaderAdmin = () => {
  const navigate = useNavigate();
  const avatarLetters = getUserAvatarLetters();

  return (
    <div className={header.main}>
      <div className={header.logo}>
        <img src={logo} alt="" />
        <p>Space</p>
      </div>
      <div className={header.search}>
        {NAV_ICONS.map(({ src, label, to }) => (
          <div key={label} className={header.navIconWrap}>
            <button
              type="button"
              className={header.navIconBtn}
              aria-label={label}
              onClick={() => {
                if (to) navigate(to);
              }}
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
