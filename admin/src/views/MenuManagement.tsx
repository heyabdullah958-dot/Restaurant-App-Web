import React, { useState } from 'react';
import { useAdmin } from '../AdminContext';
import { Sparkles, Plus, Trash2, X } from 'lucide-react';

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
        <div className="bg-zinc-50 dark:bg-slate-800 border border-zinc-200/60 dark:border-slate-700/60 p-5 rounded-2xl space-y-4">
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
                className="bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-700/60 p-4 rounded-xl space-y-3"
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
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <span className="block text-sm font-extrabold text-zinc-950 dark:text-white mt-2">
                      Rs. {Number(item.price).toLocaleString()}
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

                    {/* Delete Item Action */}
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${item.name}" from the menu?`)) {
                          removeMenuItem(category.id, item.id);
                        }
                      }}
                      className="text-zinc-400 hover:text-rose-500 transition-colors p-1 mt-1"
                      title="Delete Item"
                    >
                      <Trash2 size={12} />
                    </button>
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
    </div>
  );
};
