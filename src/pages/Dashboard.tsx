import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet, TrendingUp, History, Calendar, ArrowUpRight, AlertCircle, Users, PieChart, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Contribution } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, differenceInWeeks, addDays, startOfWeek } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
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
  });

  const BASE_DATE = new Date('2026-04-05T00:00:00Z'); // Sunday, April 5th, 2026

  const SHARE_VALUE = 25; // 1 share = 25 KSh

  const fetchData = async () => {
    if (!user) return;

    // Fetch all contributions for group stats and chart
    const { data: allData, error: allError } = await supabase
      .from('contributions')
      .select('*, profiles(name, profile_picture)')
      .order('date', { ascending: false });

    if (!allError && allData) {
      setAllContributions(allData);
      
      const groupTotal = allData.reduce((acc, curr) => acc + curr.amount, 0);
      const userData = allData.filter(c => c.user_id === user.id);
      setUserContributions(userData);
      
      const userTotal = userData.reduce((acc, curr) => acc + curr.amount, 0);
      const userCount = userData.length;
      const ownership = groupTotal > 0 ? (userTotal / groupTotal) * 100 : 0;
      const userShares = userTotal / SHARE_VALUE;
      const groupShares = groupTotal / SHARE_VALUE;
      
      // Calculate missed Sundays
      const joinDate = new Date(profile?.created_at || new Date());
      const now = new Date();
      let expectedSundays = 0;
      let tempDate = startOfWeek(joinDate, { weekStartsOn: 0 });
      
      while (tempDate <= now) {
        expectedSundays++;
        tempDate = new Date(tempDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
      
      const missed = Math.max(0, expectedSundays - userCount);
      
      setStats({ 
        userTotal, 
        groupTotal, 
        ownership, 
        userCount, 
        missed,
        userShares,
        groupShares
      });
    }
    setLoading(false);
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

  // Weekly chart data starting from BASE_DATE
  const getWeeklyChartData = () => {
    const weeklyData: Record<string, number> = {};
    const now = new Date();
    const totalWeeks = Math.max(1, differenceInWeeks(now, BASE_DATE) + 1);

    // Initialize weeks
    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = addDays(BASE_DATE, i * 7);
      const label = `W${i + 1}`;
      weeklyData[label] = 0;
    }

    // Fill with data
    allContributions.forEach(c => {
      const d = new Date(c.date);
      if (d >= BASE_DATE) {
        const weekIdx = differenceInWeeks(d, BASE_DATE);
        const label = `W${weekIdx + 1}`;
        if (weeklyData[label] !== undefined) {
          weeklyData[label] += c.amount;
        }
      }
    });

    return Object.entries(weeklyData).map(([week, amount]) => ({ week, amount }));
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
    <div className="p-4 space-y-6 pb-24">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hello, {profile?.name?.split(' ')[0]}!</h2>
          <p className="text-gray-500 text-sm">Real-time Gunda Legacy Dashboard</p>
        </div>
        <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
          <Calendar size={20} />
        </div>
      </motion.div>

      {/* Main Stats Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden"
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
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
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
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
      </motion.div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <History size={18} />
            </div>
            <span className="text-blue-600 font-bold text-lg">{stats.userCount}</span>
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Your Payments</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
              <AlertCircle size={18} />
            </div>
            <span className="text-orange-600 font-bold text-lg">{stats.missed}</span>
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Missed Sundays</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-50 p-2 rounded-lg text-purple-600">
              <Users size={18} />
            </div>
            <span className="text-purple-600 font-bold text-lg">{allContributions.length}</span>
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Family Records</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
              <TrendingUp size={18} />
            </div>
            <span className="text-emerald-600 font-bold text-lg">{chartData.length}</span>
          </div>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider">Weeks Active</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm h-full"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-gray-900 font-bold">Weekly Family Growth</h3>
            <div className="flex items-center text-emerald-600 text-[10px] font-bold uppercase">
              <TrendingUp size={12} className="mr-1" />
              From Week 1
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="week" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 'bold' }} 
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Total']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#059669' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Activity (Family Wide) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 h-full"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-gray-900 font-bold">Recent Family Activity</h3>
            <Users size={18} className="text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {allContributions.length > 0 ? (
              allContributions.slice(0, 5).map((c) => (
                <div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div 
                      onClick={() => (c.profiles as any)?.profile_picture && setShowImageModal((c.profiles as any).profile_picture)}
                      className={cn(
                        "w-10 h-10 rounded-full flex-shrink-0 overflow-hidden border border-gray-100",
                        (c.profiles as any)?.profile_picture ? "cursor-pointer" : "bg-gray-50 flex items-center justify-center text-gray-400"
                      )}
                    >
                      {(c.profiles as any)?.profile_picture ? (
                        <img src={(c.profiles as any).profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ArrowUpRight size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {c.user_id === user?.id ? 'You' : (c.profiles as any)?.name}
                      </p>
                      <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                        {format(new Date(c.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">{formatCurrency(c.amount)}</p>
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold uppercase">Verified</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400 italic">No activity recorded</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
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
