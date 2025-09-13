import { Menu as HeadlessMenu, Transition } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  Home,
  Info,
  LogOut,
  Menu,
  Receipt,
  ShieldCheck,
  TrendingUp,
  User,
  X as XIcon,
} from "lucide-react";
import React, {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import LogoutConfirmModal from "../components/LogoutConfirmModal";
import { useAuth } from "../contexts/AuthContext";

// TYPES & INTERFACES

interface NavigationItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  gradient: string;
}

interface UserData {
  name?: string;
  email?: string;
  avatar?: string;
}

interface NavigationItemProps {
  item: NavigationItem;
  isActive: boolean;
  onNavigate: () => void;
  isCollapsed: boolean;
}

interface CollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface UserMenuProps {
  user: UserData | null;
  onLogout: () => void;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

// CONSTANTS

const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    name: "Dashboard",
    path: "/",
    icon: <Home className="w-4 h-4" />,
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    name: "Incomes",
    path: "/incomes",
    icon: <TrendingUp className="w-4 h-4" />,
    gradient: "from-sky-500 to-cyan-600",
  },
  {
    name: "Expenses",
    path: "/expenses",
    icon: <DollarSign className="w-4 h-4" />,
    gradient: "from-green-500 to-emerald-600",
  },
  {
    name: "Bills",
    path: "/bills",
    icon: <Receipt className="w-4 h-4" />,
    gradient: "from-amber-500 to-orange-600",
  },
  {
    name: "Monthly View",
    path: "/monthly",
    icon: <BarChart3 className="w-4 h-4" />,
    gradient: "from-purple-500 to-indigo-600",
  },
  {
    name: "Warranties",
    path: "/warranties",
    icon: <ShieldCheck className="w-4 h-4" />,
    gradient: "from-purple-500 to-violet-600",
  },
  {
    name: "About",
    path: "/about",
    icon: <Info className="w-4 h-4" />,
    gradient: "from-slate-500 to-gray-600",
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
        ease: "easeOut",
      },
    },
    closed: {
      x: "-100%",
      opacity: 0,
      transition: {
        type: "tween",
        duration: 0.25,
        ease: "easeIn",
      },
    },
  },
  overlay: {
    open: {
      opacity: 1,
      transition: { duration: 0.15 },
    },
    closed: {
      opacity: 0,
      transition: { duration: 0.15 },
    },
  },
};

// SUB-COMPONENTS
const CollapseButton: React.FC<CollapseButtonProps> = ({
  isCollapsed,
  onToggle,
}) => (
  <button
    onClick={onToggle}
        className="hidden md:flex absolute -right-3 top-1/2 z-20 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-700 text-slate-200 shadow-lg transition-all duration-200 hover:bg-indigo-600 hover:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/50 h-6 w-6"
    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
  >
    <AnimatePresence mode="wait">
      <motion.div
        key={isCollapsed ? "right" : "left"}
        initial={{ opacity: 0, rotate: -90 }}
        animate={{ opacity: 1, rotate: 0, transition: { duration: 0.2 } }}
        exit={{ opacity: 0, rotate: 90, transition: { duration: 0.2 } }}
        style={{ transformOrigin: "center" }}
      >
        {isCollapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </motion.div>
    </AnimatePresence>
  </button>
);

const NavigationItem: React.FC<NavigationItemProps> = React.memo(
  ({ item, isActive, onNavigate, isCollapsed }) => (
    <li>
      <div className="relative">
        <Link
          to={item.path}
          onClick={onNavigate}
          className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150 ease-out focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500/50 ${
            isActive
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
              : "text-slate-200 hover:bg-white/10 hover:text-white"
          } ${isCollapsed ? "justify-center" : ""}`}>
          <div
            className={`relative z-10 rounded-md p-1.5 ${
              isActive
                ? "bg-white/20"
                : `bg-gradient-to-r ${item.gradient} opacity-90 group-hover:opacity-100`
            } transition-all duration-150`}
            aria-hidden="true"
          >
            {item.icon}
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: { delay: 0.1, duration: 0.2 },
                }}
                exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }}
                className="relative z-10 font-semibold whitespace-nowrap"
                style={{ transform: "translateX(0)" }}
              >
                {item.name}
              </motion.span>
            )}
          </AnimatePresence>
          {!isActive && !isCollapsed && (
            <div
              className="absolute inset-0 rounded-lg bg-gradient-to-r from-white/5 to-white/10 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
              aria-hidden="true"
            />
          )}
        </Link>
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {item.name}
          </div>
        )}
      </div>
    </li>
  )
);

const UserMenu: React.FC<UserMenuProps> = React.memo(
  ({ user, onLogout, isCollapsed, onNavigate }) => {
    const [avatarError, setAvatarError] = useState(false);

    const avatarUrl = useMemo(() => {
      if (avatarError || !user?.avatar) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user?.name || "U"
        )}&background=6366f1&color=ffffff&size=40`;
      }
      return user.avatar.split("=")[0];
    }, [user, avatarError]);

    return (
      <HeadlessMenu as="div" className="relative w-full text-left">
        {({ open }) => (
          <>
            <HeadlessMenu.Button
              className={`group flex w-full items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500/50 ${
                isCollapsed ? "justify-center p-2" : "px-3 py-2.5"
              } text-slate-200 hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm border border-white/10`}
            >
              <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 ring-2 ring-white/20 shadow-md">
                <img
                  src={avatarUrl}
                  alt={user?.name ? `${user.name} avatar` : "User avatar"}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="h-full w-full object-cover"
                />
              </div>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      transition: { delay: 0.1, duration: 0.2 },
                    }}
                    exit={{ opacity: 0, x: -10, transition: { duration: 0.2 } }}
                    className="flex min-w-0 flex-1 flex-col whitespace-nowrap text-left"
                    style={{ transform: "translateX(0)" }}
                  >
                    <p className="truncate font-semibold text-slate-100 group-hover:text-white">
                      {user?.name || "User"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronsRight className="h-4 w-4 text-slate-300" />
                  </motion.div>
                )}
              </AnimatePresence>
            </HeadlessMenu.Button>

            <Transition
              as={Fragment}
              show={open}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <HeadlessMenu.Items
                static
                className={`absolute z-20 w-48 origin-bottom-left rounded-xl bg-slate-800/90 p-1 backdrop-blur-lg shadow-lg ring-1 ring-white/10 focus:outline-none ${
                  isCollapsed
                    ? "bottom-0 left-full ml-2"
                    : "bottom-full left-0 mb-2"
                }`}
              >
                <HeadlessMenu.Item>
                  {({ active }) => (
                    <Link
                      to="/profile"
                      onClick={onNavigate}
                      className={`${active ? "bg-white/10 text-white" : "text-slate-200"
                        } group flex w-full items-center rounded-md px-3 py-2 text-sm font-semibold`}
                    >
                      <User className="mr-2 h-4 w-4" aria-hidden="true" />
                      Profile
                    </Link>
                  )}
                </HeadlessMenu.Item>
                <div className="my-1 h-px bg-white/10" />
                <HeadlessMenu.Item>
                  {({ active }) => (
                    <button
                      onClick={onLogout}
                      className={`${active
                          ? "bg-rose-500/20 text-rose-300"
                          : "text-rose-300"
                        } group flex w-full items-center rounded-md px-3 py-2 text-sm font-semibold`}
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      Sign Out
                    </button>
                  )}
                </HeadlessMenu.Item>
              </HeadlessMenu.Items>
            </Transition>
          </>
        )}
      </HeadlessMenu>
    );
  }
);

const SidebarSkeleton: React.FC = () => (
  <div className="flex flex-col h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-slate-100 animate-pulse">
    <div className="px-4 pt-4 pb-4 flex flex-col h-full">
      <div className="flex items-center justify-center px-2 py-3 mb-6 bg-white/10 rounded-xl">
        <div className="h-8 w-8 bg-white/20 rounded-lg"></div>
        <div className="flex flex-col ml-3">
          <div className="h-4 w-20 bg-white/20 rounded"></div>
          <div className="h-2 w-16 bg-white/10 rounded mt-1"></div>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
          >
            <div className="h-6 w-6 bg-white/20 rounded-md"></div>
            <div className="h-3 w-16 bg-white/20 rounded"></div>
          </div>
        ))}
      </div>
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

// MAIN COMPONENT

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );
  const { user, logout, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const firstFocusableRef = useRef<HTMLElement>(null);

  // Memoized active path checker
  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Body overflow and focus management
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("overflow-hidden");
      firstFocusableRef.current?.focus();
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [sidebarOpen]);

  // Keyboard navigation and focus trap
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!sidebarOpen) return;

      if (event.key === "Escape") {
        setSidebarOpen(false);
        mobileMenuButtonRef.current?.focus();
      }

      if (event.key === "Tab") {
        if (!sidebarRef.current) return;

        const focusableElements = Array.from(
          sidebarRef.current.querySelectorAll(
            'a[href], button, [tabindex]:not([tabindex="-1"])'
          )
        ) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === lastElement
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
    mobileMenuButtonRef.current?.focus();
  }, []);

  const handleLogoutClick = useCallback(() => {
    setSidebarOpen(false);
    setShowLogoutConfirm(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch (err) {
      setError("Failed to sign out. Please try again.");
      console.error("Sign out error:", err);
    }
  }, [logout]);

  const sidebarContent = (
    <div
      className={`relative flex h-full flex-col bg-slate-900 text-slate-100 overflow-hidden transition-all duration-300 ${
        isCollapsed ? "px-2" : "px-4"
      }`}
    >
      <div className="absolute inset-0 opacity-10" aria-hidden="true">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-purple-500/20"></div>
      </div>

      <div className="relative z-10 pt-4 pb-4 flex flex-col h-full">
        <div
          className={`flex items-center mb-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-200 ${
            isCollapsed ? "p-2 justify-center" : "p-3 justify-center"
          }`}
        >
          <img
            src="/logo.webp"
            alt="SmartSpend Logo"
            className="h-8 w-8 rounded-lg shadow-md flex-shrink-0"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              setError("Logo failed to load");
            }}
          />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: { delay: 0.1, duration: 0.2 },
                }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                className="flex flex-col leading-tight ml-3"
              >
                <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent whitespace-nowrap">
                  Smart
                  <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Spend
                  </span>
                </span>
                <span className="text-[10px] text-slate-300 font-medium -mt-0.5 whitespace-nowrap">
                  Manage • Save • Optimize
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-xs">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-300 hover:text-white"
              aria-label="Dismiss error"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <nav className="flex-1" aria-label="Main navigation">
          <ul className="space-y-3.5">
            {NAVIGATION_ITEMS.map((item) => (
              <NavigationItem
                key={item.path}
                item={item}
                isActive={isActive(item.path)}
                onNavigate={handleSidebarClose}
                isCollapsed={isCollapsed}
              />
            ))}
          </ul>
        </nav>

        <div className="mt-6 border-t border-white/20 pt-4">
          <UserMenu
            user={user}
            onLogout={handleLogoutClick}
            isCollapsed={isCollapsed}
            onNavigate={handleSidebarClose}
          />
        </div>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="h-screen flex overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
        <div className="hidden md:flex md:w-64 md:flex-col shadow-xl">
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
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <Fragment>
            <motion.div
              className="fixed inset-0 z-50 md:hidden"
              initial="closed"
              animate="open"
              exit="closed"
              variants={ANIMATION_VARIANTS.overlay}
            >
              <motion.div
                className="absolute inset-0 bg-slate-900/75 backdrop-blur-sm"
                onClick={handleSidebarClose}
                variants={ANIMATION_VARIANTS.overlay}
                aria-hidden="true"
              />
              <motion.div
                ref={sidebarRef}
                className="absolute top-0 left-0 w-72 h-full shadow-xl focus:outline-none"
                variants={ANIMATION_VARIANTS.sidebar}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                id="mobile-sidebar"
                tabIndex={-1}
              >
                {sidebarContent}
              </motion.div>
            </motion.div>
          </Fragment>
        )}
      </AnimatePresence>

      <div
        className={`hidden md:flex md:flex-col shadow-xl relative transition-all duration-300 ease-in-out ${
          isCollapsed ? "md:w-24" : "md:w-64"
        }`}
      >
        <CollapseButton
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
        {sidebarContent}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-3 py-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-800 hover:bg-slate-300/80 focus:outline-none active:bg-slate-200/50 transition-colors duration-150 relative"
              aria-label="Open navigation menu"
              aria-expanded={sidebarOpen}
              aria-controls="mobile-sidebar"
            >
              <Menu className="w-5 h-5" />
              {isCollapsed && (
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-white"></span>
              )}
            </button>
            <div className="flex-1 text-center">
              <span className="text-base font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Smart
                <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                  Spend
                </span>
              </span>
            </div>
            <div className="w-9 h-9"></div>
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

// Display names
NavigationItem.displayName = "NavigationItem";
SidebarSkeleton.displayName = "SidebarSkeleton";
CollapseButton.displayName = "CollapseButton";
UserMenu.displayName = "UserMenu";

export default React.memo(DashboardLayout);
