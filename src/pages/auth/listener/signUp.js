import React, { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import login from "./login.module.css";
import logo from "../../../icons/logo.png";

const SignUp = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [highlightEmpty, setHighlightEmpty] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!email.trim() || !password.trim() || !repeatPassword.trim()) {
      setErrorMessage("Не все поля заполнены");
      setHighlightEmpty(true);

      setTimeout(() => {
        setHighlightEmpty(false);
      }, 2000);
      return;
    }

    if (password !== repeatPassword) {
      setErrorMessage("Пароли не совпадают");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:8080/space/user/auth/signUp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            repeatPassword,
            role: "LISTENER",
          }),
        },
      );

      const signIn = await fetch(
        "http://localhost:8080/space/user/auth/signIn",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      const data = await signIn.json();
      const { accessToken: token, userId, roles } = data;

      localStorage.setItem("accessToken", token);
      localStorage.setItem("userId", String(userId));
      localStorage.setItem("userRoles", JSON.stringify(roles));

      navigate("/");
      return;
    } catch (error) {
      console.error("Ошибка при регистрации:", error);
      setErrorMessage("Произошла ошибка при регистрации");
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
      <div className={`${login.form} ${login.registerFormHeight}`}>
        <form className={login.formElements} onSubmit={handleSubmit}>
          <div className={login.logoSection}>
            <img src={logo} alt="Space logo" />
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
                  value={password}
                  className={
                    highlightEmpty && !password ? login.inputError : ""
                  }
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className={login.inputSectoion}>
                <p>Повторите пароль</p>
                <input
                  type="password"
                  name="repeatPassword"
                  placeholder="Повторите пароль"
                  value={repeatPassword}
                  className={
                    highlightEmpty && !repeatPassword ? login.inputError : ""
                  }
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit">Зарегистрироваться</button>
          </div>
        </form>
        <div className={login.choice}>
          <p>Уже есть аккаунт?</p>
          <NavLink to="/signIn">Войти</NavLink>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
