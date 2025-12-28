import React, { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  LogOut,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import mqttService from "../services/mqttService";
import gasImage from "../assets/images/gas.png";

export function AppSidebar({ onLogout, user }) {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }, 1000);

    // Check MQTT connection status every 2 seconds
    const checkConnection = setInterval(() => {
      setIsOnline(mqttService.isConnected());
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(checkConnection);
    };
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: BarChart3, label: "Live Charts", path: "/live-charts" },
    { icon: Bell, label: "Alerts History", path: "/alerts" },
  ];

  return (
    <Sidebar className="border-r">
      <SidebarHeader>
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex justify-center">
              <div className="flex justify-center">
                <img
                  src={gasImage}
                  alt="LPG Gas Tank"
                  className="h-16 w-16 object-contain"
                />
              </div>
            </div>
            <div>
              <h2 className="font-bold text-lg">Main Kitchen</h2>
              <p className="text-sm text-muted-foreground">Monitoring System</p>
            </div>
          </div>

          {/* Time and Status Section */}
          <div className="space-y-3">
            {/* Time Display */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Current Time</p>
                <p className="font-semibold">{currentTime}</p>
              </div>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-500" />
              )}
              <div>
                <p className="text-xs text-muted-foreground">System Status</p>
                <p
                  className={`font-semibold ${
                    isOnline ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {isOnline ? "Online" : "Connecting..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.path)}
                    isActive={window.location.pathname === item.path}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
