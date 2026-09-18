import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Toast from "../components/Toast.jsx";
import { useApp } from "../context/AppContext.jsx";

/** SaaS shell: persistent left sidebar + routed content area. */
export default function AppLayout() {
  const { toast, setToast } = useApp();
  return (
    <div className="flex h-screen overflow-hidden bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
          <Outlet />
          <footer className="mt-10 text-center text-xs font-medium text-neutral-400">
            made by eshwar · made with <span className="text-red-500">❤️</span>
          </footer>
        </div>
      </main>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
