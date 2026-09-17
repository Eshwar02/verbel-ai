import { Routes, Route } from "react-router-dom";
import AppLayout from "./layout/AppLayout.jsx";
import Studio from "./pages/Studio.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import Voices from "./pages/Voices.jsx";
import Account from "./pages/Account.jsx";
import Settings from "./pages/Settings.jsx";

/** Route table for the SaaS shell. All pages render inside <AppLayout>. */
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Studio />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="voices" element={<Voices />} />
        <Route path="account" element={<Account />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Studio />} />
      </Route>
    </Routes>
  );
}
