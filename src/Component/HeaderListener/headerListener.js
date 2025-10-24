import React, { useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

import header from "./headerListener.module.css";
import logo from "../../logo.png";
import search from "../../searchWhite.png";

const HeaderListener = () => {
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
        <p>Ф</p>
      </div>
    </div>
  );
};

export default HeaderListener;
