import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import btcBackground from "../../assets/btcwp.jpg";

// Validation schema
const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    password2: z.string(),
    phone_number: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.password2, {
    message: "Passwords don't match",
    path: ["password2"],
  });

export default function RegisterPage() {
  const { register: registerUser, loading } = useAuth();
  const [error, setError] = useState("");
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    setError("");
    setIsAlreadyRegistered(false);

    try {
      // Convert empty phone_number to undefined
      const userData = { ...data };
      if (userData.phone_number === "") {
        delete userData.phone_number;
      }

      await registerUser(userData);

      // Redirect to email verification with the email
      navigate("/verify-email", {
        state: {
          email: userData.email,
          message:
            "Registration successful! Please check your email for verification code.",
        },
      });
    } catch (err) {
      const errorData = err.response?.data;

      // Handle specific error cases
      if (errorData?.email) {
        if (
          errorData.email[0]?.includes("already exists") ||
          errorData.email[0]?.includes("unique") ||
          errorData.email[0]?.includes(
            "user with this email address already exists"
          )
        ) {
          setError("This email is already registered.");
          setIsAlreadyRegistered(true);
        } else {
          setError(errorData.email[0] || "Email validation error");
        }
      } else if (errorData?.username) {
        if (
          errorData.username[0]?.includes("already exists") ||
          errorData.username[0]?.includes("unique") ||
          errorData.username[0]?.includes(
            "user with this username already exists"
          )
        ) {
          setError(
            "This username is already taken. Please choose a different username."
          );
        } else {
          setError(errorData.username[0] || "Username validation error");
        }
      } else if (errorData?.non_field_errors) {
        setError(errorData.non_field_errors[0] || "Registration failed");
      } else {
        setError(
          errorData?.error ||
            errorData?.detail ||
            "Failed to register. Please try again."
        );
      }
    }
  };

  if (loading && !isSubmitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" text="Initializing..." />
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
            <div className="text-6xl mb-4 neon-text animate-neon-pulse">🚀</div>
            <h2 className="text-3xl font-bold neon-text terminal-text">
              KRTX9 REGISTRATION
            </h2>
          </div>
          <p className="text-sm neon-text-cyan terminal-text">
            INITIALIZE NEW TRADING ACCOUNT
          </p>
        </div>

        <div className="cyber-panel p-6 space-y-6 backdrop-blur-sm bg-opacity-90">
          {error && (
            <div className="bg-neon-pink bg-opacity-10 border border-neon-pink text-neon-pink px-4 py-3 rounded terminal-text">
              ⚠ {error}
              {isAlreadyRegistered && (
                <div className="mt-2">
                  <Link
                    to="/login"
                    className="neon-text-cyan hover:neon-text underline text-sm uppercase tracking-wide"
                  >
                    → SIGN IN INSTEAD
                  </Link>
                </div>
              )}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium neon-text-cyan terminal-text uppercase tracking-wide"
              >
                Username
              </label>
              <input
                {...register("username")}
                type="text"
                autoComplete="username"
                autoFocus
                className="cyber-input mt-1 appearance-none relative block w-full px-3 py-2 rounded-md sm:text-sm"
                placeholder="Enter your username"
              />
              {errors.username && (
                <p className="mt-1 text-sm neon-text-pink terminal-text">
                  ⚠ {errors.username.message}
                </p>
              )}
            </div>

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
                autoComplete="new-password"
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
              <label
                htmlFor="password2"
                className="block text-sm font-medium neon-text-cyan terminal-text uppercase tracking-wide"
              >
                Confirm Password
              </label>
              <input
                {...register("password2")}
                type="password"
                autoComplete="new-password"
                className="cyber-input mt-1 appearance-none relative block w-full px-3 py-2 rounded-md sm:text-sm"
                placeholder="Confirm your password"
              />
              {errors.password2 && (
                <p className="mt-1 text-sm neon-text-pink terminal-text">
                  ⚠ {errors.password2.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="phone_number"
                className="block text-sm font-medium neon-text-cyan terminal-text uppercase tracking-wide"
              >
                Phone Number (Optional)
              </label>
              <input
                {...register("phone_number")}
                type="tel"
                autoComplete="tel"
                className="cyber-input mt-1 appearance-none relative block w-full px-3 py-2 rounded-md sm:text-sm"
                placeholder="+1234567890"
              />
              {errors.phone_number && (
                <p className="mt-1 text-sm neon-text-pink terminal-text">
                  ⚠ {errors.phone_number.message}
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
                    <span className="ml-2">INITIALIZING ACCOUNT...</span>
                  </div>
                ) : (
                  "🚀 CREATE ACCOUNT 🚀"
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link
                to="/login"
                className="neon-text-cyan hover:neon-text terminal-text text-xs uppercase tracking-wide"
              >
                → Sign In Instead
              </Link>
              <Link
                to="/verify-email"
                className="neon-text-cyan hover:neon-text terminal-text text-xs uppercase tracking-wide"
              >
                → Verify Email
              </Link>
            </div>

            <div className="text-center text-xs text-gray-500">
              <p>Virtual trading simulation platform.</p>
              <p>No real funds or cryptocurrency involved.</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
