import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Calendar, ArrowRight, Plus, X, Image as ImageIcon, CheckCircle2, Clock, Loader2, ChevronLeft, ChevronRight, Info, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/imageUtils';
import { Project, ProjectStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ProjectCarouselProps {
  images: string[];
}

const ProjectCarousel: React.FC<ProjectCarouselProps> = ({ images }) => {
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-700">
        <ImageIcon size={64} />
      </div>
    );
  }

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((index + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((index - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-full group/carousel overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={index}
          src={images[index]}
          alt=""
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          
          <button 
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/30 hover:bg-white/50 text-white rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronLeft size={20} />
          </button>
          
          <button 
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/30 hover:bg-white/50 text-white rounded-full opacity-0 group-hover/carousel:opacity-100 transition-opacity"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1.5">
            {images.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all",
                  i === index ? "bg-white w-4" : "bg-white/40"
                )} 
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ProjectCard: React.FC<{ project: Project; idx: number }> = ({ project, idx }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const images = [project.image_url, ...(project.images?.map(img => img.image_url) || [])].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: idx * 0.1 }}
      className="group relative bg-white dark:bg-[#1a1a1a] rounded-[40px] overflow-hidden shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="aspect-[16/10] lg:aspect-auto h-full overflow-hidden relative min-h-[350px]">
          <ProjectCarousel images={images} />
          <div className="absolute top-6 left-6 flex flex-col space-y-2">
            <span className={cn(
              "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg",
              project.status === 'done' 
                ? "bg-emerald-500 text-white" 
                : "bg-amber-500 text-white"
            )}>
              {project.status === 'done' ? <CheckCircle2 size={12} className="mr-1.5" /> : <Clock size={12} className="mr-1.5" />}
              {project.status.replace('-', ' ')}
            </span>
          </div>
        </div>

        <div className="p-8 lg:p-14 flex flex-col justify-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">
                <Calendar size={14} className="mr-2" />
                {format(new Date(project.date), 'MMMM yyyy')}
              </div>
              <h3 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white uppercase italic tracking-tighter leading-[0.85]">{project.title}</h3>
            </div>

            <div className="h-1 bg-emerald-600 w-24 rounded-full" />

            <div className="relative">
              <p className={cn(
                "text-gray-600 dark:text-gray-400 leading-relaxed text-base md:text-lg transition-all duration-500",
                !isExpanded && "line-clamp-6"
              )}>
                {project.description}
              </p>
              {project.description.length > 250 && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-6 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center hover:translate-x-2 transition-all p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl group"
                >
                  <span className="mr-2">{isExpanded ? 'Compress Story' : 'Read Full Journey'}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Projects: React.FC = () => {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [projectGallery, setProjectGallery] = useState<{file: File, preview: string}[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'done' | 'coming-soon' | 'planned'>('all');
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    image_url: '',
    status: 'coming-soon' as ProjectStatus,
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchProjects = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('date', { ascending: false });
      
      if (projectsError) throw projectsError;
      
      if (projectsData) {
        // Try to fetch images separately to avoid relationship cache issues
        const { data: imagesData } = await supabase
          .from('project_images')
          .select('*');

        setProjects(projectsData.map((p: any) => ({
          ...p,
          images: (imagesData || []).filter((img: any) => img.project_id === p.id)
        })));
      }
    } catch (err: any) {
      console.error('Fetch projects failed:', err);
      setErrorStatus("Failed to load projects. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview && projectGallery.length === 0) {
      setErrorStatus("At least one project image is required.");
      return;
    }

    setUploading(true);
    setErrorStatus(null);

    try {
      let finalImageUrl = '';

      // Upload Banner Image
      const bannerInput = document.getElementById('project-image-input') as HTMLInputElement;
      let bannerFileToUpload: File | null = null;
      
      if (bannerInput?.files?.[0]) {
        bannerFileToUpload = bannerInput.files[0];
      } else if (projectGallery.length > 0) {
        // Falling back to first gallery image if no explicit banner is selected
        bannerFileToUpload = projectGallery[0].file;
      }

      if (bannerFileToUpload) {
        const compressedBanner = await compressImage(bannerFileToUpload as File) as File;
        const bannerExt = compressedBanner.name.split('.').pop() || 'jpg';
        const bannerName = `project-${Math.random().toString(36).substring(2)}.${bannerExt}`;
        const bannerPath = `projects/${bannerName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(bannerPath, compressedBanner);

        if (uploadError) throw new Error(`Banner upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(bannerPath);
        finalImageUrl = publicUrl;
      }

      // 1. Create Project
      const { data: projectData, error: projectError } = await supabase.from('projects').insert([{
        title: newProject.title,
        description: newProject.description,
        status: newProject.status,
        date: newProject.date,
        image_url: finalImageUrl
      }]).select().single();

      if (projectError) throw projectError;
      if (!projectData) throw new Error("Failed to create project record.");

      // 2. Upload Gallery Images
      if (projectGallery.length > 0) {
        const galleryPromises = projectGallery.map(async (item) => {
          try {
            const file = await compressImage(item.file as File) as File;
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `gallery-${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `projects/gallery/${projectData.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from('profiles')
              .upload(filePath, file);

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(filePath);
              
              await supabase.from('project_images').insert([{
                project_id: projectData.id,
                image_url: publicUrl
              }]);
            }
          } catch (galleryErr) {
            console.error("Failed to upload gallery image:", galleryErr);
          }
        });

        await Promise.all(galleryPromises);
      }

      setShowAddModal(false);
      setNewProject({
        title: '',
        description: '',
        image_url: '',
        status: 'coming-soon',
        date: format(new Date(), 'yyyy-MM-dd')
      });
      setImagePreview(null);
      setProjectGallery([]);
      fetchProjects();
    } catch (err: any) {
      console.error("Project creation failed:", err);
      setErrorStatus(err.message || "An unexpected error occurred.");
    } finally {
      setUploading(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    filter === 'all' ? true : p.status === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 pb-32">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">Our Projects</h2>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black tracking-[0.2em] uppercase mt-1">Transforming community dreams into reality</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 text-white p-4 rounded-3xl shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-emerald-950/20 p-5 rounded-[32px] border border-gray-50 dark:border-emerald-900/10 text-center shadow-sm">
             <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 italic leading-none mb-1">{projects.filter(p => p.status === 'done').length}</p>
             <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none">Completed</p>
          </div>
          <div className="bg-white dark:bg-blue-950/20 p-5 rounded-[32px] border border-gray-50 dark:border-blue-900/10 text-center shadow-sm">
             <p className="text-2xl font-black text-blue-600 dark:text-blue-400 italic leading-none mb-1">{projects.filter(p => p.status === 'coming-soon').length}</p>
             <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none">In Progress</p>
          </div>
          <div className="bg-white dark:bg-amber-950/20 p-5 rounded-[32px] border border-gray-50 dark:border-amber-900/10 text-center shadow-sm">
             <p className="text-2xl font-black text-amber-600 dark:text-amber-400 italic leading-none mb-1">{projects.filter(p => p.status === 'planned').length}</p>
             <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none">Planned</p>
          </div>
        </div>

        <div className="flex space-x-2 overflow-x-auto no-scrollbar py-2">
          {(['all', 'done', 'coming-soon', 'planned'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f === 'all' ? 'all' : f)}
              className={cn(
                "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                (f === 'all' ? filter === 'all' : filter === f)
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100 dark:shadow-none" 
                  : "bg-white dark:bg-[#1a1a1a] border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500"
              )}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {errorStatus ? (
          <div className="text-center py-24 bg-red-50 dark:bg-red-900/10 rounded-[40px] border border-red-100 dark:border-red-900/20">
            <p className="text-red-600 dark:text-red-400 font-bold uppercase tracking-widest text-xs mb-4">{errorStatus}</p>
            <button 
              onClick={fetchProjects}
              className="px-8 py-3 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none hover:scale-105 transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project, idx) => (
            <ProjectCard key={project.id} project={project} idx={idx} />
          ))
        ) : (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="bg-gray-50 dark:bg-gray-900 w-24 h-24 rounded-[40px] flex items-center justify-center text-gray-200 dark:text-gray-700 mb-6 border-4 border-dashed border-gray-100 dark:border-gray-800">
              <ImageIcon size={40} />
            </div>
            <p className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-xs">No projects found in this category</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/70">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-lg rounded-[40px] p-8 shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-y-auto max-h-[90vh] no-scrollbar"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight">Add New Project</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleAddProject} className="space-y-8">
                {errorStatus && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl">
                    <p className="text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest">{errorStatus}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Project Banner</label>
                  <div 
                    onClick={() => document.getElementById('project-image-input')?.click()}
                    className="w-full aspect-video bg-gray-50 dark:bg-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer group relative transition-all hover:border-emerald-500/50"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="text-white" size={32} />
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm mb-3 mx-auto w-fit transition-transform group-hover:scale-110">
                          <ImageIcon size={32} className="text-emerald-600" />
                        </div>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Select Photo</p>
                      </div>
                    )}
                      <input
                        id="project-image-input"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            const files = Array.from(e.target.files) as File[];
                            
                            // Set first as banner
                            const bannerReader = new FileReader();
                            bannerReader.onload = (ev) => setImagePreview(ev.target?.result as string);
                            bannerReader.readAsDataURL(files[0]);

                            // Add all to gallery
                            files.forEach((file: File) => {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                setProjectGallery(prev => {
                                  // Avoid duplicates by name/size
                                  if (prev.some(p => p.file.name === file.name && p.file.size === file.size)) return prev;
                                  return [...prev, { file, preview: ev.target?.result as string }];
                                });
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                        className="hidden"
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
                        onClick={() => document.getElementById('project-gallery-input')?.click()}
                        className="aspect-square bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:border-emerald-600 transition-all"
                      >
                        <Plus size={20} />
                        <input 
                          id="project-gallery-input" 
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

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Project Title</label>
                    <input
                      type="text"
                      required
                      value={newProject.title}
                      onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                      className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white placeholder:text-gray-300 font-medium"
                      placeholder="e.g., Solar Installation 2024"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Status</label>
                      <select
                        value={newProject.status}
                        onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white font-medium appearance-none"
                      >
                        <option value="done">Done</option>
                        <option value="coming-soon">Coming Soon</option>
                        <option value="planned">Planned</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Date</label>
                      <input
                        type="date"
                        required
                        value={newProject.date}
                        onChange={(e) => setNewProject({ ...newProject, date: e.target.value })}
                        className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none text-gray-900 dark:text-white font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">Description</label>
                    <textarea
                      required
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                      className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none h-32 text-gray-900 dark:text-white placeholder:text-gray-300 font-medium"
                      placeholder="Describe the project goals and impact..."
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="w-full py-5 bg-emerald-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="animate-spin" size={24} /> : 'Create Project'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Projects;
