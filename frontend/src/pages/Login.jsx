import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { AlertCircle, LogIn } from "lucide-react";
import chefImage from "../assets/images/chef.png";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  // Demo credentials for quick testing
  const fillDemoCredentials = (role) => {
    switch (role) {
      case "admin":
        setEmail("admin@kitchen.com");
        setPassword("admin123");
        break;
      case "chef":
        setEmail("chef@restaurant.com");
        setPassword("chef123");
        break;
      case "manager":
        setEmail("manager@restaurant.com");
        setPassword("manager123");
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center p-4">
      {" "}
      <Card className="w-full max-w-md shadow-xl bg-white">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-3">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full border-4 border-orange-400 bg-white p-2 flex items-center justify-center">
                <img
                  src={chefImage}
                  alt="Chef"
                  className="h-10 w-10 object-contain"
                />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Kitchen Monitoring System
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access the gas detection dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600 mb-2">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-primary font-medium hover:underline"
              >
                Sign up
              </Link>
            </div>

            <div className="text-sm">
              <span className="text-gray-500">
                Or try our demo account here{" "}
              </span>
              <button
                type="button"
                className="text-primary font-medium hover:underline"
                onClick={() => {
                  setEmail("chef@kitchen.com");
                  setPassword("chef123");
                }}
              >
                chef
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Login;
