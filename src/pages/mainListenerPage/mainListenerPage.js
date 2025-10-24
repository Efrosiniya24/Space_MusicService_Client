import React, { useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

import main from "./mainListenerPage.module.css";
import Header from "../../Component/HeaderListener/headerListener";

const MainListenerPage = () => {
  return (
    <div className={main.main}>
      <Header />
    </div>
  );
};

export default MainListenerPage;
