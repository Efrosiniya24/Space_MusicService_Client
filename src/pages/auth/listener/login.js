import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import login from "./login.module.css";
import logo from "../../../icons/logo.png";

const Login = () => {
  const navigate = useNavigate();
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

      navigate("/");
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      setErrorMessage("Произошла ошибка при авторизации");
    }
  };
  return (
    <div className={login.mainLogin}>
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
            </div>
            <button type="submit">Войти</button>
          </div>
        </form>
        <div className={login.choice}>
          <p>Нет аккаунта?</p>
          <a>Зарегистрируйся</a>
        </div>
      </div>
    </div>
  );
};

export default Login;
