import React, { useState, useEffect } from "react";
import style from "./VenueAdmin.module.css";
import login from "../../auth/admin/adminAuth.module.css";

import Header from "../../../Component/headerAdmin/HeaderAdmin";
import search from "../../../icons/search_black.png";

const VenuesAdmin = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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
      <div className={style.pageShell}>
        <Header />
        <div className={style.main}>
          <div className={style.titleWrap}>
            <h1>Общественные места</h1>
          </div>
          <div className={style.venues}>
            <div className={style.search}>
              <img src={search} />
              <input
                type="text"
                name="search"
                placeholder="Найти общественное место"
                className={style.searchInput}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VenuesAdmin;
