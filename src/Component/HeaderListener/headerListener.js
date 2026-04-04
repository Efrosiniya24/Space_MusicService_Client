import React from "react";

import { getUserAvatarLetters } from "../../utils/getUserAvatarLetters";
import header from "./headerListener.module.css";
import logo from "../../icons/logo.png";
import search from "../../icons/searchWhite.png";

const HeaderListener = () => {
  const avatarLetters = getUserAvatarLetters();

  return (
    <div className={header.main}>
      <div className={header.logo}>
        <img src={logo} />
        <p>Space</p>
      </div>
      <div className={header.search}>
        <img src={search} />
        <input
          type="text"
          name="search"
          placeholder="Найти трек"
          // value={email}
          // onChange={(e) => setEmail(e.target.value)}
          className={header.searchInput}
        />
      </div>
      <div className={header.account}>
        <p>{avatarLetters}</p>
      </div>
    </div>
  );
};

export default HeaderListener;
