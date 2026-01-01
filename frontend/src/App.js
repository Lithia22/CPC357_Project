import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "./components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import LiveCharts from "./pages/LiveCharts";
import AlertsHistory from "./pages/AlertsHistory";
import "./styles/App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="live-charts" element={<LiveCharts />} />
            <Route path="alerts" element={<AlertsHistory />} />
          </Route>

          {/* Redirect any unknown route to login */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Main layout for authenticated users
function MainLayout() {
  const { logout, user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50">
        <AppSidebar onLogout={logout} user={user} />
        <SidebarInset className="flex-1">
          {/* Mobile header with sidebar toggle */}
          <div className="sticky top-0 z-10 flex items-center bg-white border-b px-4 py-3 md:hidden">
            <SidebarTrigger className="mr-4" />
            <div className="text-lg font-semibold">
              {user ? `Welcome, ${user.name}` : "Gas Detection System"}
            </div>
          </div>
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default App;
