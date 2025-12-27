import React from "react";
import { Card, CardContent } from "../components/ui/card";

export function StatsCard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = "default",
}) {
  const variantStyles = {
    default: "bg-white",
    safe: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
    danger: "bg-red-50 border-red-200",
  };

  const valueStyles = {
    default: "text-gray-900",
    safe: "text-green-700",
    warning: "text-amber-700",
    danger: "text-red-700",
  };

  return (
    <Card
      className={`${variantStyles[variant]} border-2 hover:shadow-lg transition-all`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              variant === "safe"
                ? "bg-green-100"
                : variant === "warning"
                ? "bg-amber-100"
                : variant === "danger"
                ? "bg-red-100"
                : "bg-primary-50"
            }`}
          >
            <Icon
              className={`w-6 h-6 ${
                variant === "safe"
                  ? "text-green-600"
                  : variant === "warning"
                  ? "text-amber-600"
                  : variant === "danger"
                  ? "text-red-600"
                  : "text-primary"
              }`}
            />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-600 mb-2">{label}</p>
        <p className={`text-3xl font-bold mb-1 ${valueStyles[variant]}`}>
          {value}
        </p>
        {subtext && <p className="text-sm text-gray-500">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
