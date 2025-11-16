import React, { useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import login from "./login.module.css";
import logo from "../../../icons/logo.png";

const SignUp = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (password !== passwordRepeat) {
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
          }),
        }
      );

      if (!response.ok) {
        console.log("Server status:", response.status);
        setErrorMessage("Ошибка при регистрации");
        return;
      }

      const data = await response.json();
      console.log("SignUp Response:", data);

      const { accessToken, userId, roles } = data;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("userId", String(userId));
      localStorage.setItem("userRoles", JSON.stringify(roles || []));

      navigate("/");
    } catch (error) {
      console.error("Ошибка при регистрации:", error);
      setErrorMessage("Произошла ошибка при регистрации");
    }
  };

  return (
    <div className={login.mainLogin}>
      <div className={login.form}>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                  required
                />
              </div>

              <div className={login.inputSectoion}>
                <p>Повторите пароль</p>
                <input
                  type="password"
                  name="passwordRepeat"
                  placeholder="Повторите пароль"
                  value={passwordRepeat}
                  onChange={(e) => setPasswordRepeat(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit">Зарегистрироваться</button>

            {errorMessage && (
              <p style={{ color: "red", marginTop: "8px" }}>{errorMessage}</p>
            )}
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
