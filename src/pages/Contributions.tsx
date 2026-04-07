import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, DollarSign, Calendar, ArrowUpRight, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Contribution } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, differenceInWeeks, startOfWeek, addDays } from 'date-fns';

const Contributions: React.FC = () => {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent' | 'large'>('all');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const BASE_DATE = new Date('2026-04-06T00:00:00Z'); // Monday, April 6th, 2026

  useEffect(() => {
    const fetchContributions = async () => {
      const { data, error } = await supabase
        .from('contributions')
        .select('*, profiles(*)')
        .order('date', { ascending: false });
      
      if (!error && data) {
        setContributions(data);
        // Expand the most recent week by default
        if (data.length > 0) {
          const firstWeek = getWeekKey(new Date(data[0].date));
          setExpandedWeeks({ [firstWeek]: true });
        }
      }
      setLoading(false);
    };

    fetchContributions();
  }, []);

  const getWeekKey = (date: Date) => {
    const d = new Date(date);
    
    // Everything before Monday, April 6th is Week 1
    if (d < BASE_DATE) {
      return 'Week 1: Launch - Apr 5, 2026';
    }
    
    const weeksDiff = differenceInWeeks(d, BASE_DATE);
    const weekNum = weeksDiff + 2; // New flow starts from Week 2
    const weekStart = addDays(BASE_DATE, weeksDiff * 7);
    const weekEnd = addDays(weekStart, 6);
    
    return `Week ${weekNum}: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  const filteredContributions = contributions.filter(c => {
    const matchesSearch = c.profiles?.name.toLowerCase().includes(search.toLowerCase()) || 
                         c.description.toLowerCase().includes(search.toLowerCase());
    
    if (filter === 'large') return matchesSearch && c.amount >= 1000;
    if (filter === 'recent') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return matchesSearch && new Date(c.date) >= weekAgo;
    }
    return matchesSearch;
  });

  // Group by week
  const groupedContributions = filteredContributions.reduce((acc, curr) => {
    const key = getWeekKey(new Date(curr.date));
    if (!acc[key]) acc[key] = [];
    acc[key].push(curr);
    return acc;
  }, {} as Record<string, Contribution[]>);

  const toggleWeek = (week: string) => {
    setExpandedWeeks(prev => ({ ...prev, [week]: !prev[week] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-gray-900">Savings History</h2>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by member or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl">
          {(['all', 'recent', 'large'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl transition-all capitalize",
                filter === f ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {Object.keys(groupedContributions).length > 0 ? (
          (Object.entries(groupedContributions) as [string, Contribution[]][]).map(([week, items]) => (
            <div key={week} className="space-y-3">
              <button 
                onClick={() => toggleWeek(week)}
                className="flex items-center justify-between w-full px-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{week}</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                    {formatCurrency(items.reduce((acc, curr) => acc + curr.amount, 0))}
                  </span>
                  <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-bold">
                    {items.length} {items.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                {expandedWeeks[week] ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {expandedWeeks[week] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                          <DollarSign size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 truncate max-w-[150px]">{c.profiles?.name}</h4>
                          <div className="flex items-center text-gray-500 text-xs mt-0.5">
                            <Calendar size={12} className="mr-1" />
                            <span>{format(new Date(c.date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatCurrency(c.amount)}</p>
                        <div className="flex items-center justify-end text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">
                          <ArrowUpRight size={10} className="mr-0.5" />
                          <span>Success</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-400 italic">
            No records found
          </div>
        )}
      </div>
    </div>
  );
};

export default Contributions;
