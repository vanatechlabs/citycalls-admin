'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import Swal from 'sweetalert2';
import { loginSchema, LoginFormValues } from '@/lib/validation/auth';
import { useLogin } from '@/lib/hooks/useAuth';
import {
  Eye,
  EyeOff,
  LogIn,
  Lock,
  User,
  Home,
  Wrench,
  Ruler,
  Shield,
  Loader2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  // SweetAlert2 Toast — top-end, dark, auto-dismissing, same look as the
  // Bharat admin login page.
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    background: '#1e2433',
    color: '#e2e8f0',
  });

  const showToast = (icon: 'success' | 'error' | 'info' | 'warning', title: string) => {
    Toast.fire({
      icon,
      title,
      iconColor: icon === 'success' ? '#4ade80' : icon === 'error' ? '#f87171' : '#60a5fa',
    });
  };

  const onSubmit = (values: LoginFormValues) => {
    if (!values.identifier || !values.password) {
      showToast('warning', 'Please fill in all fields!');
      return;
    }

    login.mutate(
      { ...values, rememberMe },
      {
        onSuccess: () => {
          showToast('success', 'Welcome to CityCalls Admin Panel!');
          router.push('/dashboard');
        },
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            'Invalid credentials! Try again.';

          showToast('error', errorMessage);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-80 h-80 bg-[#3e8914]/5 rounded-full blur-3xl opacity-30" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#e09500]/5 rounded-full blur-3xl opacity-30" />
      </div>

      {/* Main Content */}
      <div
        className="relative z-10 w-full max-w-7xl grid lg:grid-cols-2 gap-10 items-center"
        style={{ zoom: 0.75 }}
      >
        {/* LEFT SIDE - Brand & Features */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Admin Dashboard</h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Manage all your home appliance repairs, house cleaning, sofa shampooing, and salon service bookings with real-time tracking, staff allocation, and security.
            </p>

            <div className="space-y-4 pt-6">
              <FeatureCard
                icon={<Wrench className="text-[#3e8914]" size={24} />}
                title="Service Request Management"
                desc="Track and process all incoming bookings from concept to completion"
              />
              <FeatureCard
                icon={<Home className="text-[#e09500]" size={24} />}
                title="Vendor & Staff Hub"
                desc="Manage technician assignments, service areas, and customer support"
              />
              <FeatureCard
                icon={<Ruler className="text-[#3e8914]" size={24} />}
                title="Service Catalog & Pricing"
                desc="Maintain catalog of appliance repair, cleaning, and saloon offerings"
              />
              <FeatureCard
                icon={<Shield className="text-[#e09500]" size={24} />}
                title="Secure Access Control"
                desc="Protected with industry-standard RBAC, JWT tokens, and audit trails"
              />
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - LOGIN FORM */}
        <div
          className="bg-white border-2 border-gray-200 p-8 relative"
          style={{
            boxShadow:
              'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px',
          }}
        >
          <div className="absolute top-3 right-3 w-32 h-32 pointer-events-none">
            <DotLottieReact
              src="https://lottie.host/58c1e177-84f3-4312-a01a-60859fc24543/bbANzsbMi8.lottie"
              loop
              autoplay
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-6">
              <span className="text-[#3e8914]">City</span>
              <span className="text-gray-900">Calls</span>
            </h1>
            <h2 className="text-3xl font-bold text-gray-800 mb-3">
              Welcome Back!
            </h2>
            <p className="text-red-600 text-lg">
              Sign in to access your CityCalls admin dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* USERNAME / EMAIL */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={20} />
                </div>
                <input
                  type="text"
                  placeholder="Enter your username or email"
                  className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-base"
                  {...register('identifier')}
                />
              </div>
              {errors.identifier && (
                <p className="mt-1 text-sm font-medium text-red-500">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-base font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={20} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3.5 bg-white border-2 border-gray-300 focus:outline-none focus:border-[#3e8914] transition-colors text-base"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-[#3e8914] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm font-medium text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* REMEMBER ME */}
            <div className="flex items-center pt-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 text-[#3e8914] border-gray-300 rounded focus:ring-[#3e8914] cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="ml-3 text-base text-gray-600 cursor-pointer select-none"
              >
                Keep me logged in
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={login.isPending}
              className="w-full bg-[#3e8914] hover:bg-[#347311] text-white font-bold py-4 px-6 transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-wider text-base shadow-lg hover:shadow-xl mt-4 cursor-pointer"
            >
              {login.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>SIGN IN TO DASHBOARD</span>
                </>
              )}
            </button>

          </form>

          <p className="text-center text-sm font-semibold text-blue-600 mt-8 pt-6 border-t border-gray-200">
            © {new Date().getFullYear()} CityCalls Services & Management Pvt. Ltd.
          </p>
        </div>
      </div>
    </div>
  );
}

// ✅ FEATURE CARD
const FeatureCard = ({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) => (
  <div
    className="flex items-center space-x-4 bg-white p-5 border-2 border-gray-200 hover:border-[#3e8914] transition-all duration-300"
    style={{
      boxShadow:
        'rgba(0, 0, 0, 0.02) 0px 1px 3px 0px, rgba(27, 31, 35, 0.15) 0px 0px 0px 1px',
    }}
  >
    <div className="w-14 h-14 bg-[#3e8914]/10 rounded-sm flex items-center justify-center shrink-0">
      {icon}
    </div>
    <div>
      <p className="font-bold text-gray-800 text-lg">{title}</p>
      <p className="text-gray-600">{desc}</p>
    </div>
  </div>
);