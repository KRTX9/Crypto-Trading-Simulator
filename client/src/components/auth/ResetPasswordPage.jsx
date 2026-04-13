import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import btcBackground from "../../assets/btcwp.jpg";

// Validation schema
const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
  new_password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

export default function ResetPasswordPage() {
  const { verifyOTP, loading } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from navigation state
  const emailFromState = location.state?.email || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailFromState,
      otp: "",
      new_password: "",
    },
  });

  const onSubmit = async (data) => {
    setError("");
    setSuccess("");

    try {
      await verifyOTP(data);
      setSuccess("Password has been reset successfully");

      setTimeout(() => {
        navigate("/login", {
          state: {
            message:
              "Password reset successfully! You can now sign in with your new password.",
          },
        });
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to reset password. Please check your OTP and try again."
      );
    }
  };

  // Auto-format OTP input
  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setValue("otp", value);
  };

  if (loading && !isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter the OTP sent to your email and your new password
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500 bg-opacity-10 border border-green-500 text-green-400 px-4 py-3 rounded">
              {success}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                Email Address
              </label>
              <input
                {...register("email")}
                type="email"
                autoComplete="email"
                disabled={!!emailFromState}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-500 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-300"
              >
                Reset Code
              </label>
              <input
                {...register("otp")}
                type="text"
                autoComplete="off"
                autoFocus
                maxLength={6}
                onChange={handleOTPChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-500 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
              />
              {errors.otp && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.otp.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            <div>
              <label
                htmlFor="new_password"
                className="block text-sm font-medium text-gray-300"
              >
                New Password
              </label>
              <input
                {...register("new_password")}
                type="password"
                autoComplete="new-password"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-600 placeholder-gray-500 text-white bg-gray-800 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your new password"
              />
              {errors.new_password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.new_password.message}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Resetting Password...</span>
                  </div>
                ) : (
                  "Reset Password"
                )}
              </button>
            </div>

            <div className="text-center space-y-2">
              <Link
                to="/forgot-password"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                Didn't receive OTP? Request again
              </Link>
              <br />
              <Link
                to="/login"
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
