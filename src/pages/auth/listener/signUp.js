import React, { useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import login from "./login.module.css";
import logo from "../../../icons/logo.png";

const SignUp = () => {
  return (
    <div className={login.mainLogin}>
      <div className={login.form}>
        <div className={login.formElements}>
          <div className={login.logoSection}>
            <img src={logo} />
            <h1 className={login}>Space</h1>
          </div>
          <div className={login.inputSectionButton}>
            <div className={login.input}>
              <div className={login.inputSectoion}>
                <p>Пароль</p>
                <input
                  type="password"
                  name="password"
                  placeholder="Введите пароль"
                  // value={email}
                  // onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={login.inputSectoion}>
                <p>Пароль</p>
                <input
                  type="password"
                  name="password"
                  placeholder="Введите пароль"
                  // value={email}
                  // onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <button>Зарегистрироваться</button>
          </div>
        </div>
        <div className={login.choice}>
          <p>Нет аккаунта?</p>
          <a>Зарегистрируйся</a>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
