import React, { useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

import style from "./organizations.module.css";
import index from "../../index.module.css";

import Music from "../../icons/music.png";
import Genres from "../../icons/genres.png";
import Org from "../../icons/org.png";

import Header from "../../Component/HeaderListener/headerListener";
import AudioPlayer from "../../Component/AudioPlayer/AudioPlayer";
import main from "../../pages/mainListenerPage/mainListenerPage.module.css";

const Organizations = () => {
  return (
    <div className={index.mainListener}>
      <Header />
      <div className={style.main}>
        <div className={style.icons}>
          <a>
            <img src={Music} />
          </a>
          <a>
            <img src={Genres} />
          </a>
          <a>
            <img src={Org} />
          </a>
        </div>
        <div className={style.form}>
          <div className={index.texInLine}>
            <h1>Общественные заведения</h1>
            <button>Мои</button>
          </div>

          <div className={style.organizations}>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Organization</h2>
                </div>
              </a>
          </div>
        </div>
      </div>
      <AudioPlayer />
    </div>
  );
};

export default Organizations;
