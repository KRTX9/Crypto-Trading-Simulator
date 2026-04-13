import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import btcBackground from "../../assets/btcwp.jpg";

// Validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login, googleLogin, loading } = useAuth();
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get message from navigation state
  const messageFromState = location.state?.message || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setError("");

    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err) {
      const errorData = err.response?.data;

      if (errorData?.requires_verification) {
        // User needs to verify email first
        setError(errorData.message || "Email verification required");
        setTimeout(() => {
          navigate("/verify-email", {
            state: {
              email: data.email,
              message: "Please verify your email before signing in",
            },
          });
        }, 2000);
      } else {
        setError(errorData?.error || "Invalid credentials");
      }
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setGoogleLoading(true);
    setError("");

    try {
      await googleLogin(credentialResponse.credential);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Google login failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  if (loading && !isSubmitting && !googleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" text="Signing you in..." />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        backgroundImage: `url(${btcBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full space-y-8 px-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4 neon-text animate-neon-pulse">⚡</div>
            <h2 className="text-3xl font-bold neon-text terminal-text">
              KRTX9 TRADING PlATFORM
            </h2>
          </div>
          <p className="text-sm neon-text-cyan terminal-text">
            VIRTUAL TRADING ENVIRONMENT - ENTER CREDENTIALS
          </p>
        </div>

        <div className="cyber-panel p-6 space-y-6 backdrop-blur-sm bg-opacity-90">
          {messageFromState && !error && (
            <div className="bg-neon-green bg-opacity-10 border border-neon-green text-neon-green px-4 py-3 rounded terminal-text">
              ✓ {messageFromState}
            </div>
          )}

          {error && (
            <div className="bg-neon-pink bg-opacity-10 border border-neon-pink text-neon-pink px-4 py-3 rounded terminal-text">
              ⚠ {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium neon-text-cyan terminal-text uppercase tracking-wide"
              >
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                autoFocus
                className="cyber-input mt-1 appearance-none relative block w-full px-3 py-2 rounded-md sm:text-sm"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm neon-text-pink terminal-text">
                  ⚠ {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium neon-text-cyan terminal-text uppercase tracking-wide"
              >
                Password
              </label>
              <input
                {...register("password")}
                type="password"
                autoComplete="current-password"
                className="cyber-input mt-1 appearance-none relative block w-full px-3 py-2 rounded-md sm:text-sm"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm neon-text-pink terminal-text">
                  ⚠ {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="cyber-button group relative w-full flex justify-center py-3 px-4 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed terminal-text uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">ACCESSING TERMINAL...</span>
                  </div>
                ) : (
                  "⚡ ENTER TERMINAL ⚡"
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                to="/register"
                className="neon-text-cyan hover:neon-text terminal-text text-xs uppercase tracking-wide"
              >
                → Create Account
              </Link>
              <Link
                to="/forgot-password"
                className="neon-text-cyan hover:neon-text terminal-text text-xs uppercase tracking-wide"
              >
                → Reset Access
              </Link>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Or</span>
            </div>
          </div>

          <div className="flex justify-center">
            {googleLoading ? (
              <div className="flex items-center gap-2 p-3 text-gray-400">
                <LoadingSpinner size="sm" />
                <span>Signing in with Google...</span>
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                  setError("Google login failed. Please try again.");
                }}
                theme="outline"
                size="large"
                text="signin_with"
                useOneTap={false}
                auto_select={false}
              />
            )}
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>This is a simulation environment.</p>
            <p>No real money or cryptocurrency is involved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
