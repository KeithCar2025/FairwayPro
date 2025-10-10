import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast"; // Assuming you have a toast component
import zxcvbn from "zxcvbn";
import ReCAPTCHA from "react-google-recaptcha";
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}
export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, refreshUser } = useAuth();
  const { toast } = useToast(); // Add toast for notifications

  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // CAPTCHA state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  // Password strength states
  const [pwScore, setPwScore] = useState<number>(0); // 0..4
  const [pwFeedback, setPwFeedback] = useState<string | null>(null);
  const minAcceptableScore = 3; // require 3+ (Good/Excellent)

  // Handle CAPTCHA verification
  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  useEffect(() => {
    if (!signupData.password) {
      setPwScore(0);
      setPwFeedback(null);
      return;
    }
    try {
      const res = zxcvbn(signupData.password, [signupData.email, signupData.name]);
      setPwScore(res.score);
      const advice = res.feedback?.warning ? res.feedback.warning : (res.feedback?.suggestions?.join(" ") || null);
      setPwFeedback(advice);
    } catch (err) {
      // if zxcvbn fails for any reason, default to 0
      setPwScore(0);
      setPwFeedback(null);
    }
  }, [signupData.password, signupData.email, signupData.name]);

  // Reset CAPTCHA when modal closes or form view changes
  useEffect(() => {
    if (!isOpen || !showForgotPassword) {
      setCaptchaToken(null);
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
    }
  }, [isOpen, showForgotPassword]);

  const scoreLabel = (score: number) => {
    switch (score) {
      case 0:
        return { label: "Very weak", color: "bg-red-500", pct: 20 };
      case 1:
        return { label: "Weak", color: "bg-orange-500", pct: 40 };
      case 2:
        return { label: "Fair", color: "bg-yellow-400", pct: 60 };
      case 3:
        return { label: "Good", color: "bg-green-500", pct: 80 };
      case 4:
        return { label: "Excellent", color: "bg-green-700", pct: 100 };
      default:
        return { label: "Very weak", color: "bg-red-500", pct: 0 };
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const success = await login(loginData.email, loginData.password);
    if (success) {
      onClose();
    } else {
      setError("Login failed. Check your email/password.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (pwScore < minAcceptableScore) {
      setError("Password is too weak. Please choose a stronger password.");
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: signupData.email,
          password: signupData.password,
          name: signupData.name,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onClose();
        // refresh auth state in context
        await refreshUser();
        // optionally you can navigate or show a success toast
      } else {
        setError(data.error || "Signup failed");
      }
    } catch (err) {
      setError("Signup failed");
    }
  };

  // Password reset request handler
  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Check if CAPTCHA was completed
    if (!captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call your password reset API endpoint with CAPTCHA token
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: resetEmail,
          captchaToken: captchaToken 
        }),
      });
      
      // Always show the same message regardless of whether email exists
      // This prevents user enumeration attacks
      toast({
        title: "Password Reset Request Sent",
        description: "If the email address exists in our system, you will receive a password reset link shortly.",
      });
      
      // Reset the captcha
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptchaToken(null);
      
      // Return to login view
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error) {
      console.error("Password reset request error:", error);
      // Still show the same message to prevent user enumeration
      toast({
        title: "Password Reset Request Sent",
        description: "If the email address exists in our system, you will receive a password reset link shortly.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Welcome to FairwayPro</DialogTitle>
        </DialogHeader>

        {showForgotPassword ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                className="mr-2" 
                onClick={() => setShowForgotPassword(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">Reset Password</h2>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            
            <form onSubmit={handlePasswordResetRequest} className="space-y-4">
              <div>
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                    data-testid="input-reset-email"
                  />
                </div>
              </div>
              
              {/* reCAPTCHA component */}
              <div className="flex justify-center my-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                   sitekey={RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"} 
                  onChange={handleCaptchaChange}
                />
              </div>
              
              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || !captchaToken}
                data-testid="button-reset-password"
              >
                {isSubmitting ? "Sending..." : "Send Reset Instructions"}
              </Button>
            </form>
          </div>
        ) : (
          <>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="Enter your email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                        className="pl-10"
                        required
                        data-testid="input-login-email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                        className="pl-10 pr-10"
                        required
                        data-testid="input-login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm text-center">{error}</div>
                  )}

                  <Button type="submit" className="w-full" data-testid="button-login-submit">
                    Sign In
                  </Button>
                </form>

                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    className="text-sm text-primary"
                    onClick={() => setShowForgotPassword(true)}
                    data-testid="button-forgot-password"
                  >
                    Forgot your password?
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                {/* Signup content remains unchanged */}
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Enter your full name"
                        value={signupData.name}
                        onChange={(e) => setSignupData({...signupData, name: e.target.value})}
                        className="pl-10"
                        required
                        data-testid="input-signup-name"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                        className="pl-10"
                        required
                        data-testid="input-signup-email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                        className="pl-10 pr-10"
                        required
                        data-testid="input-signup-password"
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
                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="signup-confirm-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                        className="pl-10"
                        required
                        data-testid="input-signup-confirm-password"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-red-500 text-sm text-center">{error}</div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    data-testid="button-signup-submit"
                    disabled={pwScore < minAcceptableScore || signupData.password !== signupData.confirmPassword}
                  >
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              {/* Google Sign In - Now takes full width */}
              <a href="/api/auth/google" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full flex items-center justify-center py-5"
                  data-testid="button-login-google"
                  type="button"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in with Google
                </Button>
              </a>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <Button variant="ghost" className="p-0 h-auto text-sm">
                Terms of Service
              </Button>{" "}
              and{" "}
              <Button variant="ghost" className="p-0 h-auto text-sm">
                Privacy Policy
              </Button>
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}