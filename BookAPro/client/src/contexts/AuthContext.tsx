import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  role: string;
}

interface Student {
  id: string;
  name: string;
  phone?: string;
  skillLevel?: string;
  user_id: string;
}

interface Coach {
  id: string;
  name: string;
  location?: string;
  bio?: string;
  user_id: string;
}

type PendingAction =
  | null
  | { type: "book"; coachId: string }
  | { type: "openTab"; tab: "login" | "signup" };

interface AuthContextType {
  user: User | null;
  student: Student | null;
  coach: Coach | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  // Modal / cross-app auth helpers
  isAuthModalOpen: boolean;
  openAuthModal: (opts?: { initialTab?: "login" | "signup"; pendingAction?: PendingAction }) => void;
  closeAuthModal: () => void;
  pendingAction: PendingAction;
  setPendingAction: (p: PendingAction) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);

  // modal + pending action state
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  // optional: store initial tab for modal (login/signup)
  const [initialAuthTab, setInitialAuthTab] = useState<"login" | "signup">("login");

  const refreshUser = async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) {
        setUser(null);
        setStudent(null);
        setCoach(null);
        return;
      }

      const data = await res.json();
      setUser(data.user);

      // reset student/coach
      setStudent(null);
      setCoach(null);

      // If user is a student, fetch student profile
      if (data.user?.role === "student") {
        const studentRes = await fetch("/api/students/me", { credentials: "include" });
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudent(studentData);
        }
      }

      // If user is a coach, fetch coach profile
      if (data.user?.role === "coach") {
        const coachRes = await fetch("/api/coaches/me", { credentials: "include" });
        if (coachRes.ok) {
          const coachData = await coachRes.json();
          setCoach(coachData);
        }
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
      setUser(null);
      setStudent(null);
      setCoach(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return false;
      await refreshUser();
      // close modal on success and keep pendingAction for consumer to handle
      setAuthModalOpen(false);
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
    setStudent(null);
    setCoach(null);
    setPendingAction(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const openAuthModal = (opts?: { initialTab?: "login" | "signup"; pendingAction?: PendingAction }) => {
    if (opts?.initialTab) setInitialAuthTab(opts.initialTab);
    if (opts?.pendingAction) setPendingAction(opts.pendingAction);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        student,
        coach,
        login,
        logout,
        refreshUser,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        pendingAction,
        setPendingAction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};