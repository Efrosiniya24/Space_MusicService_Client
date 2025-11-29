import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import login from "../../../../auth/listener/login.module.css";
import index from "../../../../../index.module.css";
import logo from "../../../../../icons/logo.png";
import style from "./personalProfileAuth.module.css";

const PersonalProfileAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    try {
      const response = await fetch(
        "http://localhost:8080/space/user/auth/signIn",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        console.log("Server status:", response.status);
        if (response.status === 403) {
          setErrorMessage(
            "Ваш аккаунт деактивирован. Пожалуйста, свяжитесь с поддержкой."
          );
        } else {
          setErrorMessage("Неверный логин или пароль");
        }
        return;
      }

      const data = await response.json();
      console.log("Server Response:", data);

      const { accessToken, userId, roles } = data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userId", String(userId));
      localStorage.setItem("userRoles", JSON.stringify(roles || []));

      const hasCuratorRole = roles?.includes("CURATOR");

      if (!hasCuratorRole) {
        setErrorMessage("У вас нет доступа к странице общественных мест");
        return;
      }

      navigate("/venue/auth/venues");
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      setErrorMessage("Произошла ошибка при авторизации");
    }
  };
  return (
    <div className={login.mainLogin}>
      <div className={style.sidebar}>
        <div className={style.icon}>
          <img src={logo} />
          <h1>Space</h1>
        </div>
        <div className={style.menu}>
          <div className={style.menuPart}>
            <div className={style.number}>
              <p>1</p>
            </div>
            <p>Личный профиль</p>
          </div>
          <div className={`${style.menuPart} ${style.futureDoing}`}>
            <div className={style.number}>
              <p>2</p>
            </div>
            <p>Создать общественное место</p>
          </div>
        </div>
      </div>
      <div className={`${login.form} ${style.height} ${index.left}`}>
        <form className={style.formElements}>
          <h1>Личный профиль</h1>
          <form className={` ${login.inputSectionButton} ${style.gap}`}>
            <div className={style.switchRow}>
              <label className={style.option}>
                <input
                  type="radio"
                  name="authMode"
                  //   value="login"
                  //   checked={mode === "login"}
                  //   onChange={() => onChange("login")}
                />
                <span>Войти</span>
                <span className={style.circle} />
              </label>

              <label className={style.option}>
                <input
                  type="radio"
                  name="authMode"
                  //   value="register"
                  //   checked={mode === "register"}
                  //   onChange={() => onChange("register")}
                />
                <span>Зарегистрироваться</span>
                <span className={style.circle} />
              </label>
            </div>
            <div className={login.inputSectoion}>
              <p>Email</p>
              <input
                type="email"
                name="email"
                placeholder="Введите email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={login.inputSectoion}>
              <p>Пароль</p>
              <input
                type="password"
                name="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </form>
          <form className={login.inputSectionButton}>
            <button>Готово</button>
          </form>
        </form>
      </div>
    </div>
  );
};

export default PersonalProfileAuth;
