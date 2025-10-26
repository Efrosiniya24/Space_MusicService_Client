import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/auth/listener/login";
import SignUp from "./pages/auth/listener/signUp";
import Main from "./pages/mainListenerPage/mainListenerPage";
import Orgs from "./pages/organizations/organizations";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />}></Route>
        <Route path="/signUp" element={<SignUp />}></Route>
        <Route path="/main" element={<Main />}></Route>
        <Route path="/orgs" element={<Orgs />}></Route>
      </Routes>
    </Router>
  );
}

export default App;
