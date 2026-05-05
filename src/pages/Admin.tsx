import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, DollarSign, Settings, Plus, Trash2, Shield, ShieldAlert, UserMinus, Loader2, Search, Filter, X, Calendar, Briefcase, Camera, Edit2, Info, Image as ImageIcon, CheckCircle2, Clock, PieChart, Phone, ArrowLeft, Mail, TrendingUp, AlertTriangle, Download, AlertCircle, ShieldCheck, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageUtils';
import { Profile, Contribution, Project, Media, ProjectStatus } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { calculateExpectedWeeks, calculateFullyPaidWeeks, calculateMissedWeeks, calculateCompletedWeeks, getWeekIndex } from '../lib/dateUtils';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const Admin: React.FC = () => {
  const { settings, refreshSettings } = useSettings();
  const { profile: currentProfile, user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'contributions' | 'projects' | 'gallery' | 'settings'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<Profile | null>(null);
  
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
  const [projectUploading, setProjectUploading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);

  // New Project State
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectPreview, setProjectPreview] = useState<string | null>(null);
  const [projectGallery, setProjectGallery] = useState<{file: File, preview: string}[]>([]);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    status: 'coming-soon' as ProjectStatus,
    date: new Date().toISOString().split('T')[0]
  });

  // New Media State
  const [showAddMedia, setShowAddMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [newMedia, setNewMedia] = useState({
    title: '',
    type: 'photo' as 'photo' | 'video'
  });
  const [editingMedia, setEditingMedia] = useState<Media | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<{file: File, preview: string}[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [isProjectGalleryOpen, setIsProjectGalleryOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshSettings]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: usersData } = await supabase.from('profiles').select('*').order('name');
      const { data: contributionsData } = await supabase.from('contributions').select(`
        *,
        profiles:profile_id (
          name,
          profile_picture
        )
      `).order('date', { ascending: false });
      const { data: projectsData } = await supabase.from('projects').select('*, images:project_images(*)').order('date', { ascending: false });
      const { data: mediaData } = await supabase.from('media').select('*').order('created_at', { ascending: false });
      
      setUsers(usersData || []);
      setContributions(contributionsData || []);
      setProjects(projectsData || []);
      setMedia(mediaData || []);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectPreview && projectGallery.length === 0) {
      alert("At least one project image is required.");
      return;
    }
    setProjectUploading(true);
    try {
      let bannerUrl = '';
      const bannerInput = document.getElementById('admin-project-image') as HTMLInputElement;
      let bannerFileToUpload: File | null = null;

      if (bannerInput?.files?.[0]) {
        bannerFileToUpload = bannerInput.files[0];
      } else if (projectGallery.length > 0) {
        bannerFileToUpload = projectGallery[0].file;
      }

      if (bannerFileToUpload) {
        const bannerFile = await compressImage(bannerFileToUpload as File) as File;
        const bannerPath = `projects/${Math.random()}.jpg`;
        await supabase.storage.from('profiles').upload(bannerPath, bannerFile);
        const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(bannerPath);
        bannerUrl = publicUrl;
      }

      const { data: project, error } = await supabase.from('projects').insert([{
        title: newProject.title,
        description: newProject.description,
        status: newProject.status,
        date: newProject.date,
        image_url: bannerUrl
      }]).select().single();

      if (error) throw error;
      if (!project) throw new Error("Could not create project record.");

      if (projectGallery.length > 0) {
        const imagePromises = projectGallery.map(async (item) => {
          try {
            const file = await compressImage(item.file as File) as File;
            const path = `projects/gallery/${Math.random()}.jpg`;
            await supabase.storage.from('profiles').upload(path, file);
            const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path);
            return { project_id: project.id, image_url: publicUrl };
          } catch (err) {
            console.error("Gallery upload error:", err);
            return null;
          }
        });
        const images = (await Promise.all(imagePromises)).filter(Boolean);
        if (images && images.length > 0) {
          // @ts-ignore
          await supabase.from('project_images').insert(images);
        }
      }

      setShowAddProject(false);
      setNewProject({ title: '', description: '', status: 'coming-soon', date: new Date().toISOString().split('T')[0] });
      setProjectGallery([]);
      setProjectPreview(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProjectUploading(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setProjectUploading(true);
    try {
      let bannerUrl = editingProject.image_url;
      const fileInput = document.getElementById('edit-project-image') as HTMLInputElement;
      if (fileInput.files?.[0]) {
        const bannerFile = await compressImage(fileInput.files[0]) as File;
        const bannerPath = `projects/${Math.random()}.jpg`;
        await supabase.storage.from('profiles').upload(bannerPath, bannerFile);
        const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(bannerPath);
        bannerUrl = publicUrl;
      }

      const { error } = await supabase.from('projects').update({
        title: newProject.title,
        description: newProject.description,
        status: newProject.status,
        date: newProject.date,
        image_url: bannerUrl
      }).eq('id', editingProject.id);

      if (error) throw error;
      setShowEditProjectModal(false);
      setEditingProject(null);
      setProjectPreview(null);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProjectUploading(false);
    }
  };

  const handleAddPhotosToProject = async (files: FileList) => {
    if (!editingProject) return;
    setProjectUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (f) => {
        const file = await compressImage(f) as File;
        const path = `projects/gallery/${Math.random()}.jpg`;
        await supabase.storage.from('profiles').upload(path, file);
        const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path);
        return { project_id: editingProject.id, image_url: publicUrl };
      });
      const images = await Promise.all(uploadPromises);
      await supabase.from('project_images').insert(images);
      
      const { data: updatedImages } = await supabase.from('project_images').select('*').eq('project_id', editingProject.id);
      if (updatedImages) setEditingProject({ ...editingProject, images: updatedImages });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProjectUploading(false);
    }
  };

  const handleDeleteProjectImage = async (imageId: string, imageUrl: string) => {
    if (!editingProject) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Delete Photo',
      message: 'Are you sure you want to permanently delete this photo from the project gallery? This action cannot be undone.',
      isDanger: true,
      onConfirm: async () => {
        try {
          // 1. Extract storage path from URL
          const urlParts = imageUrl.split('/profiles/');
          if (urlParts.length > 1) {
            const storagePath = urlParts[1];
            await supabase.storage.from('profiles').remove([storagePath]);
          }

          // 2. Delete from database
          const { error } = await supabase.from('project_images').delete().eq('id', imageId);
          if (error) throw error;

          // 3. Update local state and refresh
          const { data: updatedImages } = await supabase.from('project_images').select('*').eq('project_id', editingProject.id);
          setEditingProject({ ...editingProject, images: updatedImages || [] });
          fetchData();
        } catch (err: any) {
          console.error("Delete failed:", err);
          alert("Failed to delete image: " + err.message);
        }
      }
    });
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (galleryImages.length === 0) return;
    setMediaUploading(true);
    setMediaError(null);

    try {
      const uploadPromises = galleryImages.map(async (item) => {
        let file = item.file;
        file = await compressImage(file) as File;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Math.random()}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        return supabase.from('media').insert([{
          title: newMedia.title || file.name.split('.')[0],
          type: 'photo',
          image_url: publicUrl
        }]);
      });

      await Promise.all(uploadPromises);
      setShowAddMedia(false);
      setNewMedia({ title: '', type: 'photo' });
      setGalleryImages([]);
      fetchData();
    } catch (err: any) {
      setMediaError(err.message);
    } finally {
      setMediaUploading(false);
    }
  };

  const handleUpdateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMedia) return;
    setMediaUploading(true);
    setMediaError(null);

    const { error } = await supabase
      .from('media')
      .update({ title: editingMedia.title })
      .eq('id', editingMedia.id);

    if (!error) {
      setEditingMedia(null);
      fetchData();
    } else {
      setMediaError(error.message);
    }
    setMediaUploading(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setLogoUploading(true);
    try {
      const file = await compressImage(e.target.files[0]) as File;
      const path = `branding/${Math.random()}.jpg`;
      await supabase.storage.from('profiles').upload(path, file);
      const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path);
      await updateSetting('app_logo', publicUrl);
    } finally {
      setLogoUploading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase.from('settings').update({ value: value.toString() }).eq('key', key);
    if (!error) {
      refreshSettings();
    } else {
      console.error('Error updating setting:', error);
      alert('Failed to update setting: ' + error.message);
    }
  };

  const toggleUserRole = async (user: Profile) => {
    await supabase.from('profiles').update({ role: user.role === 'admin' ? 'member' : 'admin' }).eq('id', user.id);
    fetchData();
  };

  const toggleUserSuspension = async (user: Profile) => {
    await supabase.from('profiles').update({ is_suspended: !user.is_suspended }).eq('id', user.id);
    fetchData();
  };

  const deleteUser = async (user: Profile) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Member',
      message: `Are you sure you want to delete ${user.name}? This will permanently remove their profile and all histories.`,
      isDanger: true,
      onConfirm: async () => {
        await supabase.from('profiles').delete().eq('id', user.id);
        fetchData();
      }
    });
  };

  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || recordingPayment) return;
    
    setRecordingPayment(true);
    try {
      const { error } = await supabase.from('contributions').insert([{
        profile_id: selectedUser.id,
        user_id: selectedUser.id, // Set the owner as the user being recorded for
        amount: parseFloat(amount),
        date: date
      }]);

      if (error) throw error;

      setShowAddContribution(false);
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      fetchData();
    } catch (err: any) {
      alert("Error recording payment: " + err.message);
    } finally {
      setRecordingPayment(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.name?.toLowerCase().includes(search.toLowerCase()) || false) || 
    (u.phone?.includes(search) || false)
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
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl transition-colors duration-300 overflow-x-auto no-scrollbar">
        {(['users', 'contributions', 'projects', 'gallery', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap",
              activeTab === tab 
                ? "bg-white dark:bg-[#1a1a1a] text-emerald-600 dark:text-emerald-400 shadow-sm" 
                : "text-gray-500 dark:text-gray-400"
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
                onClick={() => setViewingUser(u)}
                className="bg-white dark:bg-[#1a1a1a] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300 cursor-pointer active:scale-[0.98]"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(u);
                        setAmount('50');
                        setDate(new Date().toISOString().split('T')[0]);
                        setShowAddContribution(true);
                      }}
                      className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl hover:scale-110 active:scale-95 transition-all"
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
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUserRole(u);
                          }}
                          className="w-full flex items-center space-x-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300"
                        >
                          {u.role === 'admin' ? <UserMinus size={16} /> : <ShieldAlert size={16} />}
                          <span>{u.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleUserSuspension(u);
                          }}
                          className="w-full flex items-center space-x-2 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300"
                        >
                          <ShieldAlert size={16} />
                          <span>{u.is_suspended ? 'Unsuspend' : 'Suspend'}</span>
                        </button>
                        <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteUser(u);
                          }}
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

      {activeTab === 'projects' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Project Management</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Total Initiatives: {projects.length}</p>
            </div>
            <button 
              onClick={() => setShowAddProject(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg shadow-emerald-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={14} className="mr-2" /> Launch Project
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="bg-white dark:bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm group">
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img src={p.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute top-4 left-4">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center backdrop-blur-md shadow-sm",
                      p.status === 'done' ? "bg-emerald-500 text-white" : p.status === 'coming-soon' ? "bg-amber-500 text-white" : "bg-blue-500 text-white"
                    )}>
                      {p.status === 'done' ? <CheckCircle2 size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                      {p.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 dark:text-white truncate pr-4">{p.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{format(new Date(p.date), 'MMM yyyy')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                        onClick={() => {
                          setEditingProject(p);
                          setIsProjectGalleryOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 py-3 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <ImageIcon size={14} />
                        <span>Photos</span>
                      </button>
                      <button 
                        onClick={() => {
                          setEditingProject(p);
                          setNewProject({
                            title: p.title,
                            description: p.description,
                            status: p.status,
                            date: p.date
                          });
                          setShowEditProjectModal(true);
                        }}
                        className="p-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors"
                      >
                        <Settings size={14} />
                      </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Delete Project',
                          message: `Are you sure you want to delete "${p.title}"? All associated gallery images will also be removed.`,
                          isDanger: true,
                          onConfirm: async () => {
                            await supabase.from('projects').delete().eq('id', p.id);
                            fetchData();
                          }
                        });
                      }}
                      className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Gallery Management</h3>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">Total Photos: {media.length}</p>
            </div>
            <button 
              onClick={() => setShowAddMedia(true)}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg shadow-emerald-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={14} className="mr-2" /> Add New Photo
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {media.map((m) => (
              <div key={m.id} className="bg-white dark:bg-[#1a1a1a] rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm group">
                <div className="aspect-video relative overflow-hidden">
                  <img src={m.image_url} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-5 flex flex-col space-y-3">
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white line-clamp-1">{m.title}</h4>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest mt-1">
                      Added: {format(new Date(m.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setEditingMedia(m)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                      <Edit2 size={14} />
                      <span>Edit Title</span>
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: 'Delete Photo',
                          message: 'Are you sure you want to permanently remove this photo from the gallery?',
                          isDanger: true,
                          onConfirm: async () => {
                            await supabase.from('media').delete().eq('id', m.id);
                            fetchData();
                          }
                        });
                      }}
                      className="p-3 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {media.length === 0 && (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-[40px] border-4 border-dashed border-gray-100 dark:border-gray-800">
              <Camera size={48} className="mx-auto text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-gray-400 dark:text-gray-500 font-medium italic tracking-wide">No photos added yet</p>
            </div>
          )}
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
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Weekly Required Contribution (KSh)</label>
                <input
                  type="number"
                  defaultValue={settings.weekly_contribution || '50'}
                  onBlur={(e) => updateSetting('weekly_contribution', e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Launch Date (For Week 1 Monday Root)</label>
                <input
                  type="date"
                  defaultValue={settings.launch_date}
                  onBlur={(e) => updateSetting('launch_date', e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-white/5">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                <Database size={18} className="mr-2 text-emerald-600 dark:text-emerald-400" /> App Setup
              </h3>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Seed Sample Data</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 mb-4">
                  Populate your database with sample members, contributions, and projects to explore the application features.
                </p>
                <button 
                  onClick={async () => {
                    if (!confirm("This will add sample records to your database. Continue?")) return;
                    setLoading(true);
                    try {
                      // 1. Add some initial settings if missing
                      const { data: settingsData } = await supabase.from('settings').select('key');
                      const keys = settingsData?.map(s => s.key) || [];
                      const settingsToUpsert = [
                        { key: 'app_name', value: 'Progress Hub Tetu' },
                        { key: 'app_slogan', value: 'Secure Your Future, Together' },
                        { key: 'share_value', value: '25' },
                        { key: 'weekly_contribution', value: '50' },
                        { key: 'launch_date', value: '2026-04-06' }
                      ];
                      
                      await supabase.from('settings').upsert(settingsToUpsert);

                      // 2. Add sample projects
                      const { data: existingProjects } = await supabase.from('projects').select('id').limit(1);
                      if (!existingProjects || existingProjects.length === 0) {
                        await supabase.from('projects').insert([
                          {
                            title: 'Community Borehole',
                            description: 'Providing clean water to 500+ households in Tetu village.',
                            image_url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&q=80',
                            status: 'done',
                            date: '2026-01-15'
                          },
                          {
                            title: 'Tetu Education Fund',
                            description: 'Supporting bright but needy students with secondary school fees.',
                            image_url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80',
                            status: 'coming-soon',
                            date: '2026-06-01'
                          }
                        ]);
                      }

                      // 3. Add sample media
                      const { data: existingMedia } = await supabase.from('media').select('id').limit(1);
                      if (!existingMedia || existingMedia.length === 0) {
                        await supabase.from('media').insert([
                          { title: 'Launch Meeting', image_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&q=80', type: 'photo' },
                          { title: 'Project Site Visit', image_url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80', type: 'photo' }
                        ]);
                      }

                      // 4. Add sample contributions for the current user if profile exists
                      if (authUser) {
                        const { data: existingContribs } = await supabase.from('contributions').select('id').limit(1);
                        if (!existingContribs || existingContribs.length === 0) {
                          const today = new Date();
                          const sampleContribs = [];
                          for (let i = 0; i < 5; i++) {
                            const date = new Date();
                            date.setDate(today.getDate() - (i * 7)); // Over the last 5 weeks
                            sampleContribs.push({
                              user_id: authUser.id,
                              profile_id: authUser.id,
                              amount: 50,
                              date: date.toISOString().split('T')[0],
                              description: `Sample Savings Week ${5-i}`
                            });
                          }
                          await supabase.from('contributions').insert(sampleContribs);
                        }
                      }

                      alert("Sample data seeded successfully! Refresh the page to see changes.");
                      fetchData();
                    } catch (err: any) {
                      alert("Error seeding data: " + err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-700 transition-colors"
                >
                  Seed Sample Data
                </button>
              </div>
            </div>
          </div>

          </div>
        )}

      {/* Add Project Modal */}
      <AnimatePresence>
        {showAddProject && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Launch New Project</h3>
                <button onClick={() => setShowAddProject(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddProject} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Primary Banner</label>
                       <div 
                         onClick={() => document.getElementById('admin-project-image')?.click()}
                         className="aspect-video bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-emerald-500/50"
                       >
                         {projectPreview ? (
                           <img src={projectPreview} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <div className="text-center">
                             <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm mb-3 mx-auto w-fit">
                               <Camera size={32} className="text-emerald-600" />
                             </div>
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Upload Banner</p>
                           </div>
                         )}
                         <input 
                           id="admin-project-image" 
                           type="file" 
                           className="hidden" 
                           accept="image/*" 
                           multiple
                           onChange={(e) => {
                             if (e.target.files && e.target.files.length > 0) {
                               const files = Array.from(e.target.files) as File[];
                               
                               // Set first as banner
                               const reader = new FileReader();
                               reader.onload = (ev) => setProjectPreview(ev.target?.result as string);
                               reader.readAsDataURL(files[0]);

                            // Add all to gallery
                            files.forEach((file: File) => {
                              const gReader = new FileReader();
                              gReader.onload = (ev) => {
                                setProjectGallery(prev => {
                                   if (prev.some(p => p.file.name === file.name && p.file.size === file.size)) return prev;
                                   return [...prev, { file, preview: ev.target?.result as string }];
                                });
                              };
                              gReader.readAsDataURL(file);
                            });
                             }
                           }} 
                         />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Project Gallery (Multiple Photos)</label>
                       <div className="grid grid-cols-3 gap-2">
                         {projectGallery.map((item, idx) => (
                           <div key={idx} className="aspect-square rounded-xl overflow-hidden relative group">
                             <img src={item.preview} alt="" className="w-full h-full object-cover" />
                             <button 
                               type="button"
                               onClick={() => setProjectGallery(projectGallery.filter((_, i) => i !== idx))}
                               className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                             >
                               <Trash2 size={16} />
                             </button>
                           </div>
                         ))}
                         <button 
                           type="button"
                           onClick={() => document.getElementById('admin-project-gallery')?.click()}
                           className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-600 transition-all"
                         >
                           <Plus size={20} />
                           <input 
                             id="admin-project-gallery" 
                             type="file" 
                             multiple 
                             className="hidden" 
                             accept="image/*"
                             onChange={(e) => {
                               if (e.target.files) {
                                 const files = Array.from(e.target.files) as File[];
                                 files.forEach(file => {
                                   const reader = new FileReader();
                                   reader.onload = (ev) => {
                                     setProjectGallery(prev => [...prev, { file, preview: ev.target?.result as string }]);
                                   };
                                   reader.readAsDataURL(file);
                                 });
                               }
                             }}
                           />
                         </button>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Title</label>
                      <input
                        type="text"
                        placeholder="Project Name"
                        required
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white placeholder:text-gray-300 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Impact Description</label>
                      <textarea
                        placeholder="Detail the community goals..."
                        required
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none h-40 text-gray-900 dark:text-white placeholder:text-gray-300 transition-all font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</label>
                         <select
                           value={newProject.status}
                           onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
                           className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white font-medium"
                         >
                           <option value="done">Done</option>
                           <option value="coming-soon">Coming Soon</option>
                           <option value="planned">Planned</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Launch Date</label>
                         <input
                           type="date"
                           value={newProject.date}
                           onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                           className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white font-medium"
                         />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={projectUploading}
                  className="w-full py-5 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {projectUploading ? <Loader2 className="animate-spin" size={24} /> : 'Save & Publish Project'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Project Info Modal */}
      <AnimatePresence>
        {showEditProjectModal && editingProject && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative max-h-[90vh] overflow-y-auto no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Edit Project: {editingProject.title}</h3>
                <button 
                  onClick={() => {
                    setShowEditProjectModal(false);
                    setEditingProject(null);
                  }} 
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateProject} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Update Banner (Optional)</label>
                       <div 
                         onClick={() => document.getElementById('edit-project-image')?.click()}
                         className="aspect-video bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center cursor-pointer overflow-hidden relative group transition-all hover:border-emerald-500/50"
                       >
                         {projectPreview ? (
                           <img src={projectPreview} alt="" className="w-full h-full object-cover" />
                         ) : (
                           <img src={editingProject.image_url} alt="" className="w-full h-full object-cover opacity-50" />
                         )}
                         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera className="text-white" size={32} />
                         </div>
                         <input 
                           id="edit-project-image" 
                           type="file" 
                           className="hidden" 
                           accept="image/*" 
                           onChange={(e) => {
                             if (e.target.files?.[0]) {
                               const reader = new FileReader();
                               reader.onload = (ev) => setProjectPreview(ev.target?.result as string);
                               reader.readAsDataURL(e.target.files[0]);
                             }
                           }}
                         />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Title</label>
                      <input
                        type="text"
                        required
                        value={newProject.title}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Description</label>
                      <textarea
                        required
                        value={newProject.description}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none h-40 text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</label>
                         <select
                           value={newProject.status}
                           onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
                           className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white font-medium"
                         >
                           <option value="done">Done</option>
                           <option value="coming-soon">Coming Soon</option>
                           <option value="planned">Planned</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Launch Date</label>
                         <input
                           type="date"
                           value={newProject.date}
                           onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                           className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white font-medium"
                         />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={projectUploading}
                  className="w-full py-5 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {projectUploading ? <Loader2 className="animate-spin" size={24} /> : 'Update Project Details'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Project Gallery Management Modal */}
      <AnimatePresence>
        {isProjectGalleryOpen && editingProject && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-2xl rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative max-h-[85vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">{editingProject.title}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Project Gallery Management</p>
                </div>
                <button onClick={() => setIsProjectGalleryOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pr-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Add New Trigger */}
                  <button 
                    onClick={() => document.getElementById('add-to-project-gallery')?.click()}
                    disabled={projectUploading}
                    className="aspect-square bg-emerald-50 dark:bg-emerald-900/10 rounded-3xl border-2 border-dashed border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-all group"
                  >
                    {projectUploading ? <Loader2 className="animate-spin" /> : (
                      <>
                        <Plus size={32} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase mt-2">Add Photo</span>
                      </>
                    )}
                    <input 
                      id="add-to-project-gallery" 
                      type="file" 
                      multiple 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => e.target.files && handleAddPhotosToProject(e.target.files)}
                    />
                  </button>

                  {/* Existing Images */}
                  <div className="aspect-square rounded-3xl overflow-hidden relative border border-gray-100 dark:border-gray-800 ring-4 ring-emerald-500/20">
                     <img src={editingProject.image_url} alt="" className="w-full h-full object-cover" />
                     <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-full">Banner</div>
                  </div>

                  {editingProject.images?.map((img) => (
                    <div key={img.id} className="aspect-square rounded-3xl overflow-hidden relative group border border-gray-100 dark:border-gray-800">
                       <img src={img.image_url} alt="" className="w-full h-full object-cover" />
                       <button 
                         type="button"
                         onClick={() => handleDeleteProjectImage(img.id, img.image_url)}
                         className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                       >
                         <Trash2 size={24} />
                       </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-50 dark:border-gray-800 flex justify-end">
                <button 
                  onClick={() => setIsProjectGalleryOpen(false)}
                  className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                >
                  Done Managing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Media Modal */}
      <AnimatePresence>
        {showAddMedia && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-y-auto max-h-[90vh] no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Add Gallery Photos</h3>
                <button onClick={() => {
                  setShowAddMedia(false);
                  setGalleryImages([]);
                }} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddMedia} className="space-y-8">
                {mediaError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl">
                    <p className="text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest">{mediaError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Select Files (Multiple allowed)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {galleryImages.map((item, idx) => (
                      <div key={idx} className="aspect-square rounded-2xl overflow-hidden relative group">
                        <img src={item.preview} alt="" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== idx))}
                          className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => document.getElementById('admin-multi-media-input')?.click()}
                      className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-600 transition-all group"
                    >
                      <Plus size={24} />
                      <span className="text-[8px] font-black uppercase mt-1">Add More</span>
                      <input 
                        id="admin-multi-media-input" 
                        type="file" 
                        multiple 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files) {
                            const files = Array.from(e.target.files) as File[];
                            files.forEach(file => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setGalleryImages(prev => [...prev, { file, preview: ev.target?.result as string }]);
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Common Title (Optional)</label>
                  <input
                    type="text"
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white placeholder:text-gray-300 font-medium"
                    placeholder="e.g., Community Meeting"
                  />
                </div>

                <button
                  type="submit"
                  disabled={mediaUploading || galleryImages.length === 0}
                  className="w-full py-5 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {mediaUploading ? <Loader2 className="animate-spin" size={24} /> : `Upload ${galleryImages.length} Photos`}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Media Modal */}
      <AnimatePresence>
        {editingMedia && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Edit Photo Title</h3>
                <button onClick={() => setEditingMedia(null)} className="text-gray-400"><X size={24} /></button>
              </div>

              <div className="mb-8 aspect-video rounded-3xl overflow-hidden bg-gray-50 dark:bg-gray-800">
                <img src={editingMedia.image_url} alt="" className="w-full h-full object-cover" />
              </div>

              <form onSubmit={handleUpdateMedia} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Update Title</label>
                  <input
                    type="text"
                    required
                    value={editingMedia.title}
                    onChange={(e) => setEditingMedia({ ...editingMedia, title: e.target.value })}
                    className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={mediaUploading}
                  className="w-full py-5 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {mediaUploading ? <Loader2 className="animate-spin" size={24} /> : 'Update Photo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                disabled={recordingPayment}
                className="w-full py-4 bg-emerald-600 dark:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
              >
                {recordingPayment ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                {recordingPayment ? 'Recording...' : 'Record Payment'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      {/* Full-Page User Summary Dashboard */}
      <AnimatePresence>
        {viewingUser && (() => {
          const userContributions = contributions.filter(c => (c as any).profile_id === viewingUser.id || c.user_id === viewingUser.id);
          const totalPaid = userContributions.reduce((sum, c) => sum + c.amount, 0);
          const shareValue = parseFloat(settings.share_value || '25');
          const weeklyRequired = parseFloat(settings.weekly_contribution || '50');
          const launchDate = settings.launch_date || '2024-01-01';
          
          const expectedWeeks = calculateExpectedWeeks(launchDate);
          const completedWeeks = calculateCompletedWeeks(launchDate);
          const fullyPaidWeeks = calculateFullyPaidWeeks(userContributions, launchDate, weeklyRequired);
          const missedWeeks = calculateMissedWeeks(userContributions, launchDate);
          const weeksMissed = missedWeeks;
          
          const targetSavings = expectedWeeks * weeklyRequired;
          const balance = Math.max(0, targetSavings - totalPaid);
          
          const progress = Math.min(100, (totalPaid / targetSavings) * 100);

          const handleDownloadPDF = () => {
            const doc = new jsPDF();
            doc.setFillColor(16, 185, 129);
            doc.rect(0, 0, 210, 45, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(26);
            doc.setFont('helvetica', 'bold');
            doc.text(settings.app_name || 'Progress Hub Tetu', 20, 26);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('OFFICIAL FINANCIAL STATEMENT', 20, 35);
            
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.text('MEMBER PROFILE', 20, 60);
            doc.setFont('helvetica', 'normal');
            doc.text(`Name: ${viewingUser.name}`, 20, 68);
            doc.text(`ID Reference: ${viewingUser.id.substring(0, 12).toUpperCase()}`, 20, 74);
            doc.text(`Generated On: ${format(new Date(), 'PPP')}`, 20, 80);

            autoTable(doc, {
              startY: 90,
              head: [['Metric', 'Value']],
              body: [
                ['Total Accumulated', formatCurrency(totalPaid)],
                ['Share Evaluation', (totalPaid / shareValue).toFixed(2)],
                ['Expected Savings', formatCurrency(targetSavings)],
                ['Current Balance', balance > 0 ? `DEBT: ${formatCurrency(balance)}` : 'CLEAR'],
                ['Health Index', `${progress.toFixed(2)}%`],
                ['Missed Windows', weeksMissed.toString()]
              ],
              theme: 'striped',
              headStyles: { fillColor: [31, 41, 55] }
            });

            doc.setFont('helvetica', 'bold');
            doc.text('TRANSACTION LEDGER', 20, (doc as any).lastAutoTable.finalY + 15);
            autoTable(doc, {
              startY: (doc as any).lastAutoTable.finalY + 20,
              head: [['Date', 'Description', 'Amount', 'Status']],
              body: userContributions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map(c => [
                  format(new Date(c.date), 'MMM d, yyyy'),
                  'Savings Deposit',
                  formatCurrency(c.amount),
                  'VERIFIED'
                ]),
              theme: 'grid',
              headStyles: { fillColor: [16, 185, 129] }
            });
            doc.save(`${viewingUser.name.replace(/\s+/g, '_')}_Statement.pdf`);
          };

          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute inset-0 z-10 bg-gray-50 dark:bg-[#050505] overflow-y-auto no-scrollbar pb-32"
            >
              {/* Top Navigation Bar */}
              <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-4 md:px-8 py-4 flex items-center justify-between">
                <button 
                  onClick={() => setViewingUser(null)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-all group"
                >
                  <ArrowLeft size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Exit Summary</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleDownloadPDF}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Download Report</span>
                    <span className="sm:hidden">Report</span>
                  </button>
                </div>
              </div>

              <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8 pb-40">
                {/* Profile Header */}
                <div className="bg-white dark:bg-[#0a0a0a] rounded-[40px] p-6 md:p-8 border border-gray-100 dark:border-white/5 shadow-sm flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    <div className="w-32 h-32 md:w-36 md:h-36 rounded-[40px] bg-emerald-50 dark:bg-emerald-900/10 p-1 ring-4 ring-emerald-500/10">
                      {viewingUser.profile_picture ? (
                        <img src={viewingUser.profile_picture} alt="" className="w-full h-full object-cover rounded-[36px]" />
                      ) : (
                        <div className="w-full h-full rounded-[36px] bg-emerald-500 flex items-center justify-center text-white text-4xl font-black italic">
                          {viewingUser.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <h2 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">{viewingUser.name}</h2>
                    <div className="flex flex-wrap justify-center md:justify-start gap-4">
                      <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest">
                        <Mail size={12} className="text-emerald-500" />
                        <span>{viewingUser.email || 'PRIVATE_PROFILE'}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase text-[9px] tracking-widest">
                        <Phone size={12} className="text-emerald-500" />
                        <span>{viewingUser.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Total Savings Card */}
                  <div className="bg-white dark:bg-[#0a0a0a] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 relative overflow-hidden group shadow-sm transition-all hover:shadow-xl hover:shadow-emerald-500/5">
                    <div className="absolute top-0 right-0 p-8 text-emerald-500/10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
                       <TrendingUp size={120} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500 mb-6">Total Accumulated</p>
                      <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white italic tracking-tighter">{formatCurrency(totalPaid)}</h3>
                      <div className="mt-6 h-1.5 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1.5, ease: "easeOut" }}
                          className="h-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
                        />
                      </div>
                      <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-gray-400 italic">Financial Health: {progress.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Weeks Participated Card */}
                  <div className="bg-white dark:bg-[#0a0a0a] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 relative overflow-hidden group shadow-sm transition-all hover:shadow-xl hover:shadow-amber-500/5">
                    <div className="absolute top-0 right-0 p-8 text-amber-500/10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
                       <Clock size={120} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 mb-6">Contribution Cycle</p>
                      <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white italic tracking-tighter">
                        {fullyPaidWeeks} 
                        <span className="text-sm uppercase font-black text-gray-400 not-italic ml-2 opacity-40">/ {expectedWeeks} PAID</span>
                      </h3>
                      <div className="mt-6 text-[10px] font-black uppercase tracking-widest">
                        {weeksMissed > 0 ? (
                          <span className="text-rose-500 flex items-center space-x-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                             <span>{weeksMissed} Mandatory weeks missed</span>
                          </span>
                        ) : (
                          <span className="text-emerald-500 flex items-center space-x-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span>Participation optimal</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Balance / Outstanding Card */}
                  <div className="bg-white dark:bg-[#0a0a0a] p-8 rounded-[40px] border border-gray-100 dark:border-white/5 relative overflow-hidden group shadow-sm transition-all hover:shadow-xl hover:shadow-rose-500/5">
                     {balance > 0 ? (
                       <div className="absolute top-0 right-0 p-8 text-rose-500/10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
                          <AlertTriangle size={120} />
                       </div>
                     ) : (
                       <div className="absolute top-0 right-0 p-8 text-emerald-500/10 transform translate-x-4 -translate-y-4 group-hover:scale-125 transition-transform duration-700">
                          <CheckCircle2 size={120} />
                       </div>
                     )}
                    <div className="relative z-10">
                      <p className={cn(
                        "text-[10px] font-black uppercase tracking-[0.25em] mb-6",
                        balance > 0 ? "text-rose-500" : "text-emerald-500"
                      )}>Outstanding Deficit</p>
                      <h3 className={cn(
                        "text-4xl lg:text-5xl font-black italic tracking-tighter",
                        balance > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {balance > 0 ? `-${formatCurrency(balance)}` : 'CLEAR'}
                      </h3>
                      <p className="mt-6 text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-60 italic">
                        {balance > 0 ? 'Resolution action required' : 'Verified as active status'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Shares & Assessment Section */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Share Card */}
                  <div className="lg:col-span-1 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[40px] p-8 flex flex-col justify-between min-h-[300px] relative overflow-hidden group shadow-2xl">
                    <div className="absolute bottom-0 right-0 p-8 opacity-5 transform translate-y-12 group-hover:translate-y-6 transition-transform duration-700">
                      <PieChart size={200} />
                    </div>
                    <div className="relative z-10">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-10">Asset Assessment</p>
                      <div className="space-y-8">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Shares Accumulated</p>
                          <p className="text-5xl font-black italic">{(totalPaid / shareValue).toFixed(2)}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mt-2 italic">@ {formatCurrency(shareValue)} per share</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">Equity Presence %</p>
                          <p className="text-3xl font-black italic">
                            {(() => {
                              const grandTotal = contributions.reduce((s, c) => s + c.amount, 0);
                              return grandTotal > 0 ? ((totalPaid / grandTotal) * 100).toFixed(3) : '0.000';
                            })()}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="relative z-10 mt-auto">
                       <Shield size={24} className="opacity-20" />
                    </div>
                  </div>

                  {/* Transaction History Ledger */}
                  <div className="lg:col-span-3 bg-white dark:bg-[#0a0a0a] rounded-[40px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-gray-50 dark:border-white/5 flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Contribution Ledger Registry</h3>
                      <button 
                        onClick={handleDownloadPDF}
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 px-4 py-2 rounded-xl transition-all"
                      >
                        Request PDF Ledger
                      </button>
                    </div>
                    <div className="flex-1 overflow-x-auto no-scrollbar">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-50 dark:border-white/5">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Asset Class</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Value (KES)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                          {userContributions
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((c) => (
                              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                <td className="px-8 py-6 whitespace-nowrap">
                                  <p className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-tighter">{format(new Date(c.date), 'MMM d, yyyy')}</p>
                                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 whitespace-nowrap">{format(new Date(c.date), 'h:mm a')}</p>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 flex-none scale-90 group-hover:scale-100 transition-transform">
                                      <Shield size={14} />
                                    </div>
                                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-tight">Savings Deposit</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-right whitespace-nowrap">
                                  <span className="text-base md:text-xl font-black text-emerald-600 dark:text-emerald-400 italic">+{formatCurrency(c.amount)}</span>
                                </td>
                              </tr>
                            ))}
                          {userContributions.length === 0 && (
                            <tr>
                              <td colSpan={3} className="px-8 py-24 text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 italic">No contribution records identified</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Bottom Bar (Mobile Consistency) */}
              <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 z-40 bg-gradient-to-t from-gray-50 dark:from-[#050505] to-transparent">
                 <div className="bg-white/80 dark:bg-black/80 backdrop-blur-xl p-4 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-2xl flex items-center justify-between">
                    <button 
                      onClick={() => setViewingUser(null)}
                      className="p-3 bg-gray-100 dark:bg-zinc-800 rounded-2xl text-gray-500"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 px-4">
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Asset</p>
                       <p className="text-lg font-black italic text-emerald-500">{formatCurrency(totalPaid)}</p>
                    </div>
                    <button 
                      onClick={handleDownloadPDF}
                      className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-500/20"
                    >
                      <Download size={20} />
                    </button>
                 </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

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
