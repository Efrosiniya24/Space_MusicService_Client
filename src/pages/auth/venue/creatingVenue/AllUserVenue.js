import React, { useEffect, useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

import style from "./AllUserVenue.module.css";
import index from "../../../auth/listener/login.module.css";

import login from "../../../auth/listener/login.module.css";
import logo from "../../../../icons/logo.png";

const AllUserVenue = () => {
  const [venues, setVenues] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const userId = localStorage.getItem("userId");
  const accessToken = localStorage.getItem("accessToken");

  const loadVenues = async () => {
    setErrorMessage("");

    try {
      const response = await fetch(
        `http://localhost:8080/space/venue/all/${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        console.log("Server status:", response.status);

        if (response.status === 401 || response.status === 403) {
          setErrorMessage("Нет доступа к общественным местам");
        } else {
          setErrorMessage("Ошибка при загрузке общественных мест");
        }
        return;
      }

      const data = await response.json();
      console.log("Venues:", data);

      setVenues(data);
    } catch (error) {
      console.error("Ошибка при загрузке venues:", error);
      setErrorMessage("Ошибка соединения с сервером");
    }
  };

  useEffect(() => {
    loadVenues();
  }, []);

  const buttons = venues.flatMap((venue) =>
    venue.addresses.map((address) => ({
      venueId: venue.id,
      venueName: venue.name,
      addressId: address.id,
      city: address.city,
      addressCity: address.addressCity,
    })),
  );

  return (
    <div className={login.mainLogin}>
      <div className={login.form}>
        <form className={login.formElements}>
          <div className={login.logoSection}>
            <img src={logo} alt="logo" />
            <h1 className={login}>Space</h1>
          </div>
          <div className={`${login.inputSectionButton} ${index.left}`}>
            <div className={`${login.inputSectoion} ${index.left}`}>
              <p>Мои общественные места:</p>
              <div className={style.venueButtons}>
                {buttons.map((btn) => (
                  <button key={btn.addressId} className={style.venueButton}>
                    <span
                      className={style.text}
                      title={`${btn.venueName}, г. ${btn.city}, ${btn.addressCity}`}
                    >
                      <b>{btn.venueName}</b>, г. {btn.city}, {btn.addressCity}
                    </span>
                  </button>
                ))}
              </div>
            </div>
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

export default AllUserVenue;
