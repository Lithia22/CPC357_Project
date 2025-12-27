import React from "react";
import { Button } from "../components/ui/button";
import { Shield, Flame, Bell, Activity } from "lucide-react";

function LandingPage({ onEnter }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-2xl mb-6 shadow-lg">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            SafeGuard LPG
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Smart Gas Leak Detection & Safety Monitoring System
          </p>
        </header>

        {/* Hero Section */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="bg-gradient-to-r from-primary-50 to-orange-100 rounded-3xl p-12 shadow-xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-6">
                  Protect Your Kitchen with Real-Time Monitoring
                </h2>
                <p className="text-lg text-gray-700 mb-8">
                  Advanced IoT system that detects gas leaks instantly and takes
                  automatic safety actions to protect your home and family.
                </p>
                <Button
                  onClick={onEnter}
                  className="bg-primary hover:bg-primary-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg"
                >
                  Enter Dashboard
                </Button>
              </div>
              <div className="relative">
                <div className="bg-white rounded-2xl p-8 shadow-xl">
                  <svg viewBox="0 0 200 200" className="w-full h-auto">
                    {/* Simple kitchen illustration */}
                    <circle
                      cx="100"
                      cy="80"
                      r="35"
                      fill="#F86901"
                      opacity="0.1"
                    />
                    <circle
                      cx="100"
                      cy="80"
                      r="25"
                      fill="#F86901"
                      opacity="0.2"
                    />
                    <circle cx="100" cy="80" r="15" fill="#F86901" />
                    <path
                      d="M85 110 L115 110 L115 140 L85 140 Z"
                      fill="#FFE5D1"
                      stroke="#F86901"
                      strokeWidth="2"
                    />
                    <circle cx="92" cy="120" r="3" fill="#F86901" />
                    <circle cx="108" cy="120" r="3" fill="#F86901" />
                    <path
                      d="M95 130 Q100 135 105 130"
                      stroke="#F86901"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-6xl mx-auto mb-20">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Key Features
          </h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <Flame className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">
                Real-Time Detection
              </h4>
              <p className="text-gray-600 text-sm">
                Instant gas leak detection with MQ-2 sensor technology
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">
                Auto Safety Actions
              </h4>
              <p className="text-gray-600 text-sm">
                Automatic valve shutdown and ventilation control
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Alert System</h4>
              <p className="text-gray-600 text-sm">
                Visual and audio alerts with real-time notifications
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h4 className="font-semibold text-lg mb-2">Smart Modes</h4>
              <p className="text-gray-600 text-sm">
                Cooking and non-cooking modes for optimal safety
              </p>
            </div>
          </div>
        </div>

        {/* Safety Info */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              How It Works
            </h3>
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Continuous Monitoring</h4>
                  <p className="text-sm">
                    The system monitors gas levels and temperature 24/7 using
                    advanced sensors
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Instant Detection</h4>
                  <p className="text-sm">
                    When gas levels exceed safe thresholds, the system
                    immediately detects the danger
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Automatic Response</h4>
                  <p className="text-sm">
                    Gas valve closes, exhaust fan activates, and alarm sounds to
                    ensure safety
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Dashboard Monitoring</h4>
                  <p className="text-sm">
                    View real-time data, alerts, and system status from anywhere
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-20 text-gray-600">
          <p className="text-sm">
            SafeGuard LPG - Your 24/7 Kitchen Safety Partner
          </p>
          <p className="text-xs mt-2">
            Automatic safety system is always active • Web monitoring for peace
            of mind
          </p>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
