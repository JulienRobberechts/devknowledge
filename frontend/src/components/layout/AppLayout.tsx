import { Outlet, useMatch } from "react-router-dom";
import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import IconNav from "./IconNav";
import Sidebar from "./Sidebar";
import DocumentsSidebar from "../documents/DocumentsSidebar";

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

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

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
    <DocumentsSidebar />
  ) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <IconNav />
      {sidebarContent && (
        <>
          <div
            className="border-r border-gray-200 overflow-hidden bg-white shrink-0"
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
                isDragging ? "bg-blue-400" : "hover:bg-blue-400 bg-transparent"
              }`}
              onMouseDown={handleMouseDown}
            />
            <button
              onClick={() => setCollapsed((c) => !c)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="absolute top-5 -right-2.5 z-10 flex items-center justify-center w-5 h-5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 cursor-pointer"
            >
              {collapsed ? (
                <ChevronRight size={11} className="text-gray-500" />
              ) : (
                <ChevronLeft size={11} className="text-gray-500" />
              )}
            </button>
          </div>
        </>
      )}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
