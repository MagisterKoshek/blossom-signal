import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Role, storage, seedStorage } from "./storage";

interface AuthContextType {
  user: User | null;
  role: Role | null;
  login: (userId: string) => void;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    seedStorage();
    const sessionId = storage.getSession();
    if (sessionId) {
      const users = storage.getUsers();
      const roles = storage.getRoles();
      const currentUser = users.find(u => u.id === sessionId);
      if (currentUser) {
        setUser(currentUser);
        const currentRole = roles.find(r => r.id === currentUser.roleId);
        setRole(currentRole || null);
      } else {
        storage.setSession(null);
      }
    }
  }, []);

  const login = (userId: string) => {
    storage.setSession(userId);
    const users = storage.getUsers();
    const roles = storage.getRoles();
    const currentUser = users.find(u => u.id === userId);
    if (currentUser) {
      setUser(currentUser);
      setRole(roles.find(r => r.id === currentUser.roleId) || null);
    }
  };

  const logout = () => {
    storage.setSession(null);
    setUser(null);
    setRole(null);
  };

  const hasPermission = (perm: string) => {
    if (!role) return false;
    if (role.permissions.includes("*")) return true;
    return role.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
