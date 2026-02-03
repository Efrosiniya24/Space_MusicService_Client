import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useNavigate, useLocation } from "react-router-dom";
  
import login from "../listener/login.module.css";
import logo from "../../../icons/logo.png";

const LoginVenue = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTo = location.state?.redirectTo || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
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

      const hasVenueAccess = roles?.some((r) =>
        ["MUSIC_CURATOR", "VENUE_ADMIN"].includes(r),
      );

      if (!hasVenueAccess) {
        setErrorMessage(
          "Нет доступа. Обратитесь к администратору вашего заведения",
        );
        return;
      }

      navigate("/venue/auth/venues");
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
        <div className={login.choice}>
          <p>Нет общественного места?</p>
          <NavLink to="/venue/auth/personalProfile">Создай</NavLink>
        </div>
      </div>
    </div>
  );
};

export default LoginVenue;
