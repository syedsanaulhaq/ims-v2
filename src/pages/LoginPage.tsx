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
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-teal-600 border-0 shadow-2xl overflow-hidden">
          <CardContent className="p-0">
            {/* Header Section */}
            <div className="text-center py-8 px-6">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-600 to-teal-700 rounded-full flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white">
                      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM17 12H14.5L13 7H11L9.5 12H7L8.5 17H10L11.5 12H12.5L14 17H15.5L17 12Z"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Title */}
              <h1 className="text-white text-xl font-semibold mb-2 leading-tight">
                WELCOME TO ELECTION COMMISSION OF
              </h1>
              <h2 className="text-white text-xl font-semibold mb-8 leading-tight">
                PAKISTAN DIGITAL PORTAL
              </h2>
            </div>

            {/* Login Form */}
            <div className="px-8 pb-8">
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
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="17301-1569872-7"
                    className="h-12 pl-12 pr-12 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-teal-500 focus:ring-teal-500"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
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
                    className="h-12 pl-12 pr-12 bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:bg-white focus:border-teal-500 focus:ring-teal-500"
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
                    className="border-white/50 data-[state=checked]:bg-white data-[state=checked]:border-white data-[state=checked]:text-teal-600"
                  />
                  <label htmlFor="remember" className="text-white text-sm font-medium cursor-pointer">
                    Remember me
                  </label>
                </div>

                {/* Login Button */}
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-white text-teal-600 hover:bg-gray-100 font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                      <span>Signing in...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <LogIn className="h-4 w-4" />
                      <span>Login</span>
                    </div>
                  )}
                </Button>
              </form>

              {/* Development Info */}
              <div className="mt-8 p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                <h4 className="text-white text-sm font-medium mb-2">Development Access:</h4>
                <div className="text-xs text-white/80 space-y-1">
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
