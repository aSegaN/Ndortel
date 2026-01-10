
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './views/Dashboard';
import { UserManagement } from './views/UserManagement';
import { CenterManagement } from './views/CenterManagement';
import { UserGuide } from './views/UserGuide';
import { Presentation } from './views/Presentation';
import { CertificateList } from './components/CertificateList';
import { CertificateForm } from './components/CertificateForm';
import { CertificateDetail } from './components/CertificateDetail';
import { Role, User, CertificateStatus } from './types';
import { ShieldCheck, Lock, ArrowRight, User as UserIcon, Building, ShieldAlert, Loader2 } from 'lucide-react';
import { BRAND } from './constants';
import { Logo } from './components/Logo';

const LoginPage: React.FC = () => {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      if (login(email, password)) {
        setError('');
      } else {
        setError('Accès refusé. Identifiants invalides.');
      }
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#064e3b] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-800/30 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-700/10 rounded-full blur-[120px]" />
      
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden relative z-10 border border-emerald-900/10">
        <div className="hidden lg:flex flex-col justify-between p-12 bg-[#064e3b] text-white relative">
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 backdrop-blur-md">
                <Logo size={40} />
              </div>
              <span className="text-2xl font-black tracking-tighter">{BRAND.name}</span>
            </div>
            <h2 className="text-4xl font-extrabold leading-tight">{BRAND.fullName}</h2>
            <p className="text-emerald-100/70 text-sm font-medium leading-relaxed">Le premier mot de chaque citoyen sénégalais mérite la sécurité absolue.</p>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-emerald-800/50 rounded-2xl border border-emerald-700/50">
              <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center">
                <ShieldCheck className="text-emerald-300" size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Souveraineté</p>
                <p className="text-xs font-bold">Identité Digitale Infalsifiable</p>
              </div>
            </div>
            <p className="text-[10px] font-medium text-emerald-200/50 italic">Version 2.5.0 "Ndortel" - Ministère de l'Intérieur</p>
          </div>
        </div>

        <div className="p-10 lg:p-16 flex flex-col justify-center space-y-8 bg-white">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900">Bienvenue</h1>
            <p className="text-slate-500 font-medium text-sm">Veuillez vous authentifier pour accéder au registre.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs font-bold flex items-center space-x-2">
                <ShieldAlert size={16} />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Identifiant professionnel</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="one-time-code"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 focus:outline-none font-semibold text-slate-900 transition-all"
                  placeholder="nom@etatcivil.sn"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Clé de sécurité</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 focus:outline-none font-semibold text-slate-900 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 py-4 bg-[#064e3b] text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[#043327] transition-all shadow-xl shadow-emerald-900/20 disabled:opacity-70 group"
              >
                <span>{isLoading ? 'Vérification...' : 'Accéder au Portail'}</span>
                {!isLoading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>

          <div className="flex items-center justify-center space-x-4 pt-6 text-slate-300">
            <div className="h-px bg-slate-100 flex-1"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Support Technique</span>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-[#064e3b] flex flex-col items-center justify-center text-white space-y-6">
    <div className="relative">
      <div className="w-24 h-24 border-4 border-emerald-800 rounded-full animate-spin border-t-amber-400" />
      <div className="absolute inset-0 m-auto flex items-center justify-center">
        <Logo size={40} />
      </div>
    </div>
    <div className="text-center space-y-2">
      <h2 className="text-xl font-black uppercase tracking-[0.2em]">{BRAND.name}</h2>
      <p className="text-emerald-100/60 text-xs font-bold italic animate-pulse">Initialisation du registre souverain sécurisé...</p>
    </div>
  </div>
);

const MainApp: React.FC = () => {
  const [tab, setTab] = useState('dashboard');
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState<CertificateStatus | 'ALL'>('ALL');
  const [yearFilter, setYearFilter] = useState<number | 'ALL'>(new Date().getFullYear());

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSelectedCertId(null);
    setEditingCertId(null);
    setShowForm(false);
  };

  const handleStatClick = (status: CertificateStatus | 'ALL', year: number | 'ALL') => {
    setStatusFilter(status);
    setYearFilter(year);
    setTab('certificates');
    setSelectedCertId(null);
    setEditingCertId(null);
    setShowForm(false);
  };

  const handleEdit = (id: string) => {
    setEditingCertId(id);
    setShowForm(true);
  };

  const renderContent = () => {
    if (showForm) return <CertificateForm certId={editingCertId || undefined} onCancel={() => { setShowForm(false); setEditingCertId(null); }} />;
    if (selectedCertId) return <CertificateDetail certId={selectedCertId} onBack={() => setSelectedCertId(null)} />;
    
    switch (tab) {
      case 'dashboard': 
        return <Dashboard onStatClick={handleStatClick} initialYear={yearFilter === 'ALL' ? new Date().getFullYear() : yearFilter} />;
      case 'certificates': 
        return (
          <CertificateList 
            onView={setSelectedCertId} 
            onEdit={handleEdit}
            onCreate={() => setShowForm(true)} 
            externalStatusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            externalYearFilter={yearFilter}
            onYearFilterChange={setYearFilter}
          />
        );
      case 'users':
        return <UserManagement />;
      case 'centers':
        return <CenterManagement />;
      case 'guide':
        return <UserGuide />;
      case 'presentation':
        return <Presentation onStart={() => handleTabChange('dashboard')} onGuide={() => handleTabChange('guide')} />;
      default: return <Dashboard onStatClick={handleStatClick} initialYear={yearFilter === 'ALL' ? new Date().getFullYear() : yearFilter} />;
    }
  };

  return (
    <Layout currentTab={tab} setTab={handleTabChange}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AuthConsumer />
    </AppProvider>
  );
};

const AuthConsumer: React.FC = () => {
  const { authState, isLoading } = useApp();
  
  if (isLoading) return <LoadingScreen />;
  
  return authState.isAuthenticated ? <MainApp /> : <LoginPage />;
};

export default App;
