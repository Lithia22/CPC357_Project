import React, { useState, useEffect } from "react";
import {
  getRecentAlerts,
  subscribeToAlerts,
} from "../services/supabaseService";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Bell, AlertTriangle, Info, ShieldAlert, Calendar } from "lucide-react";

function AlertsHistory() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const data = await getRecentAlerts();
        setAlerts(data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading alerts:", err);
        setLoading(false);
      }
    };

    loadAlerts();

    const channel = subscribeToAlerts((newAlert) => {
      setAlerts((prev) => [newAlert, ...prev]);
    });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "all") return true;
    return alert.alert_type === filter;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case "danger":
        return <ShieldAlert className="w-5 h-5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const filterButtons = [
    { label: "All Alerts", value: "all", count: alerts.length },
    {
      label: "Danger",
      value: "danger",
      count: alerts.filter((a) => a.alert_type === "danger").length,
    },
    {
      label: "Warning",
      value: "warning",
      count: alerts.filter((a) => a.alert_type === "warning").length,
    },
    {
      label: "Info",
      value: "info",
      count: alerts.filter((a) => a.alert_type === "info").length,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Alerts History
        </h1>
        <p className="text-gray-600">System events and notifications</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <Bell className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{alerts.length}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-red-700">Danger Alerts</p>
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-700">
              {alerts.filter((a) => a.alert_type === "danger").length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-amber-700">
                Warning Alerts
              </p>
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-3xl font-bold text-amber-700">
              {alerts.filter((a) => a.alert_type === "warning").length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Last Updated</p>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {alerts.length > 0 ? formatDate(alerts[0].timestamp) : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-3">
        {filterButtons.map((btn) => (
          <Button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            variant={filter === btn.value ? "default" : "outline"}
            className={
              filter === btn.value ? "bg-primary hover:bg-primary-600" : ""
            }
          >
            {btn.label} ({btn.count})
          </Button>
        ))}
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Alert Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Loading alerts...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No alerts found</p>
              <p className="text-sm">System running smoothly</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Time
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Type
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Gas Level
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Temperature
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr
                      key={alert.id}
                      className={`border-b hover:bg-gray-50 ${
                        alert.alert_type === "danger"
                          ? "bg-red-50/30"
                          : alert.alert_type === "warning"
                          ? "bg-amber-50/30"
                          : "bg-blue-50/30"
                      }`}
                    >
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatTime(alert.timestamp)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(alert.timestamp)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge
                          className={`flex items-center gap-1 w-fit ${
                            alert.alert_type === "danger"
                              ? "bg-red-500"
                              : alert.alert_type === "warning"
                              ? "bg-amber-500"
                              : "bg-blue-500"
                          }`}
                        >
                          {getTypeIcon(alert.alert_type)}
                          <span className="uppercase text-xs">
                            {alert.alert_type}
                          </span>
                        </Badge>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {alert.gas_level} PPM
                          </span>
                          {alert.gas_level > 3000 && (
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          )}
                          {alert.gas_level > 1000 &&
                            alert.gas_level <= 3000 && (
                              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-700">
                        {alert.temperature ? `${alert.temperature}°C` : "N/A"}
                      </td>
                      <td className="py-4 px-4 text-gray-700 max-w-md">
                        {alert.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AlertsHistory;
