import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  getAllUsers: () => User[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'kasrlearn_users';
const CURRENT_USER_KEY = 'kasrlearn_current_user';

// Default admin user
const defaultAdmin: User = {
  id: 'admin-1',
  email: 'admin@kasrlearn.com',
  name: 'Admin User',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize users in localStorage if not exists
    const users = localStorage.getItem(USERS_KEY);
    if (!users) {
      localStorage.setItem(USERS_KEY, JSON.stringify([defaultAdmin]));
    }

    // Check for existing session
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const getAllUsers = (): User[] => {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const users = getAllUsers();
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!foundUser) {
      toast({
        title: 'Login failed',
        description: 'User not found. Please check your email or sign up.',
        variant: 'destructive',
      });
      return false;
    }

    // In a real app, you'd verify the password hash
    // For demo, we just check if user exists
    setUser(foundUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(foundUser));
    toast({
      title: 'Welcome back!',
      description: `Logged in as ${foundUser.name}`,
    });
    return true;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    const users = getAllUsers();
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      toast({
        title: 'Signup failed',
        description: 'An account with this email already exists.',
        variant: 'destructive',
      });
      return false;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      name,
      role: 'student', // Default role
      createdAt: new Date().toISOString(),
    };

    const updatedUsers = [...users, newUser];
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    setUser(newUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    
    toast({
      title: 'Account created!',
      description: 'Welcome to KasrLearn!',
    });
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    toast({
      title: 'Logged out',
      description: 'See you next time!',
    });
  };

  const updateUserRole = (userId: string, role: UserRole) => {
    const users = getAllUsers();
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, role } : u
    );
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    
    // Update current user if they're the one being modified
    if (user?.id === userId) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    }
    
    toast({
      title: 'Role updated',
      description: `User role changed to ${role}`,
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout, updateUserRole, getAllUsers }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
