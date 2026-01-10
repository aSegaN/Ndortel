
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  MapPin, 
  LogOut, 
  Bell, 
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  Menu,
  X,
  BookOpen,
  HelpCircle,
  Sparkles,
  Cloud,
  CloudOff,
  RefreshCw
} from 'lucide-react';
import { Role } from '../types';
import { BRAND } from '../constants';
import { Logo } from './Logo';

// Fix: React.RefNode is not a valid type, changed to React.ReactNode
const SidebarItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, special?: boolean }> = ({ icon, label, active, onClick, special }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between group px-4 py-3.5 rounded-2xl transition-all duration-300 ${
      active 
        ? 'bg-[#064e3b] text-white shadow-xl shadow-emerald-900/20' 
        : special 
          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'
    }`}
  >
    <div className="flex items-center space-x-3">
      <div className={`${active ? 'text-amber-400' : special ? 'text-amber-600' : 'text-slate-400 group-hover:text-emerald-600'} transition-colors`}>
        {icon}
      </div>
      <span className="font-bold text-xs uppercase tracking-widest">{label}</span>
    </div>
    {active && <ChevronRight size={14} className="text-amber-400/50" />}
  </button>
);

export const Layout: React.FC<{ children: React.ReactNode, currentTab: string, setTab: (t: string) => void }> = ({ children, currentTab, setTab }) => {
  const { 
    authState, logout, centers, notifications, 
    markNotificationAsRead, clearNotifications,
    isOnline, isSyncing, pendingSyncCount, syncNow
  } = useApp();
  
  const [showNotifs, setShowNotifs] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = authState.user;
  const isAdmin = user?.role === Role.ADMIN;

  const userNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (n.userId === user?.id) return true;
      if (n.role === user?.role && n.centerId === user?.centerId) return true;
      if (isAdmin && n.role === Role.ADMIN) return true;
      return false;
    });
  }, [notifications, user, isAdmin]);

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleTabSelect = (tab: string) => {
    setTab(tab);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden relative">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-100 flex flex-col z-50 transition-transform duration-300 transform lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleTabSelect('dashboard')}>
            <div className="w-12 h-12 bg-[#064e3b] rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Logo size={32} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none tracking-tighter">{BRAND.name}</h1>
              <p className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Sénégal État Civil</p>
            </div>
          </div>
          <button className="lg:hidden p-2 text-slate-400" onClick={() => setIsSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto py-4">
          <div className="px-4 pb-4">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Espace Travail</p>
            <div className="space-y-2">
              <SidebarItem icon={<LayoutDashboard size={18} />} label="Vue d'ensemble" active={currentTab === 'dashboard'} onClick={() => handleTabSelect('dashboard')} />
              <SidebarItem icon={<FileText size={18} />} label="Actes & Registres" active={currentTab === 'certificates'} onClick={() => handleTabSelect('certificates')} />
            </div>
          </div>

          <div className="px-4 py-6 border-t border-slate-50">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Assistance & Découverte</p>
            <div className="space-y-2">
              <SidebarItem icon={<Sparkles size={18} />} label="Présentation" active={currentTab === 'presentation'} onClick={() => handleTabSelect('presentation')} special />
              <SidebarItem icon={<BookOpen size={18} />} label="Guide & Protocoles" active={currentTab === 'guide'} onClick={() => handleTabSelect('guide')} />
            </div>
          </div>

          {isAdmin && (
            <div className="px-4 py-6 border-t border-slate-50">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4">Gouvernance</p>
              <div className="space-y-2">
                <SidebarItem icon={<Users size={18} />} label="Collaborateurs" active={currentTab === 'users'} onClick={() => handleTabSelect('users')} />
                <SidebarItem icon={<MapPin size={18} />} label="Centres d'État" active={currentTab === 'centers'} onClick={() => handleTabSelect('centers')} />
              </div>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-50 bg-slate-50/50">
          <div className="flex items-center space-x-3 mb-6 p-3 bg-white rounded-2xl border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-amber-400 flex items-center justify-center font-black text-lg">
              {user?.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-slate-900 truncate">{user?.name}</p>
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest truncate">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center space-x-2 p-4 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all font-black text-[10px] uppercase tracking-[0.2em]"
          >
            <LogOut size={16} />
            <span>Se Déconnecter</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-6 lg:px-10 z-30">
          <div className="flex items-center space-x-4">
            <button 
              className="lg:hidden p-2 text-slate-600 bg-slate-50 rounded-xl hover:bg-emerald-50 transition-colors"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-xs lg:text-sm font-black text-slate-900 uppercase tracking-widest line-clamp-1">
                {isAdmin ? "Portail Souverain" : centers.find(c => c.id === user?.centerId)?.name}
              </h2>
              <p className="text-[8px] lg:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] mt-1">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 lg:space-x-8">
            {/* Indicateur de Synchronisation / Connectivité */}
            <div className="flex items-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 space-x-3">
              {isSyncing ? (
                <div className="flex items-center space-x-2">
                  <RefreshCw size={14} className="animate-spin text-emerald-600" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sinc. en cours</span>
                </div>
              ) : isOnline ? (
                <div className="flex items-center space-x-2">
                  <Cloud size={14} className="text-emerald-500" />
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Connecté</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <CloudOff size={14} className="text-amber-500" />
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Mode Local</span>
                </div>
              )}
              
              {!isSyncing && pendingSyncCount > 0 && isOnline && (
                <button 
                  onClick={syncNow}
                  className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[8px] font-black uppercase tracking-tighter hover:bg-emerald-700 transition-colors"
                >
                  Envoyer {pendingSyncCount}
                </button>
              )}
              
              {!isOnline && pendingSyncCount > 0 && (
                <div className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[8px] font-black uppercase tracking-tighter">
                  {pendingSyncCount} en attente
                </div>
              )}
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowNotifs(!showNotifs)}
                className={`relative p-2 lg:p-3 rounded-2xl transition-all ${showNotifs ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <Bell size={18} className="lg:w-5 lg:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 lg:top-2 lg:right-2 w-4 h-4 lg:w-5 lg:h-5 bg-amber-600 text-white text-[8px] lg:text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-6 w-[320px] sm:w-96 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-6 bg-[#064e3b] text-white flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-xs uppercase tracking-widest">Flux d'Activité</h3>
                      <p className="text-[10px] text-emerald-200 mt-0.5">{unreadCount} nouveaux messages</p>
                    </div>
                    <button onClick={clearNotifications} className="p-2 bg-emerald-800/50 hover:bg-emerald-800 rounded-xl transition-colors">
                      <CheckCircle2 size={16} className="text-emerald-300" />
                    </button>
                  </div>
                  <div className="max-h-[350px] lg:max-h-[450px] overflow-y-auto p-4 space-y-3">
                    {userNotifications.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Bell size={24} className="text-slate-200" />
                        </div>
                        <p className="text-slate-400 font-bold text-xs italic tracking-tight">Aucun événement récent</p>
                      </div>
                    ) : (
                      userNotifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`p-4 rounded-2xl transition-all cursor-pointer border ${!n.read ? 'bg-emerald-50/20 border-emerald-100 shadow-sm' : 'bg-white border-slate-50 opacity-60'}`}
                          onClick={() => markNotificationAsRead(n.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`mt-1 p-2 rounded-xl shrink-0 ${
                              n.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
                              n.type === 'warning' ? 'bg-amber-100 text-amber-600' :
                              n.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                              {n.type === 'success' ? <CheckCircle2 size={14} /> : 
                               n.type === 'warning' ? <AlertCircle size={14} /> : 
                               n.type === 'error' ? <X size={14} /> : <Info size={14} />}
                            </div>
                            <div className="flex-1">
                              <p className="text-[11px] font-black text-slate-900 mb-0.5 uppercase tracking-tight line-clamp-1">{n.title}</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{n.message}</p>
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">{new Date(n.timestamp).toLocaleTimeString()}</span>
                                {!n.read && <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 lg:h-10 w-px bg-slate-100" />
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] lg:text-xs font-black text-slate-900 leading-none">{user?.name}</p>
                <p className="text-[8px] lg:text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">ID: EC-221-{user?.id.toUpperCase()}</p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-[1rem] bg-[#064e3b] text-amber-400 flex items-center justify-center font-black text-lg lg:text-xl shadow-lg shadow-emerald-900/10">
                {user?.name[0]}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 bg-[#f8fafc]">
          {children}
        </div>
      </main>

      {showNotifs && <div className="fixed inset-0 z-20" onClick={() => setShowNotifs(false)} />}
    </div>
  );
};
