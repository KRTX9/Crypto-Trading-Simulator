import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";

// Validation schema
const verificationSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z
    .string()
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP must contain only numbers"),
});

export default function EmailVerificationPage() {
  const { verifyEmail, sendVerificationEmail, loading } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from navigation state
  const emailFromState = location.state?.email || "";
  const messageFromState = location.state?.message || "";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      email: emailFromState,
      otp: "",
    },
  });

  const watchedEmail = watch("email");

  const onSubmit = async (data) => {
    setError("");
    setSuccess("");

    try {
      await verifyEmail(data.email, data.otp);
      setSuccess("Email verified successfully! You can now sign in.");

      setTimeout(() => {
        navigate("/login", {
          state: {
            message: "Email verified successfully! You can now sign in.",
          },
        });
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to verify email. Please check your OTP and try again."
      );
    }
  };

  const handleResendOTP = async () => {
    if (!watchedEmail) {
      setError("Please enter your email address first");
      return;
    }

    setResendLoading(true);
    setError("");
    setSuccess("");

    try {
      await sendVerificationEmail(watchedEmail);
      setSuccess(
        "Verification OTP sent successfully! Please check your email."
      );
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to send verification email"
      );
    } finally {
      setResendLoading(false);
    }
  };

  // Auto-format OTP input
  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setValue("otp", value);
  };

  if (loading && !isSubmitting && !resendLoading) {
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
            Verify Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            We've sent a verification code to your email. Please enter it below
            to verify your account.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {messageFromState && !error && !success && (
            <div className="bg-blue-500 bg-opacity-10 border border-blue-500 text-blue-400 px-4 py-3 rounded">
              {messageFromState}
            </div>
          )}

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
                Verification Code
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
              <button
                type="submit"
                disabled={isSubmitting || resendLoading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Verifying...</span>
                  </div>
                ) : (
                  "Verify Email"
                )}
              </button>
            </div>

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendLoading || isSubmitting}
                className="w-full flex justify-center py-2 px-4 border border-gray-600 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendLoading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Sending...</span>
                  </div>
                ) : (
                  "Resend Verification Code"
                )}
              </button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
