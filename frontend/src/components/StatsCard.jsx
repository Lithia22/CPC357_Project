import React from "react";
import { Card, CardContent } from "../components/ui/card";

export function StatsCard({
  image, // New prop for image
  icon: Icon, // Keep icon for backward compatibility
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
        {/* Text content at top */}
        <div>
          {" "}
          {/* Removed mb-4 entirely */}
          <p className="text-sm font-medium text-gray-600">{label}</p>{" "}
          {/* Removed mb-2 */}
          <p className={`text-3xl font-bold ${valueStyles[variant]}`}>
            {value}
          </p>
          {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
        </div>

        {/* Image at bottom - directly below text */}
        <div className="flex justify-center">
          {" "}
          {/* Removed mt-4 entirely */}
          {image ? (
            <div className="relative">
              <img
                src={image}
                alt={label}
                className="h-40 w-auto object-contain max-w-full"
              />
              {/* Optional: Status indicator overlay */}
              {variant === "danger" && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              )}
            </div>
          ) : Icon ? (
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center ${
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
                className={`w-8 h-8 ${
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
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
