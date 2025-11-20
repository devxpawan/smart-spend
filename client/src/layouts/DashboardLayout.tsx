import { Menu as HeadlessMenu, Transition } from "@headlessui/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  DollarSign,
  Home,
  Info,
  Landmark,
  LogOut,
  Menu,
  Receipt,
  Repeat,
  Settings,
  ShieldCheck,
  Target,
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
import { useAuth } from "../contexts/auth-exports";

//
// HOOK: media query
//
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener(); // fire once initially
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

//
// TYPES
//
type NavigationItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  gradient: string;
};

type UserData = {
  name?: string;
  email?: string;
  avatar?: string;
};

type SidebarProps = {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  user: UserData | null;
  onLogout: () => void;
  isActive: (path: string) => boolean;
};

//
// CONSTANTS
//
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
    name: "Recurring",
    path: "/recurring",
    icon: <Repeat className="w-4 h-4" />,
    gradient: "from-indigo-500 to-purple-600",
  },
  {
    name: "Goals",
    path: "/goals",
    icon: <Target className="w-4 h-4" />,
    gradient: "from-emerald-500 to-teal-600",
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
    name: "Bank Accounts",
    path: "/bank-accounts",
    icon: <Landmark className="w-4 h-4" />,
    gradient: "from-teal-500 to-cyan-600",
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
      transition: { type: "tween", duration: 0.25, ease: "easeOut" },
    },
    closed: {
      x: "-100%",
      opacity: 0,
      transition: { type: "tween", duration: 0.25, ease: "easeIn" },
    },
  },
  overlay: {
    open: { opacity: 1, transition: { duration: 0.15 } },
    closed: { opacity: 0, transition: { duration: 0.15 } },
  },
};

//
// Collapse Button
//
const CollapseButton: React.FC<{
  isCollapsed: boolean;
  onToggle: () => void;
}> = ({ isCollapsed, onToggle }) => (
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

//
// Navigation Item
//
const NavigationItem: React.FC<{
  item: NavigationItem;
  isActive: boolean;
  onNavigate: () => void;
  isCollapsed: boolean;
}> = React.memo(({ item, isActive, onNavigate, isCollapsed }) => (
  <li>
    <div className="relative">
      <Link
        to={item.path}
        onClick={onNavigate}
        className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all duration-150 ease-out
          ${
            isActive
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25"
              : "text-slate-200 hover:bg-white/10 hover:text-white"
          }
          ${isCollapsed ? "justify-center" : ""}`}
        aria-current={isActive ? "page" : undefined}
      >
        {/* Icon */}
        <div
          className={`relative z-10 rounded-md p-1.5 ${
            isActive
              ? "bg-white/20"
              : `bg-gradient-to-r ${item.gradient} opacity-90 group-hover:opacity-100`
          } transition-all duration-150`}
        >
          {item.icon}
        </div>
        {/* Text */}
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
              className="relative z-10 whitespace-nowrap font-semibold"
            >
              {item.name}
            </motion.span>
          )}
        </AnimatePresence>
        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <span className="absolute left-full ml-4 scale-95 transform whitespace-nowrap rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white shadow-lg opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-hover:delay-300 pointer-events-none z-50">
            {item.name}
          </span>
        )}
      </Link>
    </div>
  </li>
));

//
// User Menu
//
const UserMenu: React.FC<{
  user: UserData | null;
  onLogout: () => void;
  isCollapsed: boolean;
  onNavigate?: () => void;
}> = ({ user, onLogout, isCollapsed, onNavigate }) => {
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
            className={`group flex w-full items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200
            ${isCollapsed ? "justify-center p-2" : "px-3 py-2.5"}
            text-slate-200 hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm border border-white/10`}
          >
            <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 ring-2 ring-white/20 shadow-md">
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
                  className="flex min-w-0 flex-col whitespace-nowrap"
                >
                  <p className="truncate font-semibold text-slate-100">
                    {user?.name || "User"}
                  </p>
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
              className={`absolute z-20 w-48 rounded-xl bg-slate-800/90 p-1 backdrop-blur-lg shadow-lg ring-1 ring-white/10 focus:outline-none ${
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
                    className={`${
                      active ? "bg-white/10 text-white" : "text-slate-200"
                    } flex items-center rounded-md px-3 py-2 text-sm font-semibold`}
                  >
                    <User className="mr-2 h-4 w-4" /> Profile
                  </Link>
                )}
             </HeadlessMenu.Item>
                <HeadlessMenu.Item>
                {({ active }) => (
                  <Link
                    to="/customcategories"
                    onClick={onNavigate}
                    className={`${
                      active ? "bg-white/10 text-white" : "text-slate-200"
                    } flex items-center rounded-md px-3 py-2 text-sm font-semibold`}
                  >
                    <Settings className="mr-2 h-4 w-4" /> Custom Settings
                  </Link>
                )}

              </HeadlessMenu.Item>
              <div className="my-1 h-px bg-white/10" />
              <HeadlessMenu.Item>
                {({ active }) => (
                  <button
                    onClick={onLogout}
                    className={`${
                      active ? "bg-rose-500/20 text-rose-300" : "text-rose-300"
                    } flex w-full items-center rounded-md px-3 py-2 text-sm font-semibold`}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </button>
                )}
              </HeadlessMenu.Item>
            </HeadlessMenu.Items>
          </Transition>
        </>
      )}
    </HeadlessMenu>
  );
};

//
// Logo
//
const LogoSection: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => (
  <div
    className={`flex items-center mb-6 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-200 ${
      isCollapsed ? "p-2 justify-center" : "p-3"
    }`}
  >
    <img
      src="https://i.postimg.cc/CLV2pkZr/logo.png"
      alt="SmartSpend Logo"
      className="h-8 w-8 rounded-lg shadow-md"
      onError={(e) => (e.currentTarget.style.display = "none")}
    />
    <AnimatePresence>
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
          className="ml-3 flex flex-col leading-tight"
        >
          <span className="text-lg font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
            Smart
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Spend
            </span>
          </span>
          <span className="text-[10px] text-slate-300 font-medium -mt-0.5">
            Manage • Save • Optimize
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

//
// Navigation Section
//
const NavigationSection: React.FC<{
  items: NavigationItem[];
  isActive: (path: string) => boolean;
  onNavigate: () => void;
  isCollapsed: boolean;
}> = ({ items, isActive, onNavigate, isCollapsed }) => (
  <nav className="flex-1" role="navigation">
    <ul className="space-y-3.5">
      {items.map((item) => (
        <NavigationItem
          key={item.path}
          item={item}
          isActive={isActive(item.path)}
          onNavigate={onNavigate}
          isCollapsed={isCollapsed}
        />
      ))}
    </ul>
  </nav>
);

//
// Sidebar
//
const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onClose,
  user,
  onLogout,
  isActive,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const topIndicatorRef = useRef<HTMLDivElement>(null);
  const bottomIndicatorRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (
      !scrollContainerRef.current ||
      !topIndicatorRef.current ||
      !bottomIndicatorRef.current
    )
      return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const scrollBottom = scrollHeight - clientHeight - scrollTop;

    // Show/hide top indicator
    if (scrollTop > 10) {
      topIndicatorRef.current.classList.add("opacity-100");
    } else {
      topIndicatorRef.current.classList.remove("opacity-100");
    }

    // Show/hide bottom indicator
    if (scrollBottom > 10) {
      bottomIndicatorRef.current.classList.add("opacity-100");
    } else {
      bottomIndicatorRef.current.classList.remove("opacity-100");
    }
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      // Initial check
      handleScroll();
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  return (
    <>
      <CollapseButton isCollapsed={isCollapsed} onToggle={onToggleCollapse} />
      <div
        className={`relative flex h-full flex-col bg-gray-800 text-slate-100 transition-all duration-300 ${
          isCollapsed ? "px-2" : "px-4"
        }`}
      >
        <div className="flex flex-col h-full pt-4 pb-4">
          <LogoSection isCollapsed={isCollapsed} />

          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 relative"
          >
            <div
              ref={topIndicatorRef}
              className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none opacity-0 transition-opacity duration-200"
            ></div>
            <div
              ref={bottomIndicatorRef}
              className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none opacity-0 transition-opacity duration-200"
            ></div>
            <NavigationSection
              items={NAVIGATION_ITEMS}
              isActive={isActive}
              onNavigate={onClose}
              isCollapsed={isCollapsed}
            />
          </div>

          <div className="mt-6 border-t border-white/20 pt-4">
            <UserMenu
              user={user}
              onLogout={onLogout}
              isCollapsed={isCollapsed}
              onNavigate={onClose}
            />
          </div>
        </div>
      </div>
    </>
  );
};

//
// MobileMenuButton
//
const MobileMenuButton: React.FC<{
  onOpen: () => void;
  onClose: () => void;
  isOpen: boolean;
}> = ({ onOpen, onClose, isOpen }) => (
  <div className="md:hidden bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-slate-200/50 dark:border-gray-700/50 px-3 py-2.5 shadow-sm">
    <div className="flex items-center justify-between">
      {isOpen ? (
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-300/80 dark:hover:bg-gray-700/80"
          aria-label="Close menu"
        >
          <XIcon className="w-5 h-5" />
        </button>
      ) : (
        <button
          onClick={onOpen}
          className="p-2 rounded-lg text-slate-800 dark:text-slate-200 hover:bg-slate-300/80 dark:hover:bg-gray-700/80"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 text-center">
        <span className="text-base font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
          Smart
          <span className="bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-500 bg-clip-text text-transparent">
            Spend
          </span>
        </span>
      </div>
      {/* Notification Bell for mobile - REMOVED to show only on Dashboard */}
      <div className="w-10 flex justify-end">
        {/* NotificationBell removed from here */}
      </div>
    </div>
  </div>
);

//
// ErrorMessage
//
const ErrorMessage: React.FC<{ message: string; onDismiss: () => void }> = ({
  message,
  onDismiss,
}) => {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-rose-500/90 px-4 py-2.5 text-sm text-white shadow-lg backdrop-blur-sm flex items-center">
      {message}
      <button
        onClick={onDismiss}
        className="ml-3 text-white/80 hover:text-white"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

//
// MAIN LAYOUT
//
const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebarCollapsed") === "true"
  );
  const { user, logout, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  const isActive = useCallback(
    (path: string) =>
      path === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(path),
    [location.pathname]
  );

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(isCollapsed));
  }, [isCollapsed]);

  const handleLogoutConfirm = useCallback(async () => {
    try {
      await logout();
      setShowLogoutConfirm(false);
    } catch {
      setError("Failed to sign out. Please try again.");
    }
  }, [logout]);

  return (
    <div className="h-screen flex overflow-hidden overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 font-sans">
      {/* Mobile Sidebar */}
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-50 md:hidden"
            initial="closed"
            animate="open"
            exit="closed"
            variants={ANIMATION_VARIANTS.overlay}
          >
            {/* Dim background (no blur on mobile for performance) */}
            <motion.div
              className="absolute inset-0 bg-slate-900/75 md:backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
              variants={ANIMATION_VARIANTS.overlay}
            />

            {/* Drawer */}
            <motion.aside
              className="absolute top-0 left-0 w-72 h-full shadow-xl will-change-transform"
              variants={ANIMATION_VARIANTS.sidebar}
            >
              {/* Inline close on mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden absolute right-3 top-3 p-2 rounded-lg text-slate-200 hover:bg-white/10"
                aria-label="Close menu"
              >
                <XIcon className="h-5 w-5" />
              </button>

              <Sidebar
                isCollapsed={false}
                onToggleCollapse={() => {}}
                onClose={() => setSidebarOpen(false)}
                user={user}
                onLogout={() => setShowLogoutConfirm(true)}
                isActive={isActive}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex md:flex-col shadow-xl relative transition-all duration-300 ${
          effectiveCollapsed ? "md:w-24" : "md:w-64"
        }`}
      >
        <Sidebar
          isCollapsed={effectiveCollapsed}
          onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
          onClose={() => {}}
          user={user}
          onLogout={() => setShowLogoutConfirm(true)}
          isActive={isActive}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileMenuButton
          onOpen={() => setSidebarOpen(true)}
          onClose={() => setSidebarOpen(false)}
          isOpen={sidebarOpen}
        />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8"
          role="main"
        >
          <Outlet />
        </main>
      </div>

      <LogoutConfirmModal
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        loading={authLoading}
      />

      {error && (
        <ErrorMessage message={error} onDismiss={() => setError(null)} />
      )}
    </div>
  );
};

export default DashboardLayout;
