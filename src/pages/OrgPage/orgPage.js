import React, { useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

import index from "../../index.module.css";
import style from "./orgPage.module.css";

import Header from "../../Component/HeaderListener/headerListener";

const OrgPage = () => {
  return (
    <div className={index.mainListener}>
      <Header />
      <div className={style.main}></div>
    </div>
  );
};

export default OrgPage;
