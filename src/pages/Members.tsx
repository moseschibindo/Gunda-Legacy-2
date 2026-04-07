import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Phone, User as UserIcon, PieChart, Wallet, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Contribution } from '../types';
import { cn } from '../lib/utils';

const Members: React.FC = () => {
  const [members, setMembers] = useState<Profile[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  const SHARE_VALUE = 25; // 1 share = 25 KSh

  useEffect(() => {
    const fetchData = async () => {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      const { data: contributionsData, error: contributionsError } = await supabase
        .from('contributions')
        .select('*');

      if (!profilesError && profilesData) {
        setMembers(profilesData);
      }
      if (!contributionsError && contributionsData) {
        setContributions(contributionsData);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const groupTotal = contributions.reduce((acc, curr) => acc + curr.amount, 0);

  const getMemberStats = (userId: string) => {
    const userTotal = contributions
      .filter(c => c.user_id === userId)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const ownership = groupTotal > 0 ? (userTotal / groupTotal) * 100 : 0;
    const shares = userTotal / SHARE_VALUE;

    return { userTotal, ownership, shares };
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.phone.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-gray-900">Family Members</h2>

      <div className="relative">
        <input
          type="text"
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMembers.map((member) => {
          const { ownership, shares } = getMemberStats(member.id);
          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-[32px] border border-gray-100 shadow-sm space-y-4"
            >
              <div className="flex items-center space-x-4">
                <div 
                  onClick={() => member.profile_picture && setShowImageModal(member.profile_picture)}
                  className={cn(
                    "w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 overflow-hidden flex-shrink-0",
                    member.profile_picture && "cursor-pointer"
                  )}
                >
                  {member.profile_picture ? (
                    <img src={member.profile_picture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-600 font-bold text-2xl">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-gray-900 truncate text-lg">{member.name}</h4>
                    {member.role === 'admin' && (
                      <span className="text-[8px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Admin</span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-500 text-sm mt-0.5">
                    <Phone size={14} className="mr-1.5 text-emerald-500" />
                    <span>{member.phone}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-50">
                <div className="bg-emerald-50/50 p-3 rounded-2xl">
                  <div className="flex items-center text-emerald-600 mb-1">
                    <PieChart size={14} className="mr-1.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Ownership</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{ownership.toFixed(2)}%</p>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-2xl">
                  <div className="flex items-center text-blue-600 mb-1">
                    <Wallet size={14} className="mr-1.5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Shares</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{shares.toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 text-gray-400 italic">
          No members found
        </div>
      )}

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

export default Members;
