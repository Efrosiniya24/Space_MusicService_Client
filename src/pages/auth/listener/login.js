import React, { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";

import login from "./login.module.css";
import logo from "../../../icons/logo.png";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
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
        if (response.status === 403) {
          setErrorMessage(
            "Ваш аккаунт деактивирован. Пожалуйста, свяжитесь с поддержкой.",
          );
        } else if (response.status === 401) {
          setErrorMessage("Неверный email или пароль");
        } else {
          setErrorMessage("Ошибка, свяжитесь с поддержкой пользователей");
        }
        return;
      }

      const data = await response.json();
      console.log("Server Response:", data);

      const { accessToken, userId, roles } = data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userId", String(userId));
      localStorage.setItem("userRoles", JSON.stringify(roles || []));

      const hasListenerRole = roles?.includes("LISTENER");

      if (!hasListenerRole) {
        await fetch(
          "http://localhost:8080/space/users/addRole?email=" +
            encodeURIComponent(email) +
            "&role=LISTENER",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        );
      }

      navigate("/");
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
      {errorMessage && <div className={login.errorBanner}>{errorMessage}</div>}
      <div className={login.form}>
        <form className={login.formElements} onSubmit={handleSubmit}>
          <div className={login.logoSection}>
            <img src={logo} />
            <h1 className={login}>Space</h1>
          </div>
          <div className={login.inputSectionButton}>
            <div className={login.input}>
              <div className={login.inputSectoion}>
                <p>Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="Введите email"
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
        <div className={login.choice}>
          <p>Нет аккаунта?</p>
          <NavLink to="/signUp">Зарегистрируйся</NavLink>
        </div>
      </div>
    </div>
  );
};

export default Login;
