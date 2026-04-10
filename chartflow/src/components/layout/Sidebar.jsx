import { useState } from 'react';

function Sidebar({ activePage, onPageChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'notes', label: 'Notes', icon: 'description' },
    { id: 'charts', label: 'Charts', icon: 'dentistry' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-primary text-white p-2 rounded-lg shadow-lg"
      >
        <span className="material-symbols-outlined">{isOpen ? 'close' : 'menu'}</span>
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky lg:top-0 inset-y-0 left-0 z-40 h-screen
          w-64 bg-slate-100 dark:bg-slate-900 flex flex-col py-6 px-4 gap-2
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ boxShadow: '0 12px 32px -4px rgba(25,28,29,0.06)' }}
      >
        <div className="mb-8 px-2">
          <h1 className="text-xl font-black text-blue-900 dark:text-blue-200 font-headline tracking-tight">Chartflow</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">Agentic Workflow</p>
        </div>

        <nav className="flex flex-col gap-1 flex-grow">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onPageChange(item.id);
                setIsOpen(false);
              }}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 w-full text-left
                ${activePage === item.id
                  ? 'text-blue-700 font-bold border-r-4 border-blue-600 bg-slate-200/50'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-slate-200'
                }
              `}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              <span className={`text-sm font-label ${activePage === item.id ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1 pt-6 border-t border-slate-200/30">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">contact_support</span>
            <span className="text-xs font-label">Support</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-xs font-label">Log Out</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;