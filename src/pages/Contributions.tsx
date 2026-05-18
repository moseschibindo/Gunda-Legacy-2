import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, DollarSign, Calendar, ArrowUpRight, Filter, X, ChevronDown, ChevronUp, Download, FileText, Loader2, Trophy, Star, Zap, TrendingUp, CheckCircle, Target, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Contribution } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, addDays, startOfWeek, differenceInCalendarWeeks } from 'date-fns';
import { useSettings } from '../context/SettingsContext';
import { calculateExpectedWeeks, calculateFullyPaidWeeks, calculateMissedWeeks } from '../lib/dateUtils';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';

const Contributions: React.FC = () => {
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'recent' | 'summary'>('all');
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const BASE_DATE = startOfWeek(new Date(settings.launch_date || '2026-04-06'), { weekStartsOn: 1 });

  useEffect(() => {
    const fetchContributions = async () => {
      try {
        const { data, error } = await supabase
          .from('contributions')
          .select(`
            *,
            profiles:profile_id (
              name,
              profile_picture
            )
          `)
          .order('date', { ascending: false });
        
        if (!error && data) {
          setContributions(data);
          // Expand the most recent week by default
          if (data.length > 0) {
            const firstWeek = getWeekKey(new Date(data[0].date));
            setExpandedWeeks({ [firstWeek]: true });
          }
        } else if (error) {
          console.error('Error fetching contributions:', error);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchContributions();
  }, [settings.launch_date]); // Add settings.launch_date as dependency if it changes

  const getWeekKey = (date: Date) => {
    const d = new Date(date);
    const weekIdx = Math.max(0, differenceInCalendarWeeks(d, BASE_DATE, { weekStartsOn: 1 }));
    const weekNum = weekIdx + 1;
    const weekStart = addDays(BASE_DATE, weekIdx * 7);
    const weekEnd = addDays(weekStart, 6);
    
    return `Week ${weekNum}: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
  };

  const filteredContributions = contributions.filter(c => {
    const matchesSearch = (c.profiles?.name?.toLowerCase().includes(search.toLowerCase()) || false) || 
                         (c.description?.toLowerCase().includes(search.toLowerCase()) || false);
    
    if (filter === 'summary') return matchesSearch; // We filter further for the summary view
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

  const downloadPDF = async () => {
    if (contributions.length === 0) return;
    setDownloading(true);

    try {
      const doc = new jsPDF() as any;
      const primaryColor: [number, number, number] = [16, 185, 129]; // emerald-500
      
      // Header Background
      doc.setFillColor( primaryColor[0], primaryColor[1], primaryColor[2] );
      doc.rect(0, 0, 210, 40, 'F');
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text(settings.app_name || 'Progress Hub Tetu', 20, 20);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(settings.app_slogan || 'Secure Your Future, Together', 20, 28);
      
      // Statement Info Box
      doc.setFillColor(249, 250, 251);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(20, 50, 170, 30, 3, 3, 'FD');
      
      doc.setTextColor(55, 65, 81);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SAVINGS STATEMENT', 25, 60);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(107, 114, 128);
      doc.text(`Printed On: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 25, 70);
      doc.text(`Generated By: ${profile?.name || user?.email || 'Authorized User'}`, 120, 70);
      
      // Table
      const tableData = filteredContributions.map(c => [
        c.profiles?.name || 'Unknown',
        format(new Date(c.date), 'MMM d, yyyy'),
        Number(c.amount).toLocaleString(),
        c.description || '-'
      ]);

      const tableOptions: any = {
        startY: 90,
        head: [['Member', 'Date', 'Amount (KSh)', 'Description']],
        body: tableData,
        headStyles: { 
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        styles: { 
            fontSize: 9,
            cellPadding: 4,
            valign: 'middle'
        },
        columnStyles: {
            2: { halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 }
      };

      // Try multiple ways to call autoTable to be robust across different bundler behaviors
      if (typeof autoTable === 'function') {
        autoTable(doc, tableOptions);
      } else if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable(tableOptions);
      } else if (autoTable && typeof (autoTable as any).default === 'function') {
        (autoTable as any).default(doc, tableOptions);
      } else {
        throw new Error('PDF Table plugin not loaded correctly');
      }

      // Footer
      const finalY = (doc as any).lastAutoTable?.finalY || 90;
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(10);
      doc.text('Summary Statistics', 20, finalY + 15);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(55, 65, 81);
      doc.text(`Total Records: ${filteredContributions.length}`, 20, finalY + 22);
      doc.text(`Total Amount: KSh ${filteredContributions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}`, 20, finalY + 28);
      
      // Design Accent
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(1);
      doc.line(20, finalY + 35, 190, finalY + 35);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`${settings.app_name} | Confidence in collective growth`, 105, 285, { align: 'center' });

      doc.save(`${settings.app_name?.replace(/\s+/g, '_')}_Statement_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Savings History</h2>
        <button
          onClick={downloadPDF}
          disabled={downloading || contributions.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {downloading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          <span>Report</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by member or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-gray-900 dark:text-white transition-colors duration-300"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl transition-colors duration-300">
          {(['all', 'recent', 'summary'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl transition-all capitalize",
                filter === f ? "bg-white dark:bg-[#1a1a1a] text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {f === 'summary' ? 'My Summary' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filter === 'summary' ? (
          <div className="space-y-6">
            {profile ? (
              (() => {
                const userContribs = contributions.filter(c => c.profile_id === profile.id || c.user_id === user?.id);
                const totalPaid = userContribs.reduce((sum, c) => sum + c.amount, 0);
                const weeklyRequired = parseFloat(settings.weekly_contribution || '50');
                const launchDate = settings.launch_date || '2026-04-06';
                
                const expectedWeeks = calculateExpectedWeeks(launchDate);
                const fullyPaidWeeks = calculateFullyPaidWeeks(userContribs, launchDate, weeklyRequired);
                const missedWeeks = calculateMissedWeeks(userContribs, launchDate);
                const targetSavings = expectedWeeks * weeklyRequired;
                const balance = Math.max(0, targetSavings - totalPaid);
                const progress = Math.min(100, (totalPaid / targetSavings) * 100);

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Hero Congratulations */}
                    <div 
                      className="relative overflow-hidden bg-emerald-600 dark:bg-emerald-700 p-8 rounded-[2.5rem] text-white shadow-md gpu"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Trophy size={140} />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center space-x-2 bg-white/10 px-3 py-1 rounded-full w-fit mb-4">
                          <Star size={14} className="text-amber-300" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Outstanding Member</span>
                        </div>
                        <h3 className="text-3xl font-black italic tracking-tighter mb-2">Congratulations, {profile.name}!</h3>
                        <p className="text-emerald-50 text-sm font-medium opacity-90 max-w-[240px]">
                          You are making incredible progress towards your financial freedom. Keep up the consistency!
                        </p>
                      </div>
                      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 gpu">
                      <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm gpu">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                          <TrendingUp size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Savings</p>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(totalPaid)}</h4>
                      </div>
                      
                      <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm gpu">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                          <Zap size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Weeks Paid</p>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1">{fullyPaidWeeks} / {expectedWeeks}</h4>
                      </div>

                      <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm gpu">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
                          <Target size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Target Goal</p>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1">{formatCurrency(targetSavings)}</h4>
                      </div>

                      <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm gpu">
                        <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3">
                          <Award size={20} />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Progress</p>
                        <h4 className="text-xl font-black text-gray-900 dark:text-white mt-1">{progress.toFixed(0)}%</h4>
                      </div>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm gpu">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-gray-900 dark:text-white">Detailed Summary</h4>
                        <CheckCircle size={18} className="text-emerald-500" />
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800/50">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Arrears Balance</span>
                          <span className={cn("font-bold", balance > 0 ? "text-amber-500" : "text-emerald-500")}>
                            {formatCurrency(balance)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800/50">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Total Contribution Weeks</span>
                          <span className="font-bold text-gray-900 dark:text-white">{expectedWeeks} Weeks</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800/50">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Weeks Full Paid</span>
                          <span className="font-bold text-emerald-500">{fullyPaidWeeks} Weeks</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">Weeks Missed</span>
                          <span className={cn("font-bold", missedWeeks > 0 ? "text-red-500" : "text-emerald-500")}>
                            {missedWeeks} Weeks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm gpu">
                       <div className="flex justify-between items-center mb-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Savings Completion</p>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden gpu">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-4 text-center italic">"Consistency is the key to financial success. You are on track!"</p>
                    </div>
                  </motion.div>
                );
              })()
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">Loading your summary...</p>
              </div>
            )}
          </div>
        ) : Object.keys(groupedContributions).length > 0 ? (
          (Object.entries(groupedContributions) as [string, Contribution[]][]).map(([week, items]) => (
            <div key={week} className="space-y-3">
              <button 
                onClick={() => toggleWeek(week)}
                className="flex items-center justify-between w-full px-2"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{week}</h3>
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                    {formatCurrency(items.reduce((acc, curr) => acc + curr.amount, 0))}
                  </span>
                  <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-2 py-0.5 rounded-full font-bold">
                    {items.length} {items.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>
                {expandedWeeks[week] ? <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />}
              </button>

              {expandedWeeks[week] && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((c) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <DollarSign size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">{c.profiles?.name}</h4>
                          <div className="flex items-center text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                            <Calendar size={12} className="mr-1" />
                            <span>{format(new Date(c.date), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.amount)}</p>
                        <div className="flex items-center justify-end text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mt-1">
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
          <div className="text-center py-12 px-6 bg-white dark:bg-[#1a1a1a] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="bg-gray-50 dark:bg-gray-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-400">
              <FileText size={32} />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">No Savings Records</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
              There are no contribution records in the database. You can add them in the admin panel or seed sample data.
            </p>
            <button 
              onClick={() => (window as any).location.href = '/admin'}
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95"
            >
              Go to Admin Panel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contributions;
