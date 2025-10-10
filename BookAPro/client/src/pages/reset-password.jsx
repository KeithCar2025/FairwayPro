// ResetPasswordPage.jsx
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff } from 'lucide-react';
import zxcvbn from 'zxcvbn';

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Password strength states
  const [pwScore, setPwScore] = useState(0);
  const [pwFeedback, setPwFeedback] = useState(null);
  const minAcceptableScore = 3;
  
  // Get token from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Missing password reset token');
    }
  }, []);
  
  // Evaluate password strength
  useEffect(() => {
    if (!password) {
      setPwScore(0);
      setPwFeedback(null);
      return;
    }
    try {
      const res = zxcvbn(password);
      setPwScore(res.score);
      const advice = res.feedback?.warning ? 
        res.feedback.warning : 
        (res.feedback?.suggestions?.join(" ") || null);
      setPwFeedback(advice);
    } catch (err) {
      setPwScore(0);
      setPwFeedback(null);
    }
  }, [password]);

  const scoreLabel = (score) => {
    switch (score) {
      case 0: return { label: "Very weak", color: "bg-red-500", pct: 20 };
      case 1: return { label: "Weak", color: "bg-orange-500", pct: 40 };
      case 2: return { label: "Fair", color: "bg-yellow-400", pct: 60 };
      case 3: return { label: "Good", color: "bg-green-500", pct: 80 };
      case 4: return { label: "Excellent", color: "bg-green-700", pct: 100 };
      default: return { label: "Very weak", color: "bg-red-500", pct: 0 };
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate passwords
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    if (pwScore < minAcceptableScore) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      
      toast({
        title: "Password Reset Successful",
        description: "Your password has been reset. You can now log in with your new password."
      });
      
      // Redirect to login page
      setTimeout(() => {
        setLocation('/');
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto max-w-md py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Strength meter */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 h-2 rounded">
                  <div
                    style={{ width: `${scoreLabel(pwScore).pct}%` }}
                    className={`${scoreLabel(pwScore).color} h-2 rounded`}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{scoreLabel(pwScore).label}</span>
                  <span>{pwScore < minAcceptableScore ? "Password too weak" : "OK"}</span>
                </div>
                {pwFeedback && <div className="text-xs text-muted-foreground mt-1">{pwFeedback}</div>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || pwScore < minAcceptableScore || !token}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}