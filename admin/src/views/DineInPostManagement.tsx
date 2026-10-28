import React, { useState, useEffect, useRef } from 'react';
import { useAdmin } from '../AdminContext';
import {
  fetchDineInPosts,
  createDineInPost,
  updateDineInPost,
  deleteDineInPost,
  apiFetch
} from '../services/api';
import type { DineInMediaPost } from '../services/api';
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  Film,
  Link as LinkIcon,
  Upload,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export const DineInPostManagement: React.FC = () => {
  const { user, restaurants, selectedBrandId, showToast } = useAdmin();
  const isSuper = user?.role === 'super_admin';

  // Active restaurant selection: for superadmin, respect selectedBrandId; for branch manager, use their restaurantId
  const effectiveRestaurantId = isSuper
    ? selectedBrandId
    : (user?.restaurantId || selectedBrandId || restaurants[0]?.id);

  const activeRestaurant = restaurants.find((r) => r.id === effectiveRestaurantId) || restaurants[0];

  const [posts, setPosts] = useState<DineInMediaPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loadingMenu, setLoadingMenu] = useState<boolean>(false);

  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [title, setTitle] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [mediaType, setMediaType] = useState<'VIDEO' | 'IMAGE'>('VIDEO');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [linkedMenuItem, setLinkedMenuItem] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load posts for the current brand
  const loadPosts = async () => {
    if (!effectiveRestaurantId) return;
    setLoading(true);
    try {
      const data = await fetchDineInPosts({
        restaurant_id: effectiveRestaurantId,
        include_inactive: true
      });
      setPosts(data);
    } catch (err: any) {
      console.error('[DineInPosts] Failed to load posts:', err);
      showToast('Failed to load Dine-In posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load menu items for dish tagging
  const loadMenuItems = async () => {
    if (!effectiveRestaurantId) return;
    setLoadingMenu(true);
    try {
      const data = await apiFetch<any>(`/api/restaurants/${effectiveRestaurantId}/menu/`);
      const items: any[] = [];
      const categories = Array.isArray(data) ? data : (data?.categories || data?.results || []);
      categories.forEach((cat: any) => {
        if (Array.isArray(cat.items)) {
          cat.items.forEach((item: any) => {
            items.push({
              id: item.id,
              name: item.name,
              price: item.price,
              categoryName: cat.name
            });
          });
        }
      });
      setMenuItems(items);
    } catch (err) {
      console.warn('[DineInPosts] Menu load fallback:', err);
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    loadPosts();
    loadMenuItems();
  }, [effectiveRestaurantId]);

  // Quota calculation (active posts count)
  const quotaUsed = posts.filter(p => p.is_active).length;
  const isQuotaFull = quotaUsed >= 10;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 30 * 1024 * 1024) {
        showToast('File size must be under 30 MB', 'error');
        return;
      }
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
      if (file.type.startsWith('image/')) {
        setMediaType('IMAGE');
      } else {
        setMediaType('VIDEO');
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setCaption('');
    setMediaType('VIDEO');
    setMediaUrl('');
    setSelectedFile(null);
    setFilePreview('');
    setLinkedMenuItem('');
    setIsActive(true);
    setUploadMode('url');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    if (uploadMode === 'url' && !mediaUrl.trim()) {
      showToast('Please provide a media URL', 'error');
      return;
    }

    if (uploadMode === 'file' && !selectedFile) {
      showToast('Please select a video or image file to upload', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('restaurant', String(effectiveRestaurantId));
      formData.append('title', title.trim());
      formData.append('caption', caption.trim());
      formData.append('media_type', mediaType);
      formData.append('is_active', String(isActive));

      if (linkedMenuItem) {
        formData.append('linked_menu_item', linkedMenuItem);
      }

      if (uploadMode === 'file' && selectedFile) {
        formData.append('media_file', selectedFile);
      } else {
        formData.append('media_url', mediaUrl.trim());
      }

      await createDineInPost(formData);
      showToast(
        isQuotaFull
          ? 'Post published! Oldest post was automatically retired (FIFO quota).'
          : 'Dine-In Highlight published successfully!',
        'success'
      );
      setIsModalOpen(false);
      resetForm();
      loadPosts();
    } catch (err: any) {
      console.error('[DineInPosts] Upload failed:', err);
      showToast(err?.message || 'Failed to upload post', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (post: DineInMediaPost) => {
    try {
      await updateDineInPost(post.id, { is_active: !post.is_active });
      showToast(post.is_active ? 'Post hidden from customers' : 'Post is now live in Dine-In Highlights', 'success');
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_active: !p.is_active } : p));
    } catch (err: any) {
      showToast('Failed to update post status', 'error');
    }
  };

  const handleDeletePost = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDineInPost(deleteId);
      showToast('Highlight deleted successfully', 'success');
      setPosts(prev => prev.filter(p => p.id !== deleteId));
      setDeleteId(null);
    } catch (err: any) {
      showToast('Failed to delete post', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-xl text-white shadow-md">
              <Film size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                Dine-In Highlights & Video Reels
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  Customer App Feed
                </span>
              </h1>
              <p className="text-sm text-zinc-500 dark:text-slate-400 mt-0.5">
                Manage short video highlights and sizzle reels shown when customers explore Dine-In for{' '}
                <span className="font-semibold text-zinc-800 dark:text-slate-200">{activeRestaurant?.name || 'this brand'}</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadPosts()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-600 dark:text-slate-300 transition-colors"
            title="Refresh feed"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            Upload Reel / Post
          </button>
        </div>
      </div>

      {/* Quota Indicator Bar */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isSuper 
          ? 'bg-slate-850/80 border-slate-800 text-slate-100' 
          : 'bg-white dark:bg-slate-900 border-zinc-200/80 dark:border-slate-800 shadow-sm'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${
              quotaUsed >= 10 ? 'bg-rose-500 animate-pulse' : quotaUsed >= 8 ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">Active Reels Quota:</span>
                <span className={`text-sm font-extrabold px-2 py-0.5 rounded-md ${
                  quotaUsed >= 10 
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400' 
                    : quotaUsed >= 8
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400'
                }`}>
                  {quotaUsed} / 10 Slots
                </span>
                {quotaUsed >= 10 && (
                  <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle size={14} /> Full (FIFO Auto-Cleanup Active)
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-slate-400 mt-0.5">
                Each brand holds up to 10 active video reels. When slot 10 is reached, adding a new reel will safely retire the oldest reel in FIFO order.
              </p>
            </div>
          </div>

          {/* Progress bar visual */}
          <div className="w-full sm:w-48 bg-zinc-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                quotaUsed >= 10 ? 'bg-rose-500' : quotaUsed >= 8 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (quotaUsed / 10) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Posts Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-zinc-200 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
          <Film size={44} className="mx-auto text-zinc-400 dark:text-slate-600 mb-3" />
          <h3 className="font-bold text-lg text-zinc-800 dark:text-slate-200">No Dine-In Reels Yet</h3>
          <p className="text-sm text-zinc-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Upload video clips of your dishes, sizzling platters, or kitchen craft to captivate Dine-In guests browsing the mobile app.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-sm shadow hover:bg-rose-500 transition-colors"
          >
            <Plus size={16} />
            Upload First Highlight
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`flex flex-col rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-lg ${
                isSuper
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white dark:bg-slate-900 border-zinc-200 dark:border-slate-800'
              } ${!post.is_active ? 'opacity-70 grayscale-[30%]' : ''}`}
            >
              {/* Media Container */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
                {post.media_type === 'VIDEO' ? (
                  <video
                    src={post.media_url}
                    poster={post.thumbnail_url || undefined}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={post.media_url}
                    alt={post.title}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-center pointer-events-none">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-sm ${
                    post.media_type === 'VIDEO' 
                      ? 'bg-rose-600/90 text-white' 
                      : 'bg-blue-600/90 text-white'
                  }`}>
                    {post.media_type}
                  </span>

                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-sm ${
                    post.is_active
                      ? 'bg-emerald-600/90 text-white'
                      : 'bg-zinc-700/90 text-zinc-300'
                  }`}>
                    {post.is_active ? 'LIVE' : 'HIDDEN'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-white line-clamp-1">
                    {post.title}
                  </h3>
                  {post.caption && (
                    <p className="text-xs text-zinc-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {post.caption}
                    </p>
                  )}
                </div>

                {/* Linked Menu Dish Pill (if tagged) */}
                {post.linked_item_details ? (
                  <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-slate-800/70 border border-zinc-200 dark:border-slate-700 flex items-center gap-2.5">
                    {post.linked_item_details.image && (
                      <img
                        src={post.linked_item_details.image}
                        alt={post.linked_item_details.name}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                        <LinkIcon size={10} />
                        1-Tap Menu Link
                      </div>
                      <div className="text-xs font-semibold text-zinc-800 dark:text-slate-200 truncate">
                        {post.linked_item_details.name}
                      </div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Rs. {Math.round(post.linked_item_details.price)}
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-400 dark:text-slate-500 italic flex items-center gap-1.5 py-1">
                    <LinkIcon size={12} /> No menu item linked
                  </div>
                )}

                {/* Bottom Actions */}
                <div className="pt-2 border-t border-zinc-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-zinc-400 dark:text-slate-500">
                    {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleActive(post)}
                      className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
                        post.is_active
                          ? 'border-zinc-200 dark:border-slate-700 hover:bg-zinc-100 dark:hover:bg-slate-800 text-zinc-600 dark:text-slate-300'
                          : 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                      }`}
                      title={post.is_active ? 'Hide post' : 'Make live'}
                    >
                      {post.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{post.is_active ? 'Hide' : 'Publish'}</span>
                    </button>

                    <button
                      onClick={() => setDeleteId(post.id)}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete post"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
            isSuper ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-zinc-800'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex justify-between items-center ${isSuper ? 'border-slate-800' : 'border-zinc-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-600 text-white rounded-xl">
                  <Film size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-base">New Dine-In Highlight Reel</h3>
                  <p className="text-xs text-zinc-500 dark:text-slate-400">
                    Target: <span className="font-semibold text-rose-500">{activeRestaurant?.name}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreatePost} className="p-5 overflow-y-auto space-y-4">
              {/* Mode Toggle: File upload vs URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-slate-400 mb-2">
                  Media Source
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUploadMode('url')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      uploadMode === 'url'
                        ? 'bg-white dark:bg-slate-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-800'
                    }`}
                  >
                    Direct CDN / Video URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('file')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                      uploadMode === 'file'
                        ? 'bg-white dark:bg-slate-700 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 dark:text-slate-400 hover:text-zinc-800'
                    }`}
                  >
                    File Upload (Up to 30 MB)
                  </button>
                </div>
              </div>

              {/* URL or File input */}
              {uploadMode === 'url' ? (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-slate-300 mb-1">
                    Media URL (.mp4, Cloudinary, or webm) *
                  </label>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/... or https://commondatastorage.../video.mp4"
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                      isSuper
                        ? 'bg-slate-950 border-slate-700 focus:border-rose-500 text-white'
                        : 'bg-zinc-50 border-zinc-200 focus:border-rose-500'
                    }`}
                  />
                  <p className="text-[11px] text-zinc-400 dark:text-slate-500 mt-1">
                    Paste any public MP4 video or high-res food image link.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-zinc-700 dark:text-slate-300 mb-1">
                    Choose Video or Image File *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/mp4,video/quicktime,video/webm,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
                      isSuper
                        ? 'border-slate-700 hover:border-rose-500 bg-slate-950/40'
                        : 'border-zinc-300 hover:border-rose-500 bg-zinc-50'
                    }`}
                  >
                    <Upload size={28} className="mx-auto text-zinc-400 dark:text-slate-500 mb-2" />
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-rose-500 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-zinc-400">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Click to replace
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-zinc-700 dark:text-slate-300">
                          Click to select MP4 video or food photo
                        </p>
                        <p className="text-[10px] text-zinc-400 dark:text-slate-500 mt-0.5">
                          Max size: 30 MB (auto-optimized via Cloudinary)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-slate-300 mb-1">
                  Highlight Title *
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Sizzling Charcoal Mixed Grill or Melting Naan Pull"
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                    isSuper
                      ? 'bg-slate-950 border-slate-700 focus:border-rose-500 text-white'
                      : 'bg-zinc-50 border-zinc-200 focus:border-rose-500'
                  }`}
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-slate-300 mb-1">
                  Description / Tasting Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={350}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe the experience, live clay oven baking, seasoning, or serving details..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all ${
                    isSuper
                      ? 'bg-slate-950 border-slate-700 focus:border-rose-500 text-white'
                      : 'bg-zinc-50 border-zinc-200 focus:border-rose-500'
                  }`}
                />
              </div>

              {/* Tag Menu Item Dropdown */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Tag Menu Item (Enables 1-Tap Customer Add-to-Cart)</span>
                  {loadingMenu && <span className="text-[10px] text-zinc-400">Loading catalog...</span>}
                </label>
                <select
                  value={linkedMenuItem}
                  onChange={(e) => setLinkedMenuItem(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm outline-none transition-all cursor-pointer ${
                    isSuper
                      ? 'bg-slate-950 border-slate-700 focus:border-rose-500 text-white'
                      : 'bg-zinc-50 border-zinc-200 focus:border-rose-500'
                  }`}
                >
                  <option value="">-- None (General Brand Highlight) --</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · Rs. {Math.round(item.price)} ({item.categoryName})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-zinc-400 dark:text-slate-500 mt-1">
                  When linked, customers watching this reel in the mobile app see an instant 1-tap dish card with price and "+ Add to Cart".
                </p>
              </div>

              {/* Media Type & Active toggle */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="media_type"
                      checked={mediaType === 'VIDEO'}
                      onChange={() => setMediaType('VIDEO')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    Video Reel
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="media_type"
                      checked={mediaType === 'IMAGE'}
                      onChange={() => setMediaType('IMAGE')}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    Photo Post
                  </label>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  Publish Immediately
                </label>
              </div>

              {/* Live Preview Player (if URL or file selected) */}
              {(filePreview || mediaUrl) && (
                <div className="p-3 rounded-xl bg-black/40 border border-zinc-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Live Preview</span>
                  <div className="aspect-video rounded-lg overflow-hidden bg-black flex items-center justify-center">
                    {mediaType === 'VIDEO' ? (
                      <video
                        src={filePreview || mediaUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src={filePreview || mediaUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-zinc-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Uploading & Optimizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      Publish Highlight
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl border p-5 space-y-4 shadow-2xl ${
            isSuper ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white text-zinc-800'
          }`}>
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertCircle size={22} />
              </div>
              <h3 className="font-bold text-base">Delete Highlight Reel?</h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-slate-400">
              Are you sure you want to delete this highlight? This will remove the video from Cloudinary and the customer mobile app immediately.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-slate-300 hover:bg-zinc-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
