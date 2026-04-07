import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, UserPlus, Shield, ShieldAlert, Trash2, MoreVertical } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

export function MembersPage() {
  const { profile: currentUser } = useAuth();
  const [members, setMembers] = useState<Profile[]>([]);
  const [contributions, setContributions] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: contribs, error: contribsError } = await supabase
        .from('contributions')
        .select('user_id, amount');

      if (contribsError) throw contribsError;

      const totals = (contribs || []).reduce((acc, curr) => {
        acc[curr.user_id] = (acc[curr.user_id] || 0) + Number(curr.amount);
        return acc;
      }, {} as Record<string, number>);

      setMembers(profiles || []);
      setContributions(totals);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
    if (currentUser?.role !== 'admin') return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      fetchMembers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const handleSuspension = async (userId: string, isSuspended: boolean) => {
    if (currentUser?.role !== 'admin') return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: isSuspended })
        .eq('id', userId);

      if (error) throw error;
      fetchMembers();
    } catch (error) {
      console.error('Error updating suspension:', error);
    }
  };

  const filteredMembers = members.filter(m => 
    (m.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
    (m.phone || '').includes(search)
  );

  return (
    <div className="space-y-8 py-4">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Family Directory</h1>
          <p className="text-slate-500 font-medium mt-1">Manage and connect with family members</p>
        </div>
        
        <div className="relative group w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            type="text"
            placeholder="Search family..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-12 pr-4 text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm border border-slate-100 mx-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Member</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Savings</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                {currentUser?.role === 'admin' && (
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredMembers.map((member, index) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group hover:bg-slate-50/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-4">
                      <img
                        src={member.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || 'M')}&background=random`}
                        alt={member.name}
                        className="h-10 w-10 rounded-xl object-cover shadow-sm border border-white"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-sm font-black text-slate-900">{member.name || 'Anonymous'}</p>
                        <p className="text-[10px] font-medium text-slate-400">ID: {member.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-600">{member.phone}</p>
                    <p className="text-[10px] text-slate-400">{member.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                      member.role === 'admin' ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {member.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                      {member.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-blue-600">{formatCurrency(contributions[member.id] || 0)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        member.is_suspended ? "bg-red-500" : "bg-green-500"
                      )} />
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        member.is_suspended ? "text-red-500" : "text-green-600"
                      )}>
                        {member.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </div>
                  </td>
                  {currentUser?.role === 'admin' && (
                    <td className="px-6 py-4 text-right">
                      {currentUser.id !== member.id && (
                        <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleRoleChange(member.id, member.role === 'admin' ? 'member' : 'admin')}
                            className={cn(
                              "rounded-lg p-2 transition-all",
                              member.role === 'admin' 
                                ? "bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white" 
                                : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                            )}
                            title={member.role === 'admin' ? "Demote to Member" : "Promote to Admin"}
                          >
                            {member.role === 'admin' ? <ShieldAlert className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleSuspension(member.id, !member.is_suspended)}
                            className={cn(
                              "rounded-lg p-2 transition-all",
                              member.is_suspended 
                                ? "bg-green-50 text-green-600 hover:bg-green-600 hover:text-white" 
                                : "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                            )}
                            title={member.is_suspended ? "Unsuspend" : "Suspend"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
