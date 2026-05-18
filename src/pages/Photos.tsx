import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X, Image as ImageIcon, Maximize2, Trash2, Loader2, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageUtils';
import { Media } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const Photos: React.FC = () => {
  const { isAdmin } = useAuth();
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [newMedia, setNewMedia] = useState({
    title: '',
    image_url: '',
    type: 'photo' as 'photo' | 'video'
  });

  const fetchMedia = async () => {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setMediaItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMedia();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, mediaItems]);

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % mediaItems.length);
  };

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + mediaItems.length) % mediaItems.length);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setErrorStatus(null);

    let finalImageUrl = newMedia.image_url;

    try {
      // Handle File Upload if exists
      const fileInput = document.getElementById('gallery-image-input') as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        let file = fileInput.files[0];
        
        // Compress image before upload
        file = await compressImage(file) as File;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Math.random()}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, file);

        if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      if (!finalImageUrl) throw new Error("Please select an image for the gallery");

      const { error: insertError } = await supabase.from('media').insert([{
        ...newMedia,
        image_url: finalImageUrl
      }]);

      if (insertError) throw new Error(`Database error: ${insertError.message}`);

      setShowAddModal(false);
      setNewMedia({ title: '', image_url: '', type: 'photo' });
      setImagePreview(null);
      fetchMedia();
    } catch (err: any) {
      setErrorStatus(err.message);
      console.error('Gallery upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this photo?')) return;
    
    const { error } = await supabase.from('media').delete().eq('id', id);
    if (!error) {
      setMediaItems(prev => prev.filter(m => m.id !== id));
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
    <div className="p-4 space-y-8 pb-24 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">Group Gallery</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 font-medium tracking-widest uppercase text-left">Preserving our shared memories</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white p-3 rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={24} />
          </button>
        )}
      </div>

      <div className="columns-2 md:columns-3 gap-4 space-y-4">
        {mediaItems.length > 0 ? (
          mediaItems.map((media, idx) => (
            <motion.div
              key={media.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => setSelectedIndex(idx)}
              className="group relative rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-800"
            >
              <img 
                src={media.image_url} 
                alt={media.title} 
                className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                <p className="text-white font-bold text-sm mb-1">{media.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                    {new Date(media.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="bg-white/20 p-2 rounded-full text-white">
                      <Maximize2 size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 col-span-full flex flex-col items-center">
            <div className="bg-gray-50 dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center text-gray-300 dark:text-gray-600 mb-4 border-4 border-dashed border-gray-200 dark:border-gray-700">
              <ImageIcon size={40} />
            </div>
            <p className="text-gray-400 dark:text-gray-500 font-medium italic">Your gallery is empty</p>
          </div>
        )}
      </div>

      {/* Lightbox / Expanded View */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedIndex(null)}
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors z-[110]"
            >
              <X size={32} />
            </button>

            {/* Navigation - Left */}
            <button 
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[110] border border-white/10"
            >
              <ChevronLeft size={32} />
            </button>

            {/* Navigation - Right */}
            <button 
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 p-4 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[110] border border-white/10"
            >
              <ChevronRight size={32} />
            </button>

            {/* Content Area */}
            <motion.div
              key={selectedIndex}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative max-w-5xl w-full flex flex-col items-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={mediaItems[selectedIndex].image_url} 
                alt={mediaItems[selectedIndex].title} 
                className="w-full h-auto rounded-[40px] shadow-2xl object-contain max-h-[75vh]" 
              />

              {/* Bottom Controls */}
              <div className="mt-8 flex items-center space-x-4">
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className={cn(
                    "p-4 rounded-2xl transition-all flex items-center space-x-2 border",
                    showInfo ? "bg-emerald-600 border-emerald-500 text-white" : "bg-white/10 border-white/10 text-white/70 hover:text-white"
                  )}
                >
                  <Info size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Details</span>
                </button>
              </div>

              {/* Info Overlay */}
              <AnimatePresence>
                {showInfo && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="mt-6 bg-white dark:bg-[#1a1a1a] p-8 rounded-[32px] shadow-2xl border border-white/10 w-full max-w-md text-center"
                  >
                    <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight mb-2">
                      {mediaItems[selectedIndex].title}
                    </h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-[0.2em]">
                      Captured: {new Date(mediaItems[selectedIndex].created_at).toLocaleDateString(undefined, { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Media Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"
              >
                <X size={24} />
              </button>
              
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight mb-8">Add to Gallery</h3>
              
              <form onSubmit={handleAddMedia} className="space-y-6">
                {errorStatus && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl">
                    <p className="text-red-600 dark:text-red-400 text-xs font-bold">{errorStatus}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Select Photo</label>
                  <div 
                    onClick={() => document.getElementById('gallery-image-input')?.click()}
                    className="w-full aspect-[4/3] bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer group relative"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus className="text-white" size={32} />
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={48} className="text-gray-300 dark:text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Select from Phone</p>
                      </>
                    )}
                    <input
                      id="gallery-image-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Photo Title</label>
                  <input
                    type="text"
                    required
                    value={newMedia.title}
                    onChange={(e) => setNewMedia({ ...newMedia, title: e.target.value })}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    placeholder="e.g., Annual General Meeting 2024"
                  />
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-4 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none mt-4 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  {uploading ? <Loader2 className="animate-spin" size={24} /> : 'Upload Photo'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Photos;
