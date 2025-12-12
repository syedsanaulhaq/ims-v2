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
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0d8b81 0%, #0a6e68 100%)' }} >
      {/* Background image overlay */}
      <div 
        className="absolute inset-0 opacity-10 bg-no-repeat bg-cover bg-center"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="1200" height="600" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"%3E%3Cpath d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="0.5"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="1200" height="600" fill="url(%23grid)" /%3E%3C/svg%3E")'
        }}
      />

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-white border-0 shadow-2xl overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {/* Header Section with Teal Background */}
              <div className="text-center py-12 px-8" style={{ background: 'linear-gradient(135deg, #0d8b81 0%, #0a6e68 100%)' }}>
                {/* Logo */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-24 h-24">
                    <img 
                      src="/ecp-logo.png" 
                      alt="ECP Logo"
                      className="w-full h-full object-contain filter drop-shadow-lg"
                    />
                  </div>
                </div>
                
                {/* Title */}
                <h1 className="text-white text-lg font-bold mb-1 leading-tight">
                  WELCOME TO ELECTION COMMISSION OF
                </h1>
                <h2 className="text-white text-lg font-bold leading-tight">
                  PAKISTAN INVENTORY MANAGEMENT SYSTEM
                </h2>
              </div>

              {/* Login Form */}
              <div className="px-8 py-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                {error && (
                  <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Username Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your CNIC or ID"
                    className="h-12 pl-12 pr-4 bg-white border border-gray-300 text-gray-900 placeholder-gray-500 rounded-lg focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                    required
                  />
                </div>

                {/* Password Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="h-12 pl-12 pr-12 bg-white border border-gray-300 text-gray-900 placeholder-gray-500 rounded-lg focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
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
                    className="border-gray-300 data-[state=checked]:bg-teal-600 data-[state=checked]:border-teal-600"
                  />
                  <label htmlFor="remember" className="text-gray-700 text-sm font-medium cursor-pointer">
                    Remember me
                  </label>
                </div>

                {/* Login Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800 font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
    </div>
  );
};

export default LoginPage;
