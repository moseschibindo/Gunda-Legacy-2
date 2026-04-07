import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { TrendingUp, Wallet, Users, ArrowUpRight, Bell, ChevronRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useContributions } from '../hooks/useContributions';
import { useNotifications } from '../hooks/useNotifications';
import { useSettings } from '../hooks/useSettings';
import { formatCurrency, cn } from '../lib/utils';

export function Dashboard() {
  const { profile } = useAuth();
  const { totalSavings, userTotal } = useContributions(profile?.id);
  const { notifications } = useNotifications();
  const { settings } = useSettings();

  const ownershipPercentage = totalSavings > 0 ? (userTotal / totalSavings) * 100 : 0;

  const stats = [
    {
      label: 'Family Savings',
      value: formatCurrency(totalSavings),
      icon: Wallet,
      color: 'bg-blue-500',
    },
    {
      label: 'Your Contributions',
      value: formatCurrency(userTotal),
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      label: 'Ownership',
      value: `${ownershipPercentage.toFixed(1)}%`,
      icon: Users,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 text-white shadow-2xl sm:p-12"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <motion.span 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block rounded-full bg-blue-500/20 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-blue-400 backdrop-blur-md border border-blue-500/20"
            >
              Welcome Back
            </motion.span>
            <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Hello, <span className="text-blue-400">{profile?.name?.split(' ')[0] || 'Member'}</span>!
            </h1>
            <p className="mt-4 text-lg text-slate-400 font-medium leading-relaxed">
              {settings.app_slogan}
            </p>
          </div>
          
          <div className="mt-8 flex items-center space-x-6 md:mt-0">
            <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-5 shadow-xl shadow-blue-500/20">
              <TrendingUp className="h-full w-full text-white" />
            </div>
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Family Growth</p>
              <p className="text-3xl font-black text-white">+12.5%</p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-600 opacity-10 blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-indigo-500 opacity-10 blur-[100px]" />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:-translate-y-1"
          >
            <div className="flex items-center justify-between">
              <div className={cn('rounded-2xl p-4 text-white shadow-lg', stat.color)}>
                <stat.icon className="h-7 w-7" />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-400">{stat.label}</p>
                <p className="mt-1 text-3xl font-black text-slate-900">{stat.value}</p>
              </div>
            </div>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-slate-50">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '70%' }}
                transition={{ duration: 1, delay: 0.5 }}
                className={cn('h-full rounded-full', stat.color.replace('bg-', 'bg-'))}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Notifications Feed */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Latest Updates</h2>
            <Link 
              to="/notifications" 
              className="group flex items-center text-sm font-bold text-blue-600 transition-colors hover:text-blue-700"
            >
              View All 
              <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {notifications.length > 0 ? (
              notifications.slice(0, 4).map((notif, index) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="group rounded-3xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-md hover:border-blue-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Bell className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {new Date(notif.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{notif.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-slate-500 font-medium italic">No new updates at the moment.</p>
              </div>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 px-2">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4">
            <button className="group flex items-center space-x-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:border-blue-100">
              <div className="rounded-2xl bg-blue-50 p-4 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <ArrowUpRight className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="block text-lg font-bold text-slate-900">Add Savings</span>
                <span className="text-sm text-slate-400">Track your progress</span>
              </div>
            </button>
            
            <button className="group flex items-center space-x-4 rounded-3xl bg-white p-6 shadow-sm border border-slate-100 transition-all hover:shadow-xl hover:border-purple-100">
              <div className="rounded-2xl bg-purple-50 p-4 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="block text-lg font-bold text-slate-900">Invite Member</span>
                <span className="text-sm text-slate-400">Grow the legacy</span>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
