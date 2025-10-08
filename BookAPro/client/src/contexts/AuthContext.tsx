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

interface AuthContextType {
  user: User | null;
  student: Student | null;
  coach: Coach | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [coach, setCoach] = useState<Coach | null>(null);

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

      // If user is a student, fetch student profile
      if (data.user.role === "student") {
        const studentRes = await fetch("/api/students/me", { credentials: "include" });
        if (studentRes.ok) {
          const studentData = await studentRes.json();
          setStudent(studentData);
        }
      }

      // If user is a coach, fetch coach profile
      if (data.user.role === "coach") {
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
      const data = await res.json();
      setUser(data.user);
      await refreshUser(); // load student/coach profile
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
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, student, coach, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
