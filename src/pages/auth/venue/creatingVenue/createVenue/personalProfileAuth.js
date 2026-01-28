import React, { useState, useEffect } from "react";
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
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [highlightEmpty, setHighlightEmpty] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Не все поля заполнены");
      setHighlightEmpty(true);

      setTimeout(() => {
        setHighlightEmpty(false);
      }, 2000);
      return;
    }
    const url =
      authMode === "login"
        ? "http://localhost:8080/space/user/auth/signIn"
        : "http://localhost:8080/space/user/auth/signUp";

    const body =
      authMode === "login"
        ? { email, password }
        : { email, password, repeatPassword, role: "VENUE_ADMIN" };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.log("Server status:", response.status);
        if (authMode === "login") {
          setErrorMessage("Неверный email или пароль");
        } else {
          setErrorMessage("Ошибка при регистрации");
        }
        return;
      }

      const data = await response.json();
      console.log("Server Response:", data);

      if (authMode === "register") {
        setAuthMode("login");
        setErrorMessage("Регистрация успешна. Войдите в аккаунт.");
        return;
      }

      const { accessToken, userId, roles } = data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userId", String(userId));
      localStorage.setItem("userRoles", JSON.stringify(roles || []));

      const hasVenueAccess = roles?.some((r) =>
        ["MUSIC_CURATOR", "VENUE_ADMIN"].includes(r),
      );

      if (!hasVenueAccess) {
        setErrorMessage(
          "Нет доступа. Обратитесь к администратору вашего заведения",
        );
        return;
      }

      // navigate("/venue/auth/venues");
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      setErrorMessage("Произошла ошибка при авторизации");
    }
  };

  useEffect(() => {
    if (!errorMessage) return;

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [errorMessage]);
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
        <form className={style.formElements} onSubmit={handleSubmit}>
          <h1>Личный профиль</h1>
          <form className={` ${login.inputSectionButton} ${style.gap}`}>
            <div className={style.switchRow}>
              <label className={style.option}>
                <input
                  type="radio"
                  name="login"
                  value="login"
                  checked={authMode === "login"}
                  onChange={() => setAuthMode("login")}
                />
                <span>Войти</span>
                <span className={style.circle} />
              </label>

              <label className={style.option}>
                <input
                  type="radio"
                  name="register"
                  value="register"
                  checked={authMode === "register"}
                  onChange={() => setAuthMode("register")}
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
            {authMode === "register" && (
              <div className={login.inputSectoion}>
                <p>Повторите пароль</p>
                <input
                  type="password"
                  name="repeatPassword"
                  placeholder="Введите повторный пароль"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
            )}
          </form>
          <div className={login.inputSectionButton}>
            <button type="submit">Готово</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PersonalProfileAuth;
