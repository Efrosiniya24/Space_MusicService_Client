import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/listener/login";
import SignUp from "./pages/auth/listener/signUp";
import Main from "./pages/mainListenerPage/mainListenerPage";
import Orgs from "./pages/venues/organizations";
import OrgPage from "./pages/OrgPage/orgPage";
import AddPreferencesPage from "./pages/OrgPage/AddPreferences/addPreferencesPage";
import AuthUserVenues from "./pages/auth/venue/creatingVenue/AllUserVenue";
import SignInVenue from "./pages/auth/venue/signIn";
import PersonalProfileAuth from "./pages/auth/venue/creatingVenue/createVenue/personalProfileAuth";
import AdminAuth from "./pages/auth/admin/adminAuth";
import VenuesAdmin from "./pages/admin/venues/VenuesAdmin";
import SingleVenueAdmin from "./pages/admin/singleVenue/SingleVenueAdmin";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/signIn" element={<Login />}></Route>
        <Route path="/signUp" element={<SignUp />}></Route>
        <Route path="/main" element={<Main />}></Route>
        <Route path="/venues" element={<Orgs />}></Route>
        <Route
          path="/orgPage/:venueId/addPreferences"
          element={<AddPreferencesPage />}
        ></Route>
        <Route path="/orgPage/:venueId" element={<OrgPage />}></Route>
        <Route path="/orgPage" element={<OrgPage />}></Route>
        <Route path="/venue/auth/venues" element={<AuthUserVenues />}></Route>
        <Route path="/venue/auth" element={<SignInVenue />}></Route>
        <Route
          path="/venue/auth/personalProfile"
          element={<PersonalProfileAuth />}
        ></Route>
        <Route path="/admin/auth" element={<AdminAuth />}></Route>
        <Route path="/admin/venues" element={<VenuesAdmin />}></Route>
        <Route
          path="/admin/venue/:venueId"
          element={<SingleVenueAdmin />}
        ></Route>
      </Routes>
    </Router>
  );
}

export default App;
