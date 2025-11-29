import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/listener/login";
import SignUp from "./pages/auth/listener/signUp";
import Main from "./pages/mainListenerPage/mainListenerPage";
import Orgs from "./pages/venues/organizations";
import OrgPage from "./pages/OrgPage/orgPage";
import AuthUserVenues from "./pages/creatingVenue/AllUserVenue";
import SignInVenue from "./pages/auth/venue/signIn";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signIn" element={<Login />}></Route>
        <Route path="/signUp" element={<SignUp />}></Route>
        <Route path="/main" element={<Main />}></Route>
        <Route path="/orgs" element={<Orgs />}></Route>
        <Route path="/orgPage" element={<OrgPage />}></Route>
        <Route path="/venue/auth/venues" element={<AuthUserVenues />}></Route>
        <Route path="/venue/auth" element={<SignInVenue />}></Route>
      </Routes>
    </Router>
  );
}

export default App;
