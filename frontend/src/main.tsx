import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      {/*
      console.log("GOOGLE:", import.meta.env.VITE_GOOGLE_CLIENT_ID);
      console.log("API:", import.meta.env.VITE_API_URL);
      */}
    </BrowserRouter>
  </React.StrictMode>
);
