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
  const [successMessage, setSuccessMessage] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [highlightEmpty, setHighlightEmpty] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim() || !repeatPassword.trim()) {
      setSuccessMessage("");
      setErrorMessage("Не все поля заполнены");
      setHighlightEmpty(true);

      setTimeout(() => {
        setHighlightEmpty(false);
      }, 2000);
      return;
    }

    if (password !== repeatPassword) {
      setSuccessMessage("");
      setErrorMessage("Пароли не совпадают");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

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
      const {
        accessToken: token,
        userId,
        roles,
        name: displayName,
        email: emailFromApi,
      } = data;

      localStorage.setItem("accessToken", token);
      localStorage.setItem("userId", String(userId));
      localStorage.setItem(
        "name",
        displayName != null ? String(displayName) : "",
      );
      localStorage.setItem(
        "email",
        emailFromApi != null ? String(emailFromApi) : email,
      );
      localStorage.setItem("userRoles", JSON.stringify(roles));

      setSuccessMessage("Регистрация прошла успешно!");
      setTimeout(() => {
        navigate("/");
      }, 1800);
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
      {successMessage && (
        <div className={login.successBanner}>{successMessage}</div>
      )}
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
