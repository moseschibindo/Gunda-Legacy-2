import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, DollarSign, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const BottomNav: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/members', icon: Users, label: 'Members' },
    { to: '/contributions', icon: DollarSign, label: 'Savings' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  if (isAdmin) {
    navItems.push({ to: '/admin', icon: ShieldCheck, label: 'Admin' });
  }

  return (
    <div className="flex justify-center z-40 md:hidden transition-colors duration-300">
      <nav className="w-full max-w-5xl bg-white dark:bg-[#111111] border-t border-gray-200 dark:border-gray-800 px-4 py-2 flex justify-around items-center pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center space-y-1 transition-colors duration-200",
              isActive ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            )
          }
        >
          <item.icon size={24} />
          <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
        </NavLink>
      ))}
      </nav>
    </div>
  );
};

export default BottomNav;
