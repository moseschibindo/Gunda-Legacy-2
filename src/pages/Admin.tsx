import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, DollarSign, Settings, Plus, Trash2, Shield, ShieldAlert, UserMinus, Loader2, Search, Filter, X, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Profile, Contribution } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

const Admin: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const { profile: currentProfile, user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'contributions' | 'settings'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // Modals
  const [showAddContribution, setShowAddContribution] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [amount, setAmount] = useState('50');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [showImageModal, setShowImageModal] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: usersData } = await supabase.from('profiles').select('*').order('name');
    const { data: contribsData } = await supabase.from('contributions').select('*, profiles(*)').order('date', { ascending: false });
    
    if (usersData) setUsers(usersData);
    if (contribsData) setContributions(contribsData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Close menu when clicking outside
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const { error } = await supabase.from('contributions').insert([{
      user_id: selectedUser.id,
      amount: parseFloat(amount),
      date: new Date(date).toISOString(),
      description: 'Weekly Contribution'
    }]);

    if (!error) {
      setShowAddContribution(false);
      fetchData();
    }
  };

  const adminAction = async (endpoint: string, body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Action failed');
    return data;
  };

  const toggleUserSuspension = async (user: Profile) => {
    setLoading(true);
    try {
      await adminAction('/api/admin/update-user', {
        userId: user.id,
        updates: { is_suspended: !user.is_suspended }
      });
      fetchData();
    } catch (err: any) {
      setAlertModal({ title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleUserRole = async (user: Profile) => {
    if (user.id === currentProfile?.id) {
      setAlertModal({
        title: "Action Restricted",
        message: "You cannot demote yourself. Another admin must do this."
      });
      return;
    }
    setLoading(true);
    try {
      const newRole = user.role === 'admin' ? 'member' : 'admin';
      await adminAction('/api/admin/update-user', {
        userId: user.id,
        updates: { role: newRole }
      });
      fetchData();
    } catch (err: any) {
      setAlertModal({ title: 'Error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (user: Profile) => {
    if (user.id === currentProfile?.id) {
      setAlertModal({
        title: "Action Restricted",
        message: "You cannot delete your own account from the admin panel."
      });
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member',
      message: `Are you sure you want to delete ${user.name}? This will remove their profile, all their contribution records, and their login account. This action cannot be undone.`,
      isDanger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          await adminAction('/api/admin/delete-user', { userId: user.id });
          fetchData();
        } catch (error: any) {
          console.error('Error deleting user:', error);
          setAlertModal({
            title: "Error",
            message: error.message || "Failed to delete user."
          });
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase.from('settings').upsert({ key, value });
    if (!error) refreshSettings();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setLogoUploading(true);
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `app-logo-${Math.random()}.${fileExt}`;
    const filePath = `logos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(filePath, file);

    if (uploadError) {
      setAlertModal({
        title: "Upload Failed",
        message: uploadError.message
      });
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      await updateSetting('app_logo', publicUrl);
    }
    setLogoUploading(false);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.phone.includes(search)
  );

  return (
    <div className="p-4 space-y-6 pb-24 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl text-emerald-600 dark:text-emerald-400">
          <Shield size={20} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl transition-colors duration-300">
        {(['users', 'contributions', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-xl transition-all capitalize",
              activeTab === tab ? "bg-white dark:bg-[#1a1a1a] text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-gray-500 dark:text-gray-400"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm text-gray-900 dark:text-white transition-colors duration-300"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredUsers.map((u) => (
              <motion.div
                key={u.id}
                layout
                className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      onClick={() => u.profile_picture && setShowImageModal(u.profile_picture)}
                      className={cn(
                        "w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 overflow-hidden",
                        u.profile_picture && "cursor-pointer"
                      )}
                    >
                      {u.profile_picture ? (
                        <img src={u.profile_picture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                          {u.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{u.name}</h4>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{u.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setShowAddContribution(true);
                      }}
                      className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl"
                    >
                      <Plus size={18} />
                    </button>
                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenu(activeMenu === u.id ? null : u.id);
                        }}
                        className={cn(
                          "p-2 rounded-xl transition-colors",
                          activeMenu === u.id ? "bg-emerald-600 dark:bg-emerald-700 text-white" : "bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400"
                        )}
                      >
                        <Settings size={18} />
                      </button>
                      <div className={cn(
                        "absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-20 p-2 transition-all transform origin-top-right",
                        activeMenu === u.id ? "scale-100 opacity-100 visible" : "scale-95 opacity-0 invisible"
                      )}>
                        <button
                          onClick={() => toggleUserRole(u)}
                          className="w-full flex items-center space-x-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300"
                        >
                          {u.role === 'admin' ? <UserMinus size={16} /> : <ShieldAlert size={16} />}
                          <span>{u.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}</span>
                        </button>
                        <button
                          onClick={() => toggleUserSuspension(u)}
                          className="w-full flex items-center space-x-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300"
                        >
                          <ShieldAlert size={16} />
                          <span>{u.is_suspended ? 'Unsuspend' : 'Suspend'}</span>
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
                        <button
                          onClick={() => deleteUser(u)}
                          className="w-full flex items-center space-x-2 p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={16} />
                          <span>Delete Member</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contributions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 dark:text-white">All Records</h3>
            <button className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center">
              <Filter size={16} className="mr-1" /> Filter
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contributions.map((c) => (
              <div key={c.id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors duration-300">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">{c.profiles?.name}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{format(new Date(c.date), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.amount)}</p>
                  <button 
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'Delete Record',
                        message: 'Are you sure you want to delete this contribution record? This action cannot be undone.',
                        isDanger: true,
                        onConfirm: async () => {
                          await supabase.from('contributions').delete().eq('id', c.id);
                          fetchData();
                        }
                      });
                    }}
                    className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 transition-colors duration-300">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
              <Settings size={18} className="mr-2 text-emerald-600 dark:text-emerald-400" /> App Branding
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="w-20 h-20 rounded-2xl bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden relative group">
                  {logoUploading ? (
                    <Loader2 className="animate-spin text-emerald-600 dark:text-emerald-400" size={24} />
                  ) : settings.app_logo ? (
                    <img src={settings.app_logo} alt="App Logo" className="w-full h-full object-contain" />
                  ) : (
                    <Plus size={24} className="text-gray-300 dark:text-gray-600" />
                  )}
                  <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <Plus className="text-white" size={24} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={logoUploading} />
                  </label>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">App Logo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upload a logo to represent {settings.app_name} across the application.</p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">App Name</label>
                <input
                  type="text"
                  defaultValue={settings.app_name}
                  onBlur={(e) => updateSetting('app_name', e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Slogan</label>
                <input
                  type="text"
                  defaultValue={settings.app_slogan}
                  onBlur={(e) => updateSetting('app_slogan', e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Cost Per Share (KSh)</label>
                <input
                  type="number"
                  defaultValue={settings.share_value}
                  onBlur={(e) => updateSetting('share_value', e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Launch Date (For Week 1 Root)</label>
                <input
                  type="date"
                  defaultValue={settings.launch_date}
                  onBlur={(e) => updateSetting('launch_date', e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showAddContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Contribution</h3>
              <button onClick={() => setShowAddContribution(false)} className="text-gray-400 dark:text-gray-500">
                <X size={24} />
              </button>
            </div>
            <div className="mb-6 flex items-center space-x-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold">
                {selectedUser?.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">{selectedUser?.name}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{selectedUser?.phone}</p>
              </div>
            </div>
            <form onSubmit={handleAddContribution} className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (KSh)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-2xl font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                  />
                  <Calendar className="absolute right-3 top-3 text-gray-400 dark:text-gray-500 pointer-events-none" size={20} />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-emerald-600 dark:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none mt-4"
              >
                Record Payment
              </button>
            </form>
          </motion.div>
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

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
      />

      {/* Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#1a1a1a] w-full max-w-sm rounded-[32px] p-8 shadow-2xl relative text-center transition-colors duration-300"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{alertModal.title}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{alertModal.message}</p>
            <button
              onClick={() => setAlertModal(null)}
              className="w-full py-4 bg-emerald-600 dark:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-all active:scale-[0.98]"
            >
              Okay
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Admin;
