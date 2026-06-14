import { Outlet, useMatch, useLocation } from "react-router-dom";
import { useState, useCallback, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import IconNav from "./IconNav";
import Sidebar from "./Sidebar";
import DocumentsSidebar from "../documents/DocumentsSidebar";
import SettingsPage from "../pages/SettingsPage";

const MIN_WIDTH = 200;
const DEFAULT_WIDTH = 288;
const ICON_NAV_WIDTH = 56;

export default function AppLayout() {
  const matchConversations = useMatch("/conversations");
  const matchConversationId = useMatch("/conversations/:id");
  const onConversations = matchConversations ?? matchConversationId;

  const matchDocuments = useMatch("/documents");
  const matchDocumentId = useMatch("/documents/:id");
  const onDocuments = matchDocuments ?? matchDocumentId;

  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (matchDocumentId) setShowSettings(false);
  }, [matchDocumentId?.params.id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    setIsDragging(true);

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const newWidth = e.clientX - ICON_NAV_WIDTH;
      if (newWidth >= MIN_WIDTH) {
        setSidebarWidth(newWidth);
        setCollapsed(false);
      } else if (newWidth < MIN_WIDTH / 2) {
        setCollapsed(true);
      }
    };

    const onMouseUp = () => {
      dragging.current = false;
      setIsDragging(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const sidebarContent = onConversations ? (
    <Sidebar />
  ) : onDocuments ? (
    <DocumentsSidebar
      showSettings={showSettings}
      onToggleSettings={() => setShowSettings((v) => !v)}
    />
  ) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <IconNav />
      {sidebarContent && (
        <>
          <div
            className="border-r border-slate-200 overflow-hidden bg-white shrink-0"
            style={{
              width: collapsed ? 0 : sidebarWidth,
              transition: isDragging ? "none" : "width 0.2s ease",
            }}
          >
            <div
              style={{ width: sidebarWidth, minWidth: MIN_WIDTH }}
              className="h-full overflow-y-auto"
            >
              {sidebarContent}
            </div>
          </div>
          <div className="relative shrink-0 w-2 flex items-start">
            <div
              className={`absolute inset-y-0 left-0 w-1 cursor-col-resize transition-colors ${
                isDragging
                  ? "bg-amber-400"
                  : "hover:bg-amber-400 bg-transparent"
              }`}
              onMouseDown={handleMouseDown}
            />
            <button
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="absolute top-5 -right-2.5 z-10 flex items-center justify-center w-5 h-5 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 cursor-pointer"
            >
              {collapsed ? (
                <ChevronRight size={11} className="text-slate-400" />
              ) : (
                <ChevronLeft size={11} className="text-slate-400" />
              )}
            </button>
          </div>
        </>
      )}
      <main ref={mainRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        {onDocuments && showSettings ? (
          <SettingsPage onClose={() => setShowSettings(false)} />
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
