import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  Home,
  DollarSign,
  Receipt,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Info,
  User,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { motion, AnimatePresence } from "framer-motion";

// Constants
const NAVIGATION_ITEMS = [
  { 
    name: "Dashboard", 
    path: "/", 
    icon: <Home className="w-4 h-4" />,
    gradient: "from-blue-500 to-indigo-600"
  },
  {
    name: "Expenses",
    path: "/expenses",
    icon: <DollarSign className="w-4 h-4" />,
    gradient: "from-green-500 to-emerald-600"
  },
  {
    name: "Bills",
    path: "/bills",
    icon: <Receipt className="w-4 h-4" />,
    gradient: "from-amber-500 to-orange-600"
  },
  {
    name: "Warranties",
    path: "/warranties",
    icon: <ShieldCheck className="w-4 h-4" />,
    gradient: "from-purple-500 to-violet-600"
  },
  {
    name: "About",
    path: "/about",
    icon: <Info className="w-4 h-4" />,
    gradient: "from-slate-500 to-gray-600"
  },
];

const ANIMATION_VARIANTS = {
  sidebar: {
    open: {
      x: 0,
      opacity: 1,
      transition: {
        type: "tween",
        duration: 0.25,
        ease: "easeOut"
      }
    },
    closed: {
      x: -288,
      opacity: 0,
      transition: {
        type: "tween",
        duration: 0.25,
        ease: "easeIn"
      }
    }
  },
  overlay: {
    open: {
      opacity: 1,
      transition: { duration: 0.15 }
    },
    closed: {
      opacity: 0,
      transition: { duration: 0.15 }
    }
  }
};

// Interfaces
interface NavigationItemProps {
  item: typeof NAVIGATION_ITEMS[0];
  isActive: boolean;
  onNavigate: () => void;
}

interface UserProfileProps {
  user: any;
  isActive: boolean;
  onNavigate: () => void;
}

interface LogoutButtonProps {
  onLogout: () => void;
}

// Sub-components
const NavigationItem: React.FC<NavigationItemProps> = React.memo(({ item, isActive, onNavigate }) => (
  <Link
    to={item.path}
    onClick={onNavigate}
    className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 ${
      isActive
        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`}
    style={{ willChange: 'transform' }}
    aria-current={isActive ? "page" : undefined}
    role="menuitem"
  >
    {/* Icon */}
    <div className={`relative z-10 p-1.5 rounded-md ${
      isActive 
        ? "bg-white/20" 
        : `bg-gradient-to-r ${item.gradient} opacity-90 group-hover:opacity-100`
    } transition-all duration-150`}>
      <span className="text-white" aria-hidden="true">
        {item.icon}
      </span>
    </div>
    
    <span className="relative z-10 font-semibold">
      {item.name}
    </span>
    
    {!isActive && (
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"></div>
    )}
  </Link>
));

const UserProfile: React.FC<UserProfileProps> = React.memo(({ user, isActive, onNavigate }) => {
  const [avatarError, setAvatarError] = useState(false);

  const handleAvatarError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    setAvatarError(true);
    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || "User")}&background=6366f1&color=ffffff&size=40`;
  }, [user?.name]);

  return (
    <Link
      to="/profile"
      onClick={onNavigate}
      className={`group flex items-center gap-3 px-3 py-3 rounded-lg text-xs font-semibold transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 ${
        isActive
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
          : "text-slate-300 hover:bg-white/10 hover:text-white bg-white/5 border border-white/20"
      }`}
      style={{ willChange: 'transform' }}
      aria-current={isActive ? "page" : undefined}
      role="menuitem"
    >
      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden ring-2 ring-white/30 flex-shrink-0 shadow-md">
        {user?.avatar && !avatarError ? (
          <img
            src={user.avatar.split('=')[0]}
            alt={`${user?.name || "User"} avatar`}
            referrerPolicy="no-referrer"
            onError={handleAvatarError}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div 
            className="h-full w-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold"
            aria-label={`${user?.name || "User"} initials`}
          >
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <p className="text-xs font-semibold truncate text-slate-200 group-hover:text-white">
          {user?.name || "User"}
        </p>
        <p className="text-[10px] text-slate-400 truncate group-hover:text-slate-300">
          {user?.email || "user@example.com"}
        </p>
      </div>
      <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-300" aria-hidden="true" />
    </Link>
  );
});

const LogoutButton: React.FC<LogoutButtonProps> = React.memo(({ onLogout }) => (
  <button
    onClick={onLogout}
    className="group flex items-center gap-3 text-xs px-3 py-2.5 rounded-lg text-rose-400 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-150 w-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-rose-500 bg-white/5 border border-rose-400/30 hover:border-rose-500/60"
    role="menuitem"
    aria-label="Sign out of your account"
  >
    <div className="p-1.5 rounded-md bg-rose-500/20 group-hover:bg-white/20 transition-colors duration-150">
      <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
    </div>
    <span className="font-semibold">Logout</span>
  </button>
));

// Loading Skeleton Component
const SidebarSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-slate-100 animate-pulse">
    <div className="px-4 pt-4 pb-4 flex flex-col h-full">
      {/* Logo Skeleton */}
      <div className="flex items-center justify-center px-2 py-3 mb-6 bg-white/10 rounded-xl">
        <div className="h-8 w-8 bg-white/20 rounded-lg"></div>
        <div className="flex flex-col ml-3">
          <div className="h-4 w-20 bg-white/20 rounded"></div>
          <div className="h-2 w-16 bg-white/10 rounded mt-1"></div>
        </div>
      </div>

      {/* Navigation Skeleton */}
      <div className="space-y-1.5 flex-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="h-6 w-6 bg-white/20 rounded-md"></div>
            <div className="h-3 w-16 bg-white/20 rounded"></div>
          </div>
        ))}
      </div>

      {/* Profile Skeleton */}
      <div className="mt-6 border-t border-white/20 pt-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg">
          <div className="h-10 w-10 bg-white/20 rounded-lg"></div>
          <div className="flex flex-col flex-1">
            <div className="h-3 w-20 bg-white/20 rounded"></div>
            <div className="h-2 w-24 bg-white/10 rounded mt-1"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main Component
const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  // Memoized navigation items
  const navItems = useMemo(() => NAVIGATION_ITEMS, []);

  // Loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Body overflow management
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [sidebarOpen]);

  // Focus management for accessibility
  useEffect(() => {
    if (sidebarOpen && sidebarRef.current) {
      const firstFocusableElement = sidebarRef.current.querySelector('a, button');
      if (firstFocusableElement) {
        (firstFocusableElement as HTMLElement).focus();
      }
    }
  }, [sidebarOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  const isActive = useCallback((path: string) => location.pathname === path, [location.pathname]);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleLogoutClick = useCallback(() => {
    setSidebarOpen(false);
    setShowLogoutConfirm(true);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    try {
      logout();
      setShowLogoutConfirm(false);
    } catch (err) {
      setError('Failed to logout. Please try again.');
      console.error('Logout error:', err);
    }
  }, [logout]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-slate-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-500/20"></div>
      </div>
      
      <div className="relative z-10 px-4 pt-4 pb-4 flex flex-col h-full">
        {/* Logo Section */}
        <div className="flex items-center justify-center px-2 py-3 mb-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
          <img
            src="/logo.png"
            alt="SmartSpend Logo"
            className="h-8 w-8 rounded-lg shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              setError('Logo failed to load');
            }}
          />
          <div className="flex flex-col leading-tight ml-3">
            <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
              Smart<span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Spend</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium -mt-0.5">
              Track • Save • Optimize
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-xs">
            {error}
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-300 hover:text-white"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav 
          className="space-y-1.5 flex-1" 
          role="menu" 
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <NavigationItem
              key={item.path}
              item={item}
              isActive={isActive(item.path)}
              onNavigate={handleSidebarClose}
            />
          ))}
        </nav>

        {/* Profile Section */}
        <div className="mt-6 border-t border-white/20 pt-4 space-y-3">
          <UserProfile
            user={user}
            isActive={isActive("/profile")}
            onNavigate={handleSidebarClose}
          />

          <LogoutButton onLogout={handleLogoutClick} />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
        <div className="hidden md:flex md:w-64 lg:w-72 xl:w-80 md:flex-col shadow-xl">
          <SidebarSkeleton />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-3 py-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-slate-200 rounded-lg animate-pulse"></div>
              <div className="h-6 w-24 bg-slate-200 rounded animate-pulse"></div>
              <div className="w-9"></div>
            </div>
          </div>
          <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="h-64 bg-white/50 rounded-lg animate-pulse"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
      {/* Mobile Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"
              onClick={handleSidebarClose}
              variants={ANIMATION_VARIANTS.overlay}
              initial="closed"
              animate="open"
              exit="closed"
              aria-hidden="true"
            />
            <motion.div
              ref={sidebarRef}
              className="absolute top-0 left-0 w-72 h-full shadow-xl"
              variants={ANIMATION_VARIANTS.sidebar}
              initial="closed"
              animate="open"
              exit="closed"
              style={{ willChange: 'transform' }}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
              id="mobile-sidebar"
            >
              <div className="absolute top-3 right-3 z-20">
                <button
                  onClick={handleSidebarClose}
                  className="p-2 rounded-lg text-slate-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/5 backdrop-blur-sm border border-white/20 transition-colors duration-150"
                  aria-label="Close navigation menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 lg:w-72 xl:w-80 md:flex-col shadow-xl">
        {sidebarContent}
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-3 py-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-150"
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Smart<span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Spend</span>
              </span>
            </div>
            <div className="w-9"></div>
          </div>
        </div>

        <main 
          className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 p-3 sm:p-4 lg:p-6 xl:p-8 transition-all duration-200 ease-in-out"
          role="main"
          aria-label="Main content"
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      <LogoutConfirmModal
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
      />
    </div>
  );
};

// Set display names for better debugging
NavigationItem.displayName = 'NavigationItem';
UserProfile.displayName = 'UserProfile';
LogoutButton.displayName = 'LogoutButton';
SidebarSkeleton.displayName = 'SidebarSkeleton';

export default DashboardLayout;
