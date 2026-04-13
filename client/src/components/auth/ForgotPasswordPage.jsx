import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import btcBackground from "../../assets/btcwp.jpg";

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export default function ForgotPasswordPage() {
  const { resetPassword, loading } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    setError("");
    setSuccess("");

    try {
      const response = await resetPassword(data.email);
      console.log("Password reset response:", response);
      setSuccess(
        "Password reset OTP has been sent to your email. Check your inbox and spam folder."
      );

      setTimeout(() => {
        navigate("/reset-password", {
          state: { email: data.email },
        });
      }, 3000);
    } catch (err) {
      console.error("Password reset error:", err);
      setError(err.response?.data?.error || "Failed to reset password");
    }
  };

  if (loading && !isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" text="Loading...\" />
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
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40"></div>

      {/* Content */}
      <div className="relative z-10 max-w-md w-full space-y-8 px-4">
        <div className="text-center">
          <div className="mb-6">
            <div className="text-6xl mb-4 neon-text animate-neon-pulse">🔐</div>
            <h2 className="text-3xl font-bold neon-text terminal-text">
              KRTX9 ACCESS RECOVERY
            </h2>
          </div>
          <p className="text-sm neon-text-cyan terminal-text">
            RESET YOUR TERMINAL CREDENTIALS
          </p>
        </div>

        <div className="cyber-panel p-6 space-y-6 backdrop-blur-sm bg-opacity-90">
          {error && (
            <div className="bg-neon-pink bg-opacity-10 border border-neon-pink text-neon-pink px-4 py-3 rounded terminal-text">
              ⚠ {error}
            </div>
          )}

          {success && (
            <div className="bg-neon-green bg-opacity-10 border border-neon-green text-neon-green px-4 py-3 rounded terminal-text">
              ✓ {success}
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
              <button
                type="submit"
                disabled={isSubmitting}
                className="cyber-button group relative w-full flex justify-center py-3 px-4 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed terminal-text uppercase tracking-wider"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">SENDING RESET CODE...</span>
                  </div>
                ) : (
                  "🔐 SEND RESET CODE 🔐"
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                to="/login"
                className="neon-text-cyan hover:neon-text terminal-text text-xs uppercase tracking-wide"
              >
                → Back to Terminal
              </Link>
            </div>
          </form>

          <div className="text-center text-xs text-gray-500">
            <p>Recovery codes are sent via secure email.</p>
            <p>Check your inbox and spam folder.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
