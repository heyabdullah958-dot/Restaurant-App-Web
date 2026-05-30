import React, { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Sparkles, Plus, Trash2, X, Edit2, Check, Settings } from 'lucide-react';
import type { MenuItem } from '../types';

// Predefined Specification Templates for different categories
const SPEC_CONFIGS: Record<string, { key: string; label: string; type: 'select' | 'text'; options?: string[] }[]> = {
  pizza: [
    { key: 'crust_type', label: 'Crust Type', type: 'select', options: ['Thin Crust', 'Thick Crust', 'Pan Pizza', 'Stuffed Crust'] },
    { key: 'thickness', label: 'Thickness', type: 'select', options: ['Regular', 'Double', 'Extra Thick'] },
    { key: 'toppings', label: 'Toppings (comma separated)', type: 'text' }
  ],
  burger: [
    { key: 'patty_count', label: 'Patty Count', type: 'select', options: ['Single', 'Double', 'Triple'] },
    { key: 'cheese_type', label: 'Cheese Type', type: 'select', options: ['None', 'Cheddar', 'Mozzarella', 'Swiss'] },
    { key: 'sauce_type', label: 'Sauces/Seasoning', type: 'text' }
  ],
  drink: [
    { key: 'size', label: 'Volume/Size', type: 'select', options: ['250ml', '500ml', '1 Litre', '1.5 Litre'] },
    { key: 'ice_amount', label: 'Ice Amount', type: 'select', options: ['None', 'Low', 'Medium', 'High'] },
    { key: 'flavor', label: 'Flavor Note', type: 'text' }
  ],
  general: [
    { key: 'portion_size', label: 'Portion Size', type: 'select', options: ['Single Portion', 'Half', 'Full', 'Family Pack'] },
    { key: 'spice_level', label: 'Spice Level', type: 'select', options: ['Mild', 'Medium', 'Hot', 'Extra Spicy'] }
  ]
};

const getSpecsForCategory = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('pizza') || name.includes('handi') || name.includes('bbq')) return SPEC_CONFIGS.pizza;
  if (name.includes('burger') || name.includes('sandwich') || name.includes('melt')) return SPEC_CONFIGS.burger;
  if (name.includes('drink') || name.includes('beverage') || name.includes('shake') || name.includes('juice') || name.includes('fomo') || name.includes('caf')) return SPEC_CONFIGS.drink;
  return SPEC_CONFIGS.general;
};

export const MenuManagement: React.FC = () => {
  const {
    selectedBrandId,
    restaurants,
    menuItems,
    toggleMenuAvailability,
    addMenuCategory,
    removeMenuCategory,
    addMenuItem,
    removeMenuItem,
    editMenuItem,
  } = useAdmin();

  // Retrieve current restaurant
  const restaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];
  const categories = menuItems[restaurant.id] || [];

  // Local UI States
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [addingItemToCategoryId, setAddingItemToCategoryId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Editing state
  const [editingItem, setEditingItem] = useState<{ categoryId: number; categoryName: string; item: MenuItem } | null>(null);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await addMenuCategory(newCategoryName);
    setNewCategoryName('');
    setShowAddCategoryForm(false);
  };

  const handleAddItem = async (categoryId: number, e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    await addMenuItem(
      categoryId,
      newItemName,
      newItemDescription,
      parseFloat(newItemPrice)
    );
    // Reset form
    setNewItemName('');
    setNewItemDescription('');
    setNewItemPrice('');
    setAddingItemToCategoryId(null);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Menu Engineering</h1>
          <p className="text-sm text-zinc-500 dark:text-slate-400">Manage catalog configurations, prices, and stock for {restaurant.name}</p>
        </div>
        <button
          onClick={() => setShowAddCategoryForm(true)}
          className="flex items-center gap-1.5 bg-zinc-900 dark:bg-blue-600 hover:bg-zinc-800 dark:hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          <Plus size={14} /> Add Category
        </button>
      </div>

      {/* Add Category Form Modal/Wizard */}
      {showAddCategoryForm && (
        <div className="bg-zinc-50 dark:bg-slate-800 border border-zinc-200/60 dark:border-slate-700/60 p-5 rounded-2xl space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Create Menu Category</h3>
            <button onClick={() => setShowAddCategoryForm(false)} className="text-zinc-400 hover:text-zinc-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAddCategory} className="flex gap-3">
            <input
              type="text"
              placeholder="e.g., Pizzas, Hot & Crispy Burgers..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-700 rounded-xl px-4 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none"
              required
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
            >
              Create
            </button>
          </form>
        </div>
      )}

      {/* Menu Categories List */}
      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.id} className="space-y-4 bg-zinc-50/30 dark:bg-slate-800/10 border border-zinc-200/40 dark:border-slate-800/40 p-5 rounded-2xl">
            {/* Category Title & Controls */}
            <div className="flex justify-between items-center border-b border-zinc-200/60 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-slate-400"></span>
                <h3 className="font-extrabold text-zinc-900 dark:text-white text-base tracking-tight">{category.name}</h3>
                <span className="text-[10px] text-zinc-400 dark:text-slate-500 font-bold bg-zinc-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {category.items.length} Items
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddingItemToCategoryId(category.id)}
                  className="flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-blue-400 hover:text-zinc-900 dark:hover:text-blue-300 transition-colors"
                >
                  <Plus size={12} /> Add Item
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete category "${category.name}" and all its items?`)) {
                      removeMenuCategory(category.id);
                    }
                  }}
                  className="text-rose-500 hover:text-rose-600 transition-colors p-1"
                  title="Delete Category"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Add Item Form inside Category */}
            {addingItemToCategoryId === category.id && (
              <form
                onSubmit={(e) => handleAddItem(category.id, e)}
                className="bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700/60 p-4 rounded-xl space-y-3 animate-slideDown"
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-xs text-zinc-900 dark:text-white">Add New Item to {category.name}</h4>
                  <button onClick={() => setAddingItemToCategoryId(null)} type="button">
                    <X size={14} className="text-zinc-400" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Item Name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-700 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price (Rs.)"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-700 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description / Ingredients"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    className="bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-700 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddingItemToCategoryId(null)}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-zinc-500 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold shadow-md transition-all"
                  >
                    Add Dish
                  </button>
                </div>
              </form>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.items.map((item) => (
                <div 
                  key={item.id}
                  className={`bg-white dark:bg-slate-800 border p-4.5 rounded-2xl shadow-sm flex justify-between items-center transition-all duration-200 ${
                    item.is_available 
                      ? 'border-zinc-200/60 dark:border-slate-700/50 hover:shadow-premium' 
                      : 'border-zinc-100 dark:border-slate-800 bg-zinc-50/50 dark:bg-slate-900/20 opacity-70'
                  }`}
                >
                  {/* Left content detail */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-zinc-900 dark:text-white text-sm truncate">{item.name}</h4>
                      {item.price > 1000 && (
                        <span className="inline-flex text-[9px] font-bold text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/20 border border-amber-200/30 px-1.5 py-0.25 rounded-md">
                          <Sparkles size={8} className="mt-0.5" /> Premium
                        </span>
                      )}
                      {item.options?.has_variants && (
                        <span className="inline-flex text-[9px] font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/20 border border-blue-200/30 px-1.5 py-0.25 rounded-md">
                          Variants ({item.options?.variants?.length || 0})
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    
                    {/* Item specs summaries */}
                    {!item.options?.has_variants && item.options?.specifications && Object.keys(item.options.specifications).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(item.options.specifications).map(([key, val]) => (
                          val && (
                            <span key={key} className="text-[9px] font-semibold text-zinc-500 bg-zinc-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded">
                              {key.replace('_', ' ')}: {String(val)}
                            </span>
                          )
                        ))}
                      </div>
                    )}

                    <span className="block text-sm font-extrabold text-zinc-950 dark:text-white mt-2">
                      {item.options?.has_variants && item.options?.variants?.length > 0
                        ? `From Rs. ${Math.min(...item.options.variants.map((v: any) => Number(v.price))).toLocaleString()}`
                        : `Rs. ${Number(item.price).toLocaleString()}`}
                    </span>
                  </div>

                  {/* Right stock controller & actions */}
                  <div className="flex flex-col items-center gap-2 pl-4 border-l border-zinc-100 dark:border-slate-700/40">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      item.is_available ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-slate-500'
                    }`}>
                      {item.is_available ? 'In Stock' : 'Out of Stock'}
                    </span>
                    
                    {/* Visual Toggle Switch */}
                    <button
                      onClick={() => toggleMenuAvailability(restaurant.id, category.id, item.id)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        item.is_available ? 'bg-zinc-950 dark:bg-slate-400' : 'bg-zinc-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          item.is_available ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    <div className="flex items-center gap-1 mt-1">
                      {/* Edit Button */}
                      <button
                        onClick={() => setEditingItem({ categoryId: category.id, categoryName: category.name, item })}
                        className="text-zinc-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors p-1"
                        title="Edit Item Specs & Details"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete Item Action */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${item.name}" from the menu?`)) {
                            removeMenuItem(category.id, item.id);
                          }
                        }}
                        className="text-zinc-400 hover:text-rose-500 transition-colors p-1"
                        title="Delete Item"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {categories.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-zinc-200 dark:border-slate-700 text-zinc-400 dark:text-slate-500 font-medium">
            No categories or items configured for this restaurant.
          </div>
        )}
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          categoryId={editingItem.categoryId}
          categoryName={editingItem.categoryName}
          item={editingItem.item}
          onClose={() => setEditingItem(null)}
          onSave={editMenuItem}
        />
      )}
    </div>
  );
};

// Modal Component for editing a Menu Item with Variants & Category Specs
interface EditModalProps {
  categoryId: number;
  categoryName: string;
  item: MenuItem;
  onClose: () => void;
  onSave: (categoryId: number, itemId: number, data: any) => Promise<void>;
}

const EditItemModal: React.FC<EditModalProps> = ({ categoryId, categoryName, item, onClose, onSave }) => {
  const specFields = getSpecsForCategory(categoryName);

  // General field states
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(String(item.price));
  const [description, setDescription] = useState(item.description || '');
  const [prepTime, setPrepTime] = useState(String(item.preparation_time || 15));
  const [isAvailable, setIsAvailable] = useState(item.is_available);

  // Variant States
  const [hasVariants, setHasVariants] = useState(!!item.options?.has_variants);
  const [variants, setVariants] = useState<any[]>(item.options?.variants || []);
  const [specifications, setSpecifications] = useState<Record<string, string>>(
    item.options?.specifications || {}
  );

  const handleAddVariant = () => {
    // Build blank specs object
    const blankSpecs: Record<string, string> = {};
    specFields.forEach(f => {
      blankSpecs[f.key] = f.type === 'select' && f.options ? f.options[0] : '';
    });

    setVariants([
      ...variants,
      {
        id: String(Date.now() + Math.random()),
        name: '',
        price: '',
        specifications: blankSpecs
      }
    ]);
  };

  const handleRemoveVariant = (variantId: string) => {
    setVariants(variants.filter(v => v.id !== variantId));
  };

  const handleVariantChange = (variantId: string, field: string, value: any) => {
    setVariants(
      variants.map(v => (v.id === variantId ? { ...v, [field]: value } : v))
    );
  };

  const handleVariantSpecChange = (variantId: string, specKey: string, value: string) => {
    setVariants(
      variants.map(v => {
        if (v.id === variantId) {
          return {
            ...v,
            specifications: {
              ...v.specifications,
              [specKey]: value
            }
          };
        }
        return v;
      })
    );
  };

  const handleBaseSpecChange = (specKey: string, value: string) => {
    setSpecifications({
      ...specifications,
      [specKey]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validations
    if (!name.trim()) return;
    if (!hasVariants && !price) return;

    // Check variants validity
    if (hasVariants) {
      if (variants.length === 0) {
        alert('Please add at least one variant if Variants are enabled.');
        return;
      }
      for (const v of variants) {
        if (!v.name.trim() || !v.price) {
          alert('All variants must have a name and price.');
          return;
        }
      }
    }

    // Options mapping structure
    const updatedOptions = {
      has_variants: hasVariants,
      specifications: !hasVariants ? specifications : {},
      variants: hasVariants
        ? variants.map(v => ({
            id: v.id,
            name: v.name,
            price: parseFloat(v.price) || 0,
            specifications: v.specifications || {}
          }))
        : []
    };

    const payload = {
      name,
      price: hasVariants && variants.length > 0 
        ? Math.min(...variants.map(v => parseFloat(v.price) || 0))
        : parseFloat(price) || 0,
      description,
      preparation_time: parseInt(prepTime) || 15,
      is_available: isAvailable,
      options: updatedOptions
    };

    await onSave(categoryId, item.id, payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 overflow-y-auto p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col p-6 shadow-2xl space-y-6">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-zinc-150 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">Configure Product System</h2>
              <p className="text-xs text-zinc-500 dark:text-slate-400">Editing parameters for {item.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg border border-zinc-200 dark:border-slate-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-slate-350 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          {/* General Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider mb-2">Item Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            {!hasVariants && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider mb-2">Base Price (Rs.)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  required={!hasVariants}
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider mb-2">Preparation Time (mins)</label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider mb-2">Inventory Stock Status</label>
              <div className="flex items-center gap-3 h-11">
                <button
                  type="button"
                  onClick={() => setIsAvailable(!isAvailable)}
                  className={`flex-1 flex justify-center items-center gap-1.5 py-2.5 px-4 rounded-xl border text-xs font-bold transition-all ${
                    isAvailable
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/50'
                      : 'bg-zinc-50 dark:bg-slate-850 text-zinc-400 dark:text-slate-500 border-zinc-200/60 dark:border-slate-800'
                  }`}
                >
                  <Check size={14} className={isAvailable ? 'opacity-100' : 'opacity-0'} /> {isAvailable ? 'In Stock' : 'Out of Stock'}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 dark:text-slate-400 uppercase tracking-wider mb-2">Description / Ingredients</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-zinc-50 dark:bg-slate-950 border border-zinc-200 dark:border-slate-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Variants and Specifications Splitter */}
          <div className="border-t border-zinc-100 dark:border-slate-800/80 pt-4 space-y-4">
            <div className="flex justify-between items-center bg-zinc-50 dark:bg-slate-950/30 p-3 rounded-2xl border border-zinc-100 dark:border-slate-800/50">
              <div>
                <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white">Enable Multi-Variant Settings</h4>
                <p className="text-[11px] text-zinc-400 dark:text-slate-500">Enable if item has sizes/flavors with customized pricing</p>
              </div>
              <button
                type="button"
                onClick={() => setHasVariants(!hasVariants)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hasVariants ? 'bg-blue-600 dark:bg-blue-500' : 'bg-zinc-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hasVariants ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Standard Category Specifications (When no variants exist) */}
            {!hasVariants && (
              <div className="space-y-4 bg-zinc-50/55 dark:bg-slate-950/10 border border-zinc-150 dark:border-slate-800/40 p-4.5 rounded-2xl">
                <div>
                  <h4 className="text-xs font-black uppercase text-zinc-600 dark:text-slate-400 tracking-widest mb-1">
                    {categoryName} Specifications Template
                  </h4>
                  <p className="text-[10px] text-zinc-400 dark:text-slate-500">Configure parameters relevant to this category</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {specFields.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-slate-400">{field.label}</label>
                      {field.type === 'select' && field.options ? (
                        <select
                          value={specifications[field.key] || field.options[0]}
                          onChange={(e) => handleBaseSpecChange(field.key, e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-zinc-200 dark:border-slate-850 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                        >
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          placeholder={field.key === 'toppings' ? 'e.g. Mushrooms, Olives' : 'e.g. Garlic Mayo'}
                          value={specifications[field.key] || ''}
                          onChange={(e) => handleBaseSpecChange(field.key, e.target.value)}
                          className="w-full bg-white dark:bg-slate-950 border border-zinc-200 dark:border-slate-850 rounded-lg p-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Variants Configuration (When enabled) */}
            {hasVariants && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-zinc-600 dark:text-slate-400 tracking-wider">Variants Matrix</h4>
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <Plus size={12} /> Add Variant Option
                  </button>
                </div>

                <div className="space-y-4">
                  {variants.map((v, index) => (
                    <div key={v.id} className="relative bg-zinc-50/50 dark:bg-slate-950/20 border border-zinc-200/50 dark:border-slate-800/60 p-4.5 rounded-2xl space-y-3.5">
                      
                      {/* Remove Option Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="absolute top-4 right-4 text-zinc-400 hover:text-rose-500 transition-colors"
                        title="Remove Variant"
                      >
                        <Trash2 size={13} />
                      </button>

                      {/* Variant name & price */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-zinc-400 tracking-wide mb-1.5">Variant Name (e.g. Large)</label>
                          <input
                            type="text"
                            placeholder="e.g., Small, Medium, Spicy, Sweet"
                            value={v.name}
                            onChange={(e) => handleVariantChange(v.id, 'name', e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-zinc-250 dark:border-slate-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold uppercase text-zinc-400 tracking-wide mb-1.5">Variant Price (Rs.)</label>
                          <input
                            type="number"
                            placeholder="e.g. 850"
                            value={v.price}
                            onChange={(e) => handleVariantChange(v.id, 'price', e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-zinc-250 dark:border-slate-800 rounded-xl p-2 text-xs text-zinc-900 dark:text-white focus:outline-none"
                            required
                          />
                        </div>
                      </div>

                      {/* Variant Specifications */}
                      <div className="border-t border-zinc-150 dark:border-slate-800/40 pt-3">
                        <h5 className="text-[10px] font-black uppercase text-zinc-500 dark:text-slate-400 tracking-wider mb-2">Variant-Specific Specs ({categoryName})</h5>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {specFields.map((field) => (
                            <div key={field.key} className="space-y-1">
                              <label className="block text-[10px] font-bold text-zinc-500 dark:text-slate-400">{field.label}</label>
                              {field.type === 'select' && field.options ? (
                                <select
                                  value={v.specifications?.[field.key] || field.options[0]}
                                  onChange={(e) => handleVariantSpecChange(v.id, field.key, e.target.value)}
                                  className="w-full bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-lg p-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                                >
                                  {field.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={field.key === 'toppings' ? 'e.g. Olives, Capsicum' : 'e.g. Chipotle Sauce'}
                                  value={v.specifications?.[field.key] || ''}
                                  onChange={(e) => handleVariantSpecChange(v.id, field.key, e.target.value)}
                                  className="w-full bg-white dark:bg-slate-900 border border-zinc-200 dark:border-slate-800 rounded-lg p-1.5 text-xs text-zinc-900 dark:text-white focus:outline-none"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {variants.length === 0 && (
                    <div className="text-center py-6 border border-dashed border-zinc-200 dark:border-slate-850 rounded-2xl text-zinc-400 dark:text-slate-500 text-xs">
                      No variant configurations added yet. Click "Add Variant Option" to customize.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 border-t border-zinc-150 dark:border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-zinc-200 dark:border-slate-800 rounded-xl text-xs font-bold text-zinc-600 dark:text-slate-400 hover:bg-zinc-50 dark:hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-[0.98]"
            >
              Apply Configurations
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
