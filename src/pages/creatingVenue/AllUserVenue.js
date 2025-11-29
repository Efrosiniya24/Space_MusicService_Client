import React, { useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

import style from "./AllUserVenue.module.css";
import index from "../../index.module.css";

import login from "../auth/listener/login.module.css";
import logo from "../../icons/logo.png";

const AllUserVenue = () => {
  return (
    <div className={login.mainLogin}>
      <div className={login.form}>
        <form className={login.formElements}>
          <div className={login.logoSection}>
            <img src={logo} />
            <h1 className={login}>Space</h1>
          </div>
          <div className={`${login.inputSectionButton} ${index.left}`}>
            <div className={`${login.inputSectoion} ${index.left}`}>
              <p>Мои общественные места:</p>
              <div className={style.venueButtons}>
                <button>asf</button>
              </div>
            </div>
          </div>
        </form>
        <div className={login.choice}>
          <p>Нет общественного места?</p>
          <a>Создай</a>
        </div>
      </div>
    </div>
  );
};

export default AllUserVenue;
