import React, { useState } from "react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";

import main from "./mainListenerPage.module.css";
import Header from "../../Component/HeaderListener/headerListener";
import MusicCard1 from "../../reise reise.png";
import Playlist from "../../PlaylistWhite.png";
import Like from "../../like.png";
import NotLike from "../../NotLike.png";
import Full from "../../full.png";
import AudioPlayer from "../../Component/AudioPlayer/AudioPlayer";

const MainListenerPage = () => {
  const [liked, setLiked] = useState(false);
  const toggleLike = () => setLiked((v) => !v);

  return (
    <div className={main.main}>
      <Header />
      <div className={main.musicForm}>
        <div className={main.form}>
          <div className={main.line}>
            <button>Музыка</button>
            <button>Заведения</button>
            <button>Жанры</button>
          </div>
          <div className={main.musicInLine}>
            <div className={main.texInLine}>
              <h1>Альбомы, которые тебе могут понравиться</h1>
              <p>Все</p>
            </div>
            <div className={main.line}>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of album</a>
                  </h1>
                  <a>
                    <p>Actor</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of album</a>
                  </h1>
                  <a>
                    <p>Actor</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of album</a>
                  </h1>
                  <a>
                    <p>Actor</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of album</a>
                  </h1>
                  <a>
                    <p>Actor</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of album</a>
                  </h1>
                  <a>
                    <p>Actor</p>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className={main.musicInLine}>
            <div className={main.texInLine}>
              <h1>Рекомендуемые плейлисты</h1>
              <p>Все</p>
            </div>
            <div className={main.line}>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of playlist</a>
                  </h1>
                  <a>
                    <p>User</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of playlist</a>
                  </h1>
                  <a>
                    <p>User</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of playlist</a>
                  </h1>
                  <a>
                    <p>User</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of playlist</a>
                  </h1>
                  <a>
                    <p>User</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of playlist</a>
                  </h1>
                  <a>
                    <p>User</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className={main.musicInLine}>
            <div className={main.texInLine}>
              <h1>Исполнители</h1>
              <p>Все</p>
            </div>
            <div className={main.line}>
              <a>
                <div className={main.musician}>
                  <img src="" />
                  <h2>Musician</h2>
                </div>
              </a>
              <a>
                <div className={main.musician}>
                  <img src="" />
                  <h2>Musician</h2>
                </div>
              </a>
              <a>
                <div className={main.musician}>
                  <img src="" />
                  <h2>Musician</h2>
                </div>
              </a>
              <a>
                <div className={main.musician}>
                  <img src="" />
                  <h2>Musician</h2>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className={main.form}>
          <div className={main.musicInLine}>
            <div className={main.texInLine}>
              <h1>Твой топ в этом месяце</h1>
            </div>
            <div className={main.songInColumn}>
              <div className={main.songLineShort}>
                <div className={main.photoText}>
                  <img src="" />
                  <h5>Name of song</h5>
                </div>
                <a>
                  <p>Musician</p>
                </a>
                <div className={main.timeOfPlaying}>
                  <p>3.47</p>
                </div>
                <a>
                  <img src={Playlist} className={main.icon} />
                </a>
              </div>
              <div className={main.songLineShort}>
                <div className={main.photoText}>
                  <img src="" />
                  <h5>Name of song</h5>
                </div>
                <a>
                  <p>Musician</p>
                </a>
                <div className={main.timeOfPlaying}>
                  <p>3.47</p>
                </div>
                <a>
                  <img src={Playlist} className={main.icon} />
                </a>
              </div>
              <div className={main.songLineShort}>
                <div className={main.photoText}>
                  <img src="" />
                  <h5>Name of song</h5>
                </div>
                <a>
                  <p>Musician</p>
                </a>
                <div className={main.timeOfPlaying}>
                  <p>3.47</p>
                </div>
                <a>
                  <img src={Playlist} className={main.icon} />
                </a>
              </div>
              <div className={main.songLineShort}>
                <div className={main.photoText}>
                  <img src="" />
                  <h5>Name of song</h5>
                </div>
                <a>
                  <p>Musician</p>
                </a>
                <div className={main.timeOfPlaying}>
                  <p>3.47</p>
                </div>
                <a>
                  <img src={Playlist} className={main.icon} />
                </a>
              </div>
              <div className={main.songLineShort}>
                <div className={main.photoText}>
                  <img src="" />
                  <h5>Name of song</h5>
                </div>
                <a>
                  <p>Musician</p>
                </a>
                <div className={main.timeOfPlaying}>
                  <p>3.47</p>
                </div>
                <a>
                  <img src={Playlist} className={main.icon} />
                </a>
              </div>
            </div>
          </div>

          <div className={main.musicInLine}>
            <div className={main.texInLine}>
              <h1>Мои плейлисты</h1>
              <p>Все</p>
            </div>
            <div className={`${main.line} ${main.linePlaylistShort}`}>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of playlist</a>
                  </h1>
                  <a>
                    <p>User</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of playlist</a>
                  </h1>
                  <a>
                    <p>User</p>
                  </a>
                </div>
              </div>
              <div className={main.musicCard}>
                <img src="" alt="Photo" />
                <div className={main.text}>
                  <h1>
                    <a>Name of album</a>
                  </h1>
                  <a>
                    <p>Actor</p>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className={main.musicInLine}>
            <div className={main.texInLine}>
              <h1>Мои заведения</h1>
              <p>Все</p>
            </div>
            <div className={main.line}>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Musician</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Musician</h2>
                </div>
              </a>
              <a>
                <div className={`${main.musician} ${main.org}`}>
                  <img src="" />
                  <h2>Musician</h2>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className={main.playingLine}>
        <div className={main.photoText}>
          <img src="" />
          <div className={main.text}>
            <a>
              <h1>Name of song</h1>
            </a>
            <a>
              <p>Musician</p>
            </a>
          </div>
          <div className={main.iconInPhotoText}>
            <a onClick={toggleLike}>
              <img src={liked ? NotLike : Like} />
            </a>
          </div>
          <div className={main.iconInPhotoText}>
            <a>
              <img src={Playlist} />
            </a>
          </div>
        </div>
        <AudioPlayer className={main.player} src="" />
        <div className={main.iconInPhotoText}>
          <a>
            <img src={Full} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default MainListenerPage;
