import { useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResizableSidebarProps {
  children: ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
  collapsible?: boolean;
  position?: "left" | "right";
}

export function ResizableSidebar({
  children,
  defaultWidth = 320,
  minWidth = 280,
  maxWidth = 600,
  className,
  collapsible = true,
  position = "left"
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  const actualWidth = isCollapsed ? 0 : width;

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return;

      const rect = sidebarRef.current.getBoundingClientRect();
      let newWidth;
      
      if (position === "left") {
        newWidth = e.clientX - rect.left;
      } else {
        newWidth = rect.right - e.clientX;
      }

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    },
    [isResizing, minWidth, maxWidth, position]
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResizing);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResizing);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isResizing, resize, stopResizing]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div 
      ref={sidebarRef}
      className={cn(
        "relative bg-card border-border flex-shrink-0 transition-all duration-300 ease-in-out",
        position === "left" ? "border-r" : "border-l",
        isCollapsed && "shadow-none",
        className
      )}
      style={{ 
        width: actualWidth,
        minWidth: isCollapsed ? 0 : minWidth,
        maxWidth: isCollapsed ? 0 : maxWidth
      }}
    >
      {/* Sidebar Content */}
      <div 
        className={cn(
          "h-full overflow-hidden transition-opacity duration-300",
          isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{ width: width }}
      >
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>

      {/* Resizer Handle */}
      {!isCollapsed && (
        <div
          ref={resizerRef}
          className={cn(
            "absolute top-0 w-1 h-full cursor-col-resize group hover:w-2 transition-all",
            "bg-transparent hover:bg-border/50",
            position === "left" ? "right-0" : "left-0"
          )}
          onMouseDown={startResizing}
        >
          <div className={cn(
            "absolute top-1/2 transform -translate-y-1/2 w-4 h-8 flex items-center justify-center",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "bg-background border border-border rounded-md shadow-sm",
            position === "left" ? "-right-2" : "-left-2"
          )}>
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Collapse/Expand Toggle */}
      {collapsible && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "absolute top-4 w-6 h-6 p-0 rounded-full bg-background border border-border shadow-sm",
            "hover:bg-accent z-10 transition-all",
            position === "left" 
              ? (isCollapsed ? "-right-3" : "right-2") 
              : (isCollapsed ? "-left-3" : "left-2")
          )}
          onClick={toggleCollapse}
        >
          {isCollapsed ? (
            position === "left" ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />
          ) : (
            position === "left" ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />
          )}
        </Button>
      )}
    </div>
  );
}