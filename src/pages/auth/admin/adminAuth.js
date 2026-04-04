import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
import style from "./adminAuth.module.css";
import logo from "../../../icons/logo.png";
import login from "../listener/login.module.css";

const AdminAuth = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [highlightEmpty, setHighlightEmpty] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim()) {
      setSuccessMessage("");
      setErrorMessage("Не все поля заполнены");
      setHighlightEmpty(true);

      setTimeout(() => {
        setHighlightEmpty(false);
      }, 2000);
      return;
    }

    setSuccessMessage("");

    try {
      const response = await fetch(
        "http://localhost:8080/space/user/auth/signIn",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!response.ok) {
        console.log("Server status:", response.status);
        setSuccessMessage("");
        if (response.status === 403) {
          setErrorMessage(
            "Ваш аккаунт деактивирован. Пожалуйста, свяжитесь с поддержкой.",
          );
        } else {
          setErrorMessage("Неверный email или пароль");
        }
        return;
      }

      const data = await response.json();
      console.log("Server Response:", data);

      const { accessToken, userId, roles } = data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userId", String(userId));
      localStorage.setItem("userRoles", JSON.stringify(roles || []));
      console.log("ROLES:", roles);
      const hasVenueAccess = roles?.some((r) => ["SYSTEM_ADMIN"].includes(r));

      if (!hasVenueAccess) {
        setSuccessMessage("");
        setErrorMessage("Нет доступа");
        return;
      }

      setSuccessMessage("Авторизация прошла успешно!");
      setTimeout(() => {
        setSuccessMessage("");
        navigate("/");
      }, 1800);
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      setSuccessMessage("");
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
    <div className={style.mainLogin}>
      {errorMessage && <div className={login.errorBanner}>{errorMessage}</div>}
      {successMessage && (
        <div className={login.successBanner}>{successMessage}</div>
      )}

      <div className={style.header}>
        <div className={style.logo}>
          <img src={logo} />
          <p>Space</p>
        </div>
      </div>

      <div className={style.form}>
        <form className={style.formElements} onSubmit={handleSubmit}>
          <h1>Space</h1>
          <div className={login.inputSectionButton}>
            <div className={login.input}>
              <div className={login.inputSectoion}>
                <p>Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="Введите email"
                  value={email}
                  className={highlightEmpty && !email ? login.inputError : ""}
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
                  className={
                    highlightEmpty && !password ? login.inputError : ""
                  }
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <button type="submit">Войти</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAuth;
