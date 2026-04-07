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
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-40 pointer-events-none lg:hidden">
      <nav className="w-full max-w-5xl bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center pointer-events-auto pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center space-y-1 transition-colors duration-200",
              isActive ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
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
