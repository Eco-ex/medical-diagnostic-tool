import { useAuth } from '../hooks/useAuth';
import { Activity, Shield, Brain, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password || (isRegistering && !name)) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        await register({ username, password, name });
        toast.success('Account created successfully! First user is automatically set as admin.');
      } else {
        await login({ username, password });
        toast.success('Logged in successfully');
      }
    } catch (error: any) {
      console.error('Authentication failed:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Authentication failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Activity className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">MedAssist</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300">Clinical Decision Support Tool</p>
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Features Cards */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
              <Shield className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Secure Authentication</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Protected access with encrypted credentials
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-cyan-50 p-4 dark:bg-cyan-950/30">
              <Brain className="mt-0.5 h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">AI-Powered Insights</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Evidence-based treatment analysis
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
              <FileText className="mt-0.5 h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Complete Records</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Comprehensive patient history tracking
                </p>
              </div>
            </div>
          </div>

          {/* Login/Register Form */}
          <div className="rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
            <h2 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Dr. John Doe"
                    required={isRegistering}
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="username"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {isRegistering ? 'Creating Account...' : 'Signing in...'}
                  </div>
                ) : (
                  isRegistering ? 'Create Account' : 'Sign In'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setName('');
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
              >
                {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
              </button>
            </form>

            {isRegistering && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> The first user to register will automatically be assigned as an administrator.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-12 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            © 2025 Clinical Decision Support Tool
          </p>
        </footer>
      </div>
    </div>
  );
}
