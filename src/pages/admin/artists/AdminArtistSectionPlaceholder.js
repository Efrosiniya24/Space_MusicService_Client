import React from "react";
import { useNavigate, useParams } from "react-router-dom";

import style from "../venues/VenueAdmin.module.css";
import pageStyle from "./AdminArtistSectionPlaceholder.module.css";
import login from "../../auth/admin/adminAuth.module.css";

import Header from "../../../Component/headerAdmin/HeaderAdmin";

const titles = {
  tracks: "Треки исполнителя",
  albums: "Альбомы исполнителя",
};

const AdminArtistSectionPlaceholder = ({ section }) => {
  const navigate = useNavigate();
  const { artistId } = useParams();
  const title = titles[section] || "Раздел";

  return (
    <div className={login.mainLogin}>
      <div className={style.pageShell}>
        <Header />
        <div className={style.main}>
          <div className={style.titleWrap}>
            <h1>Исполнители</h1>
          </div>
          <div className={style.venues}>
            <div className={pageStyle.wrap}>
              <button
                type="button"
                className={pageStyle.backLink}
                onClick={() => navigate("/admin/artists")}
              >
                &lt; К списку исполнителей
              </button>
              <h2 className={pageStyle.title}>{title}</h2>
              <p className={pageStyle.sub}>
                Исполнитель ID: {artistId}. Здесь позже появится управление{" "}
                {section === "tracks" ? "треками" : "альбомами"}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminArtistSectionPlaceholder;
