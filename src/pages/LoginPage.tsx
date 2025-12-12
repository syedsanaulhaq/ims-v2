import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, LogIn, User, Lock } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const { initializeSession } = useSession();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      setIsLoading(false);
      return;
    }

    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        // Refresh session to get IMS roles and permissions
        await initializeSession();
        navigate('/');
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, rgba(13, 139, 129, 0.1) 0%, rgba(10, 110, 104, 0.1) 100%), url("data:image/svg+xml,%3Csvg width="1200" height="600" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="0.5"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="1200" height="600" fill="url(%23grid)" /%3E%3C/svg%3E")' }}>
      <div className="w-full max-w-sm">
        <Card className="bg-teal-700 border-0 shadow-2xl overflow-hidden rounded-xl" style={{ backgroundColor: '#0d8b81' }}>
          <CardContent className="p-0">
            {/* Header Section with Teal Background */}
            <div className="text-center py-10 px-8">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <img 
                    src="/ecp-logo-small.png" 
                    alt="ECP Logo"
                    className="w-20 h-20 object-contain"
                  />
                </div>
              </div>
              
              {/* Title */}
              <h1 className="text-white text-base font-bold mb-1 leading-snug">
                WELCOME TO ELECTION COMMISSION OF
              </h1>
              <h2 className="text-white text-base font-bold leading-snug">
                PAKISTAN DIGITAL PORTAL
              </h2>
            </div>

            {/* Login Form */}
            <div className="px-8 py-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 text-white p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Username Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.167 4.999C2.167 4.078 3.065 3.33 4.028 3.33h11.944c.963 0 1.861.748 1.861 1.669v10.002c0 .921-.898 1.669-1.861 1.669H4.028c-.963 0-1.861-.748-1.861-1.669V4.999z"/>
                    </svg>
                  </div>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="17301-1569872-7"
                    className="h-12 pl-12 pr-4 bg-white border-0 text-gray-900 placeholder-gray-500 rounded-none focus:bg-white focus:border-0 focus:ring-0 focus:outline-none"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                    </svg>
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="h-12 pl-12 pr-12 bg-white border-0 text-gray-900 placeholder-gray-500 rounded-none focus:bg-white focus:border-0 focus:ring-0 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Remember Me */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:border-white"
                  />
                  <label htmlFor="remember" className="text-white text-sm font-medium cursor-pointer">
                    Remember me
                  </label>
                </div>

                {/* Login Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-white text-teal-700 hover:bg-gray-100 font-semibold rounded-full transition-all duration-200 shadow-lg hover:shadow-xl mt-4"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-700"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <LogIn className="h-4 w-4" />
                      <span>Login</span>
                    </div>
                  )}
                </Button>
              </form>

              {/* Development Info */}
              <div className="mt-8 p-4 bg-gray-100 rounded-lg border border-gray-200">
                <h4 className="text-gray-800 text-sm font-semibold mb-2">Development Access:</h4>
                <div className="text-xs text-gray-700 space-y-1">
                  <p><strong>Admin:</strong> admin / admin</p>
                  <p><strong>Real Users:</strong> Use CNIC as username</p>
                  <p><strong>Example:</strong> 4130423170445</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
