import { Outlet } from "react-router-dom";
import TechnicalNav from "./TechnicalNav";

export default function TechnicalLayout() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 px-8 py-3">
        <TechnicalNav />
      </div>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
