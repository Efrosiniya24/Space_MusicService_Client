import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import login from "../../../../auth/listener/login.module.css";
import index from "../../../../../index.module.css";
import logo from "../../../../../icons/logo.png";
import style from "./personalProfileAuth.module.css";

function getFileTypeInfo(file) {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toUpperCase() : "";
  const mime = file.type || "";

  if (mime === "application/pdf" || ext === "PDF") {
    return { label: "PDF", bg: "#E53935", fg: "#FFFFFF" };
  }
  if (mime === "application/msword" || ext === "DOC") {
    return { label: "DOC", bg: "#2B579A", fg: "#FFFFFF" };
  }
  if (mime.includes("wordprocessingml") || ext === "DOCX") {
    return { label: "DOCX", bg: "#2B579A", fg: "#FFFFFF" };
  }
  if (mime === "application/vnd.ms-excel" || ext === "XLS") {
    return { label: "XLS", bg: "#217346", fg: "#FFFFFF" };
  }
  if (mime.includes("spreadsheetml") || ext === "XLSX") {
    return { label: "XLSX", bg: "#217346", fg: "#FFFFFF" };
  }
  if (mime === "text/plain" || ext === "TXT") {
    return { label: "TXT", bg: "#78909C", fg: "#FFFFFF" };
  }
  if (
    mime.includes("zip") ||
    mime.includes("x-rar") ||
    ["ZIP", "RAR", "7Z"].includes(ext)
  ) {
    return { label: ext || "ZIP", bg: "#F9A825", fg: "#333333" };
  }
  if (mime.includes("presentationml") || ext === "PPT" || ext === "PPTX") {
    return {
      label: ext === "PPTX" ? "PPTX" : "PPT",
      bg: "#D24726",
      fg: "#FFFFFF",
    };
  }
  if (ext) {
    const short = ext.length > 5 ? ext.slice(0, 5) : ext;
    return { label: short, bg: "#616161", fg: "#FFFFFF" };
  }
  return { label: "FILE", bg: "#616161", fg: "#FFFFFF" };
}

function FileThumb({ file, onRemove, onImagePreview }) {
  const isImage = file.type.startsWith("image/");
  const [previewUrl, setPreviewUrl] = useState(null);
  const typeInfo = getFileTypeInfo(file);

  useEffect(() => {
    if (!isImage) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  return (
    <div className={style.fileThumb} title={file.name}>
      <button
        type="button"
        className={style.fileThumbRemove}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label="Удалить файл"
      >
        ×
      </button>
      {isImage && previewUrl ? (
        <button
          type="button"
          className={style.fileThumbOpen}
          onClick={() => onImagePreview?.(file)}
          aria-label="Открыть фото крупно"
        >
          <img
            src={previewUrl}
            alt=""
            className={style.fileThumbImg}
            draggable={false}
          />
        </button>
      ) : (
        <div
          className={style.fileThumbType}
          style={{ backgroundColor: typeInfo.bg, color: typeInfo.fg }}
          aria-hidden
        >
          <span className={style.fileThumbTypeLabel}>{typeInfo.label}</span>
        </div>
      )}
    </div>
  );
}

const PersonalProfileAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueEmail, setVenueEmail] = useState("");
  const [venuePhone, setVenuePhone] = useState("");
  const [venueDescription, setVenueDescription] = useState("");
  const [websiteLink, setWebsiteLink] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [highlightEmpty, setHighlightEmpty] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [venueLogoFile, setVenueLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoLightboxOpen, setLogoLightboxOpen] = useState(false);
  const [fileLightboxFile, setFileLightboxFile] = useState(null);
  const [fileLightboxUrl, setFileLightboxUrl] = useState(null);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const nextAddressIdRef = useRef(1);
  const [addresses, setAddresses] = useState([{ id: 0, value: "" }]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setSuccessMessage("");
      setErrorMessage("Не все поля заполнены");
      setHighlightEmpty(true);

      setTimeout(() => {
        setHighlightEmpty(false);
      }, 2000);
      return;
    }

    if (authMode === "register" && password !== repeatPassword) {
      setSuccessMessage("");
      setErrorMessage("Пароли не совпадают");
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const url =
      authMode === "login"
        ? "http://localhost:8080/space/user/auth/signIn"
        : "http://localhost:8080/space/user/auth/signUp";

    const body =
      authMode === "login"
        ? { email, password }
        : { email, password, repeatPassword, role: "VENUE_ADMIN" };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.log("Server status:", response.status);
        setSuccessMessage("");
        if (authMode === "login") {
          setErrorMessage(
            "Проверьте введенный пароль и email  или зарегистрируйтесь",
          );
        } else {
          setErrorMessage("Ошибка при регистрации");
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
        setSuccessMessage("");
        setErrorMessage(
          "Нет доступа. Обратитесь к администратору вашего заведения",
        );
        return;
      }

      setSuccessMessage(
        authMode === "login"
          ? "Авторизация прошла успешно!"
          : "Регистрация прошла успешно!",
      );
      setTimeout(() => {
        setSuccessMessage("");
        setIsAuthorized(true);
      }, 1800);
    } catch (error) {
      console.error("Ошибка при авторизации:", error);
      setSuccessMessage("");
      setErrorMessage("Произошла ошибка при авторизации");
    }
  };

  const handleVenueCreateSubmit = (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    // TODO: отправка данных заведения на API
  };

  useEffect(() => {
    if (!errorMessage) return;

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
    e.target.value = "";
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!venueLogoFile) {
      setLogoPreviewUrl(null);
      setLogoLightboxOpen(false);
      return;
    }
    const url = URL.createObjectURL(venueLogoFile);
    setLogoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [venueLogoFile]);

  useEffect(() => {
    if (!fileLightboxFile || !fileLightboxFile.type.startsWith("image/")) {
      setFileLightboxUrl(null);
      return;
    }
    const url = URL.createObjectURL(fileLightboxFile);
    setFileLightboxUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fileLightboxFile]);

  useEffect(() => {
    if (!logoLightboxOpen && !fileLightboxFile) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setLogoLightboxOpen(false);
        setFileLightboxFile(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [logoLightboxOpen, fileLightboxFile]);

  useEffect(() => {
    if (!fileLightboxFile) return;
    if (!selectedFiles.includes(fileLightboxFile)) {
      setFileLightboxFile(null);
    }
  }, [selectedFiles, fileLightboxFile]);

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setVenueLogoFile(file);
    }
    e.target.value = "";
  };

  const clearVenueLogo = () => {
    setVenueLogoFile(null);
  };

  const openLogoPicker = () => {
    logoInputRef.current?.click();
  };

  const lastAddressFilled = () => {
    if (addresses.length === 0) return false;
    const last = addresses[addresses.length - 1].value;
    return String(last).trim() !== "";
  };

  const addAddressRow = () => {
    if (!lastAddressFilled()) return;
    setAddresses((prev) => [
      ...prev,
      { id: nextAddressIdRef.current++, value: "" },
    ]);
  };

  const removeAddressRow = (id) => {
    setAddresses((prev) =>
      prev.length <= 1 ? prev : prev.filter((row) => row.id !== id),
    );
  };

  const setAddressValue = (id, value) => {
    setAddresses((prev) =>
      prev.map((row) => (row.id === id ? { ...row, value } : row)),
    );
  };

  return (
    <div className={login.mainLogin}>
      {errorMessage && <div className={login.errorBanner}>{errorMessage}</div>}
      {successMessage && (
        <div className={login.successBanner}>{successMessage}</div>
      )}
      {logoLightboxOpen && logoPreviewUrl && (
        <div
          className={style.logoLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр фото логотипа"
          onClick={() => setLogoLightboxOpen(false)}
        >
          <button
            type="button"
            className={style.logoLightboxClose}
            onClick={(e) => {
              e.stopPropagation();
              setLogoLightboxOpen(false);
            }}
            aria-label="Закрыть просмотр"
          >
            ×
          </button>
          <div
            className={style.logoLightboxBody}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={logoPreviewUrl}
              alt=""
              className={style.logoLightboxImg}
            />
          </div>
        </div>
      )}
      {fileLightboxFile && fileLightboxUrl && (
        <div
          className={style.logoLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр вложения"
          onClick={() => setFileLightboxFile(null)}
        >
          <button
            type="button"
            className={style.logoLightboxClose}
            onClick={(e) => {
              e.stopPropagation();
              setFileLightboxFile(null);
            }}
            aria-label="Закрыть просмотр"
          >
            ×
          </button>
          <div
            className={style.logoLightboxBody}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={fileLightboxUrl}
              alt=""
              className={style.logoLightboxImg}
            />
          </div>
        </div>
      )}
      <div className={style.sidebar}>
        <div className={style.icon}>
          <img src={logo} />
          <h1>Space</h1>
        </div>
        <div className={style.menu}>
          <div className={style.menuPart}>
            <div className={style.number}>
              <p>1</p>
            </div>
            <p>Личный профиль</p>
          </div>
          <div
            className={`${style.menuPart} ${!isAuthorized ? style.futureDoing : ""}`}
          >
            <div className={style.number}>
              <p>2</p>
            </div>
            <p>Создать общественное место</p>
          </div>
        </div>
      </div>
      {!isAuthorized ? (
        <div className={`${login.form} ${style.profileFormCard} ${index.left}`}>
          <form className={style.formElements} onSubmit={handleAuthSubmit}>
            <h1>Личный профиль</h1>
            <div className={` ${login.inputSectionButton} ${style.gap}`}>
              <div className={style.switchRow}>
                <label className={style.option}>
                  <input
                    type="radio"
                    name="login"
                    value="login"
                    checked={authMode === "login"}
                    onChange={() => setAuthMode("login")}
                  />
                  <span>Войти</span>
                  <span className={style.circle} />
                </label>

                <label className={style.option}>
                  <input
                    type="radio"
                    name="register"
                    value="register"
                    checked={authMode === "register"}
                    onChange={() => setAuthMode("register")}
                  />
                  <span>Зарегистрироваться</span>
                  <span className={style.circle} />
                </label>
              </div>
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
              {authMode === "register" && (
                <div className={login.inputSectoion}>
                  <p>Повторите пароль</p>
                  <input
                    type="password"
                    name="repeatPassword"
                    placeholder="Введите повторный пароль"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className={login.inputSectionButton}>
              <button type="submit">Готово</button>
            </div>
          </form>
        </div>
      ) : (
        <div
          className={`${login.form} ${style.profileFormCard} ${index.left} ${style.venueCreateCard}`}
        >
          <form
            className={style.formElements}
            onSubmit={handleVenueCreateSubmit}
          >
            <h1>Создание общественного места</h1>
            <div className={style.row}>
              <div className={style.column}>
                <div
                  className={`${login.inputSectoion} ${login.narrowInputSection}`}
                >
                  <p>Название</p>
                  <input
                    type="text"
                    name="venueName"
                    placeholder="Название"
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                  />
                </div>
                <div
                  className={`${login.inputSectoion} ${login.narrowInputSection}`}
                >
                  <p>Email</p>
                  <input
                    type="email"
                    name="venueEmail"
                    placeholder="Email"
                    value={venueEmail}
                    onChange={(e) => setVenueEmail(e.target.value)}
                  />
                </div>
                <div
                  className={`${login.inputSectoion} ${login.narrowInputSection}`}
                >
                  <p>Моб. телефон</p>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Моб. телефон"
                    value={venuePhone}
                    onChange={(e) => setVenuePhone(e.target.value)}
                  />
                </div>
                <div
                  className={`${login.inputSectoion} ${login.narrowInputSection}`}
                >
                  <p>Ссылка на сайт</p>
                  <input
                    type="url"
                    name="websiteLink"
                    placeholder="https://…"
                    value={websiteLink}
                    onChange={(e) => setWebsiteLink(e.target.value)}
                  />
                </div>
                <div
                  className={`${login.inputSectoion} ${login.narrowInputSection}`}
                >
                  <p>Описание общественного места</p>
                  <textarea
                    name="venueDescription"
                    placeholder="Описание общественного места"
                    value={venueDescription}
                    onChange={(e) => setVenueDescription(e.target.value)}
                  />
                </div>
                <div
                  className={`${login.inputSectoion} ${login.narrowInputSection}`}
                >
                  <p>Добавление документов</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className={style.hiddenFileInput}
                    multiple
                    accept="*/*"
                    onChange={handleFileChange}
                  />
                  {selectedFiles.length === 0 ? (
                    <button
                      type="button"
                      className={style.fileDropZoneEmpty}
                      onClick={handleClick}
                    >
                      <span className={style.dropLine}>
                        Добавьте <b>файлы</b> или <b>фото</b>,
                      </span>
                      <span className={style.dropLine}>
                        подтверждающие подлинность
                      </span>
                      <span className={style.dropLine}>заведения</span>
                    </button>
                  ) : (
                    <div className={style.fileDropZoneFilled}>
                      <div className={style.fileScrollRow}>
                        {selectedFiles.map((file, index) => (
                          <FileThumb
                            key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                            file={file}
                            onRemove={() => removeFile(index)}
                            onImagePreview={(f) => {
                              setLogoLightboxOpen(false);
                              setFileLightboxFile(f);
                            }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        className={style.fileAddMore}
                        onClick={handleClick}
                        aria-label="Добавить ещё файлы"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className={style.column}>
                <div className={login.inputSectoion}>
                  <p>Логотип</p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className={style.hiddenFileInput}
                    onChange={handleLogoFileChange}
                  />
                  {!venueLogoFile ? (
                    <button
                      type="button"
                      className={style.logo}
                      onClick={openLogoPicker}
                      aria-label="Добавить фото логотипа"
                    >
                      <p>+</p>
                    </button>
                  ) : (
                    <div className={style.logoFilled}>
                      {logoPreviewUrl ? (
                        <button
                          type="button"
                          className={style.logoPreviewOpen}
                          onClick={() => {
                            setFileLightboxFile(null);
                            setLogoLightboxOpen(true);
                          }}
                          aria-label="Открыть фото крупно"
                        >
                          <img
                            src={logoPreviewUrl}
                            alt=""
                            className={style.logoPreviewImg}
                            draggable={false}
                          />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={style.logoRemove}
                        onClick={(e) => {
                          e.stopPropagation();
                          clearVenueLogo();
                        }}
                        aria-label="Удалить фото логотипа"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
                <div className={login.inputSectoion}>
                  <p>Адреса</p>
                  <div className={style.addressListScroll}>
                    <div className={style.addressRows}>
                      {addresses.map((row, index) => {
                        const isLast = index === addresses.length - 1;
                        return (
                          <div key={row.id} className={style.addressRow}>
                            <input
                              type="text"
                              name={`address-${row.id}`}
                              placeholder="Адрес"
                              value={row.value}
                              onChange={(e) =>
                                setAddressValue(row.id, e.target.value)
                              }
                              className={style.addressInput}
                            />
                            <div className={style.addressRowBtns}>
                              {isLast && (
                                <button
                                  type="button"
                                  className={style.addressRowBtn}
                                  onClick={addAddressRow}
                                  disabled={!lastAddressFilled()}
                                  aria-label="Добавить строку адреса"
                                >
                                  +
                                </button>
                              )}
                              {addresses.length > 1 && (
                                <button
                                  type="button"
                                  className={style.addressRowBtn}
                                  onClick={() => removeAddressRow(row.id)}
                                  aria-label="Удалить строку адреса"
                                >
                                  −
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div
                  className={`${login.inputSectionButton} ${style.venueCreateSubmitWrap}`}
                >
                  <button type="submit">Создать</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PersonalProfileAuth;
