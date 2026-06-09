import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, TrendingUp, History, Calendar, ArrowUpRight, AlertCircle, Users, PieChart, X, Shield, Award, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { Contribution } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, differenceInWeeks, addDays, startOfWeek, differenceInCalendarWeeks } from 'date-fns';
import { calculateExpectedWeeks, calculateFullyPaidWeeks, calculateMissedWeeks, calculateCompletedWeeks, getWeekIndex } from '../lib/dateUtils';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const { settings } = useSettings();
  const chartContainerRef = React.useRef<HTMLDivElement>(null);
  const [userContributions, setUserContributions] = useState<Contribution[]>([]);
  const [allContributions, setAllContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [stats, setStats] = useState({
    userTotal: 0,
    groupTotal: 0,
    ownership: 0,
    userCount: 0,
    missed: 0,
    userShares: 0,
    groupShares: 0,
    recordsCount: 0,
    balance: 0,
    expectedWeeks: 0
  });

  const BASE_DATE = startOfWeek(new Date(settings.launch_date || '2026-04-06'), { weekStartsOn: 1 });
  const SHARE_VALUE = parseFloat(settings.share_value || '25');

  const fetchData = async (isRetry = false) => {
    if (!user) return;

    try {
      // Fetch all contributions for group stats and chart
      const { data: allData, error: allError } = await supabase
        .from('contributions')
        .select(`
          *,
          profiles:profile_id (
            name,
            profile_picture
          )
        `)
        .order('date', { ascending: false });

      if (allError) {
        if (!isRetry && (allError.code === 'PGRST303' || (allError.message && allError.message.includes('JWT expired')))) {
          console.warn('Dashboard: Session renewal triggered on PGRST303');
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (refreshData?.session) {
            await fetchData(true);
            return;
          }
        }
        throw allError;
      }

      if (allData) {
        setAllContributions(allData);
        
        const groupTotal = allData.reduce((acc, curr) => acc + curr.amount, 0);
        const userData = allData.filter(c => c.user_id === user.id || (c as any).profile_id === user.id);
        setUserContributions(userData);
        
        const userTotal = userData.reduce((acc, curr) => acc + curr.amount, 0);
        const userCount = userData.length;
        const ownership = groupTotal > 0 ? (userTotal / groupTotal) * 100 : 0;
        const userShares = userTotal / SHARE_VALUE;
        const groupShares = groupTotal / SHARE_VALUE;
        
        // Financial Health Logic (Matching Admin Summary)
        const weeklyRequired = parseFloat(settings.weekly_contribution || '50');
        const launchDateStr = settings.launch_date || '2026-04-06T00:00:00Z';
        const expectedWeeks = calculateExpectedWeeks(launchDateStr);
        const completedWeeks = calculateCompletedWeeks(launchDateStr);
        
        const fullyPaidWeeks = calculateFullyPaidWeeks(userData, launchDateStr, weeklyRequired);
        const missed = calculateMissedWeeks(userData, launchDateStr);

        const targetSavings = expectedWeeks * weeklyRequired;
        const balance = Math.max(0, targetSavings - userTotal);
        
        setStats({ 
          userTotal, 
          groupTotal, 
          ownership, 
          userCount, 
          missed,
          userShares,
          groupShares,
          recordsCount: userData.length,
          balance,
          expectedWeeks
        });
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      // We don't throw here to avoid crashing the UI, just leave data empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to all contribution changes for real-time group updates
    const channel = supabase
      .channel('dashboard-group-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile]);

  // Auto-scroll the chart to the far right after loading data
  useEffect(() => {
    if (!loading && chartContainerRef.current) {
      chartContainerRef.current.scrollLeft = chartContainerRef.current.scrollWidth;
    }
  }, [loading, allContributions]);

  // Weekly chart data starting from the earliest contribution
  const getWeeklyChartData = () => {
    if (allContributions.length === 0) return [];
    
    const dates = allContributions.map(c => new Date(c.date).getTime());
    const minTime = Math.min(...dates, BASE_DATE.getTime());
    const maxTime = Math.max(...dates, new Date().getTime());
    
    const startDate = BASE_DATE;
    const endDate = new Date(maxTime);
    
    const weeklyData: Record<string, { amount: number; dateRange: string }> = {};
    const totalWeeks = Math.max(1, differenceInCalendarWeeks(endDate, startDate, { weekStartsOn: 1 }) + 1);

    for (let i = 0; i < totalWeeks; i++) {
        const weekStart = addDays(startDate, i * 7);
        const weekEnd = addDays(weekStart, 6);
        const label = `W${i + 1}`;
        weeklyData[label] = { 
            amount: 0, 
            dateRange: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}` 
        };
    }

    allContributions.forEach(c => {
      const d = new Date(c.date);
      const weekIdx = differenceInCalendarWeeks(d, startDate, { weekStartsOn: 1 });
      if (weekIdx >= 0) {
        const label = `W${weekIdx + 1}`;
        if (weeklyData[label] !== undefined) {
          weeklyData[label].amount += c.amount;
        }
      }
    });

    return Object.entries(weeklyData).map(([week, data]) => ({ 
        week, 
        amount: data.amount,
        dateRange: data.dateRange
    }));
  };

  const chartData = getWeeklyChartData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24 transition-colors duration-300">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hello, {profile?.name?.split(' ')[0] || 'User'}!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Real-time {settings.app_name} Dashboard</p>
        </div>
        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
          <Calendar size={20} />
        </div>
      </motion.div>

      {allContributions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-3xl p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="bg-amber-100 dark:bg-amber-900/40 p-3 rounded-2xl text-amber-600 dark:text-amber-400">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 dark:text-amber-200">No data found in your database</h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                It looks like your database is empty. You can quickly get started by seeding sample data in the Admin panel.
              </p>
              <button 
                onClick={() => (window as any).location.href = '/admin'}
                className="mt-4 px-6 py-2 bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 transition-all active:scale-95"
              >
                Go to Admin Panel
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Stats Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-600 dark:bg-emerald-700 rounded-3xl p-6 text-white shadow-md relative overflow-hidden gpu"
      >
        <div className="relative z-10 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Your Total Savings</p>
              <h3 className="text-4xl font-bold mt-1">{formatCurrency(stats.userTotal)}</h3>
              <div className="flex items-center mt-2 text-emerald-100 text-[10px] font-bold uppercase tracking-widest bg-white/10 w-fit px-2 py-1 rounded-lg">
                <PieChart size={12} className="mr-1" />
                {stats.userShares.toFixed(2)} Shares
              </div>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl">
              <Wallet size={24} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Group Total</p>
              <p className="text-xl font-bold">{formatCurrency(stats.groupTotal)}</p>
              <p className="text-emerald-200 text-[9px] font-medium">{stats.groupShares.toFixed(2)} Total Shares</p>
            </div>
            <div className="text-right">
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Ownership</p>
              <p className="text-xl font-bold">{stats.ownership.toFixed(2)}%</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-xl" />
      </motion.div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <PieChart size={18} />
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-bold text-lg">{stats.userShares.toFixed(2)}</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Your Shares</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-orange-50 dark:bg-orange-900/30 p-2 rounded-lg text-orange-600 dark:text-orange-400">
              <AlertCircle size={18} />
            </div>
            <span className="text-orange-600 dark:text-orange-400 font-bold text-lg">{stats.missed}</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Missed Weeks</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
              <History size={18} />
            </div>
            <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">{stats.recordsCount}</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Contribution Records</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Wallet size={18} />
            </div>
            <span className={cn(
              "font-bold text-lg",
              stats.balance > 0 ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {stats.balance > 0 ? formatCurrency(stats.balance) : 'OK'}
            </span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Balance Status</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm h-full transition-colors duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-900 dark:text-white font-bold">Weekly Family Growth</h3>
            <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">
              <TrendingUp size={12} className="mr-1" />
              From Week 1
            </div>
          </div>
          <div className="h-48 w-full overflow-x-auto no-scrollbar smooth-scroll gpu" ref={chartContainerRef}>
            <div style={{ minWidth: `${Math.max(100, chartData.length * 60)}px`, height: '100%', position: 'relative' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#333' : '#f3f4f6'} />
                  <XAxis 
                    dataKey="week" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 185, 129, 0.05)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 transition-colors duration-300">
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                              {payload[0].payload.dateRange}
                            </p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {formatCurrency(payload[0].value as number)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="amount" 
                    radius={[6, 6, 0, 0]} 
                    isAnimationActive={false}
                  >
                    {chartData.map((_entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === chartData.length - 1 ? "#059669" : "#10b981"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Group Achievement Hub */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 h-full"
        >
          {/* Milestone Card */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300 gpu">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-bold">Group Savings Goal</h3>
              <Target size={18} className="text-emerald-500" />
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Global Progress</p>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                    {formatCurrency(stats.groupTotal)} / {formatCurrency(100000)}
                  </span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stats.groupTotal / 100000) * 100)}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="bg-emerald-500 p-2 rounded-xl text-white">
                  <Award size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-tight">Active Milestone</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Road to First 100K KSh Saved!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reliability Guard (Leaderboard) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 dark:text-white font-bold">Reliability Guard</h3>
              <div className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <p className="text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">Top Savers</p>
              </div>
            </div>

            <div className="space-y-3">
              {(() => {
                const userTotals = allContributions.reduce((acc, curr) => {
                  const pId = (curr as any).profile_id || curr.user_id;
                  acc[pId] = (acc[pId] || 0) + curr.amount;
                  return acc;
                }, {} as Record<string, number>);

                const leaderboard = Object.entries(userTotals)
                  .map(([id, amount]) => {
                    const match = allContributions.find(c => ((c as any).profile_id || c.user_id) === id);
                    return {
                      id,
                      amount: amount as number,
                      name: (match?.profiles as any)?.name || 'Member',
                      avatar: (match?.profiles as any)?.profile_picture as string | undefined
                    };
                  })
                  .sort((a, b) => (b.amount as number) - (a.amount as number))
                  .slice(0, 5);

                return leaderboard.length > 0 ? (
                  leaderboard.map((m, idx) => (
                    <div key={m.id} className="bg-white dark:bg-[#1a1a1a] p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm transition-colors duration-300 group hover:border-emerald-200 dark:hover:border-emerald-900/50">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className={cn(
                            "w-10 h-10 rounded-full overflow-hidden border-2",
                            idx === 0 ? "border-amber-400" : idx === 1 ? "border-gray-300" : idx === 2 ? "border-orange-400" : "border-gray-100 dark:border-gray-800"
                          )}>
                            {m.avatar ? (
                              <img src={m.avatar} alt={m.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                <Users size={16} />
                              </div>
                            )}
                          </div>
                          <div className={cn(
                            "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 border-white dark:border-[#1a1a1a]",
                            idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-gray-300" : idx === 2 ? "bg-orange-400" : "bg-emerald-500"
                          )}>
                            {idx + 1}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 dark:text-white truncate text-sm">{m.name}</p>
                          <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                            {(((m.amount as number) / (stats.groupTotal || 1)) * 100).toFixed(1)}% Share
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-gray-900 dark:text-white text-sm">{formatCurrency(m.amount as number)}</p>
                        <p className="text-[8px] text-gray-400 uppercase font-bold tracking-tighter">Contribution</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500 italic text-sm">Waiting for first records...</div>
                );
              })()}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative max-w-full max-h-full"
          >
            <img src={showImageModal} alt="Full View" className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl" />
            <button 
              onClick={() => setShowImageModal(null)}
              className="absolute -top-12 right-0 text-white hover:text-emerald-400 transition-colors"
            >
              <X size={32} />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
