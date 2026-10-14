import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Moon,
  Sun,
  Search,
  Bell,
  Check,
  Shield,
  Briefcase,
  GraduationCap
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function TopHeader({ onMenuClick, onSearchClick }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, role, switchRoleDev } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Generate breadcrumb text from pathname
  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return 'Overview';
    if (path.includes('/practice')) return 'Topic Practice';
    if (path.includes('/companies')) return 'Company Directory';
    if (path.includes('/tests/take')) return 'Assessment Session';
    if (path.includes('/tests/review')) return 'Attempt Review & Solutions';
    if (path.includes('/tests')) return 'Mock Tests';
    if (path.includes('/revision')) return 'Revision Centre';
    if (path.includes('/profile')) return 'Profile & Settings';
    if (path.includes('/coordinator/import')) return 'Spreadsheet Import';
    if (path.includes('/coordinator/questions')) return 'Question Bank';
    if (path.includes('/coordinator/history')) return 'Import History';
    if (path.includes('/admin/users')) return 'User Management';
    if (path.includes('/admin/audit-logs')) return 'Audit Logs';
    return 'Overview';
  };

  const handleRoleSwitch = (newRole) => {
    switchRoleDev(newRole);
    setShowRoleMenu(false);
    addToast({
      title: `Switched to ${newRole.toUpperCase()} mode`,
      message: `Now viewing ReadyUp as ${newRole}`,
      type: 'info'
    });
    if (newRole === 'coordinator') navigate('/coordinator/dashboard');
    else if (newRole === 'admin') navigate('/admin/dashboard');
    else navigate('/dashboard');
  };

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between px-4 sm:px-8 py-3.5">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden cursor-pointer"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
              ReadyUp
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600 mx-2 hidden sm:inline">/</span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white inline-block">
              {getBreadcrumb()}
            </h1>
          </div>
        </div>

        {/* Right Tools matching screenshot */}
        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Global Search Bar with Ctrl+K */}
          <button
            onClick={onSearchClick}
            className="hidden md:flex items-center gap-3 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search topics, companies...</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-500">
              ⌘K
            </kbd>
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((prev) => !prev)}
              className="p-2 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Notifications
                  </h4>
                  <span className="text-[11px] text-teal-600 font-medium">Mark all read</span>
                </div>
                <div className="space-y-3 pt-3">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">New TCS NQT Mock Test Added</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">T&P Cell uploaded 10 new quantitative questions.</p>
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Weekly Goal Reminder</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">1 mock test remaining to hit your 4-test weekly target.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher Pill (Dev / Pair-programming preview convenience) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu((prev) => !prev)}
              className="px-2.5 py-1 text-xs font-medium rounded-full border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Switch user role for live preview"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
              <span className="capitalize font-semibold">{role}</span>
              <span className="text-[10px] text-teal-600">▼</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-xl p-2 z-50">
                <p className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
                  Switch Active Role
                </p>
                <button
                  onClick={() => handleRoleSwitch('student')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    role === 'student' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-teal-600" />
                    <span>Student</span>
                  </div>
                  {role === 'student' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('coordinator')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    role === 'coordinator' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    <span>T&P Coordinator</span>
                  </div>
                  {role === 'coordinator' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left cursor-pointer transition-colors ${
                    role === 'admin' ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 font-semibold' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-sky-600" />
                    <span>Administrator</span>
                  </div>
                  {role === 'admin' && <Check className="w-3.5 h-3.5 text-teal-600" />}
                </button>
              </div>
            )}
          </div>

          {/* User Profile Avatar Pill matching screenshot (Teal circle with initials + Name + Role) */}
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2.5 pl-1.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-teal-100 dark:ring-teal-900 group-hover:ring-teal-400 transition-all">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AS'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight group-hover:text-teal-600 transition-colors">
                {user?.name || 'Aarav Sharma'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 capitalize leading-tight">
                {role === 'coordinator' ? 'Coordinator' : role === 'admin' ? 'Admin' : 'Student'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
