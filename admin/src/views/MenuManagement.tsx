import React from 'react';
import { useAdmin } from '../AdminContext';
import { Sparkles } from 'lucide-react';

export const MenuManagement: React.FC = () => {
  const { selectedBrandId, restaurants, menuItems, toggleMenuAvailability } = useAdmin();

  // Retrieve current restaurant
  const restaurant = restaurants.find((r) => r.id === selectedBrandId) || restaurants[0];
  const categories = menuItems[restaurant.id] || [];

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Menu Engineering</h1>
          <p className="text-sm text-zinc-500 dark:text-slate-400">Toggle item availability and manage pricing catalogs for {restaurant.name}</p>
        </div>
      </div>

      {/* Menu Categories List */}
      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.id} className="space-y-4">
            {/* Category Title */}
            <div className="flex items-center gap-2 border-b border-zinc-200/60 dark:border-slate-800 pb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-slate-300"></span>
              <h3 className="font-extrabold text-zinc-900 dark:text-white text-base tracking-tight">{category.name}</h3>
              <span className="text-[10px] text-zinc-400 dark:text-slate-500 font-bold bg-zinc-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {category.items.length} Items
              </span>
            </div>

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
                      Rs. {item.price.toFixed(2)}
                    </span>
                  </div>

                  {/* Right stock controller */}
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
