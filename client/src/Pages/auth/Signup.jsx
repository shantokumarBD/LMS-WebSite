import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema } from "@/schemas/signupSchema";
import { useMutation } from "@tanstack/react-query";
import { registerUser } from "@/services/authApi";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "@/store/slices/authSlice";
import toast from "react-hot-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // React Hook Form setup with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "student",
    },
  });

  // TanStack Query mutation for signup
  const signupMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => {
      // Always show success message
      if (data.success) {
        toast.success("Account created successfully! Redirecting to login...");
        reset();
        setTimeout(
          () => navigate("/login", { state: { from: location.state?.from } }),
          1500,
        );
      }
    },
    onError: (error) => {
      // Use backend error message if available
      const backendMessage = error.response?.data?.message;
      if (backendMessage) {
        toast.error(backendMessage);
        return;
      }

      const errorMessage = (error.message || "").toLowerCase();
      if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")
      ) {
        toast.error(
          "Network error. Please check your connection and try again.",
        );
      } else {
        toast.error(error.message || "Signup failed. Please try again.");
      }
    },
  });

  // Form submit handler
  const onSubmit = (data) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-900 via-purple-950 to-slate-900 px-4 py-12">
      <div className="max-w-md w-full mt-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-4xl p-10 shadow-2xl text-center space-y-8">
          <div>
            <h1 className="text-3xl font-black text-white mb-2">Create Account</h1>
            <p className="text-gray-400 text-sm">Join our community of learners today</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
            {/* Name Field */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-bold block ml-1">
                Full Name
              </Label>
              <Input
                type="text"
                placeholder="John Doe"
                {...register("name")}
                className="bg-white/5 border-white/10 rounded-xl px-4 py-6 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 transition-all"
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1 ml-1 font-medium">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-bold block ml-1">
                Email Address
              </Label>
              <Input
                type="email"
                placeholder="name@example.com"
                {...register("email")}
                className="bg-white/5 border-white/10 rounded-xl px-4 py-6 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 transition-all"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 ml-1 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label className="text-gray-300 text-sm font-bold block ml-1">
                Password
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password")}
                  className="bg-white/5 border-white/10 rounded-xl px-4 py-6 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 ml-1 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Role Field */}
            <div className="space-y-3">
              <Label className="text-gray-300 text-sm font-bold block ml-1">Join as</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-4 p-1"
                  >
                    <div className="flex items-center gap-2 cursor-pointer group">
                      <RadioGroupItem
                        value="student"
                        id="student"
                        className="border-white/20 text-purple-500 focus:ring-purple-500"
                      />
                      <Label htmlFor="student" className="text-gray-400 group-hover:text-white transition-colors cursor-pointer">
                        Student
                      </Label>
                    </div>
                    <div className="flex items-center gap-2 cursor-pointer group">
                      <RadioGroupItem
                        value="teacher"
                        id="teacher"
                        className="border-white/20 text-purple-500 focus:ring-purple-500"
                      />
                      <Label htmlFor="teacher" className="text-gray-400 group-hover:text-white transition-colors cursor-pointer">
                        Teacher
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              />
            </div>

            {/* Submit Button */}
            <Button
              className="w-full rounded-2xl py-6 bg-purple-600 hover:bg-purple-700 font-bold text-white transition-all transform active:scale-[0.98] shadow-lg shadow-purple-900/20"
              type="submit"
              disabled={signupMutation.isPending}
            >
              {signupMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating account...
                </span>
              ) : (
                "Sign Up"
              )}
            </Button>

            <p className="text-center text-gray-400 text-sm mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-purple-400 hover:text-purple-300 font-bold transition-colors">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
