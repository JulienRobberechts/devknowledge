import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="w-[30%] border-r border-gray-200 overflow-y-auto">
        <Sidebar />
      </div>
      <main className="w-[70%] overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
