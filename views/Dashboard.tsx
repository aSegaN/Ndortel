import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import {
  FileText, CheckCircle2, Clock, ShieldCheck, Database,
  Calendar, Map, Filter, RefreshCcw, Globe, ArrowUpRight, Award, Zap,
  AlertTriangle, UserCheck, TrendingUp, Activity, Users, MapPin, Building
} from 'lucide-react';
import { CertificateStatus, Role } from '../types';

const COLORS = ['#064e3b', '#10b981', '#fbbf24', '#6366f1', '#f43f5e'];

const StatCard: React.FC<{
  title: string,
  value: number,
  icon: React.ReactNode,
  color: string,
  trend?: string,
  delay?: string,
  onClick?: () => void
}> = ({ title, value, icon, color, trend, delay, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 cursor-pointer group animate-in fade-in slide-in-from-bottom-4 ${delay}`}
  >
    <div className="flex items-start justify-between">
      <div className={`p-4 rounded-2xl ${color} shadow-inner group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      {trend && (
        <div className="flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          <ArrowUpRight size={12} strokeWidth={3} />
          <span className="text-[10px] font-black uppercase tracking-widest">{trend}</span>
        </div>
      )}
    </div>
    <div className="mt-6">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</p>
      <div className="flex items-baseline space-x-2">
        <h4 className="text-4xl font-extrabold text-slate-900 tracking-tighter">{value.toLocaleString()}</h4>
      </div>
    </div>
  </div>
);

interface DashboardProps {
  onStatClick: (status: CertificateStatus | 'ALL', year: number | 'ALL') => void;
  initialYear?: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ onStatClick, initialYear = new Date().getFullYear() }) => {
  const { certificates, authState, centers, users } = useApp();

  // ============================================
  // PROTECTION CONTRE UNDEFINED
  // ============================================
  const safeCertificates = certificates || [];
  const safeCenters = centers || [];
  const safeUsers = users || [];

  const user = authState.user;
  const isAdmin = user?.role === Role.ADMIN;
  const isAgent = user?.role === Role.AGENT;
  const isValidator = user?.role === Role.VALIDATOR || user?.role === Role.MANAGER;

  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(initialYear);

  const myCerts = useMemo(() => {
    if (isAdmin) return safeCertificates;
    if (isAgent) return safeCertificates.filter(c => c.createdBy === user?.id);
    return safeCertificates.filter(c => c.centerId === user?.centerId);
  }, [safeCertificates, user, isAdmin, isAgent]);

  const stats = useMemo(() => ({
    total: myCerts.length,
    pending: myCerts.filter(c => c.status === CertificateStatus.PENDING).length,
    signed: myCerts.filter(c => c.status === CertificateStatus.SIGNED).length,
    drafts: myCerts.filter(c => c.status === CertificateStatus.DRAFT).length,
    delivered: myCerts.filter(c => c.status === CertificateStatus.DELIVERED).length,
  }), [myCerts]);

  const monthlyData = useMemo(() => {
    const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
    return months.map((name, i) => ({
      name,
      volume: myCerts.filter(c => new Date(c.declarationDate).getMonth() === i).length,
      valides: myCerts.filter(c => new Date(c.declarationDate).getMonth() === i && c.status === CertificateStatus.SIGNED).length,
    }));
  }, [myCerts]);

  const genderData = useMemo(() => [
    { name: 'Garçons', value: myCerts.filter(c => c.childGender === 'M').length },
    { name: 'Filles', value: myCerts.filter(c => c.childGender === 'F').length },
  ], [myCerts]);

  const renderAgentDashboard = () => (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Mes Saisies" value={stats.total} icon={<FileText className="text-emerald-600" />} color="bg-emerald-50" trend="Perso" onClick={() => onStatClick('ALL', 'ALL')} />
        <StatCard title="À Corriger" value={stats.drafts} icon={<AlertTriangle className="text-red-600" />} color="bg-red-50" trend="Action" onClick={() => onStatClick(CertificateStatus.DRAFT, 'ALL')} />
        <StatCard title="En Attente" value={stats.pending} icon={<Clock className="text-amber-600" />} color="bg-amber-50" trend="Suivi" onClick={() => onStatClick(CertificateStatus.PENDING, 'ALL')} />
        <StatCard title="Mes Validés" value={stats.signed} icon={<UserCheck className="text-blue-600" />} color="bg-blue-50" trend="+5" onClick={() => onStatClick(CertificateStatus.SIGNED, 'ALL')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center">
            <TrendingUp size={20} className="mr-3 text-emerald-600" /> Mon Rythme de Saisie
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorAgent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                <Tooltip />
                <Area type="monotone" dataKey="volume" stroke="#10b981" strokeWidth={3} fill="url(#colorAgent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#064e3b] p-10 rounded-[2.5rem] shadow-xl text-white">
          <h3 className="text-lg font-black mb-6">Objectifs Journaliers</h3>
          <div className="space-y-6">
            <div className="p-4 bg-white/10 rounded-2xl">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black uppercase opacity-70">Saisie Quota</span>
                <span className="text-[10px] font-black">7/15</span>
              </div>
              <div className="h-2 bg-emerald-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 w-[46%]"></div>
              </div>
            </div>
            <div className="p-4 bg-white/10 rounded-2xl">
              <div className="flex justify-between mb-2">
                <span className="text-[10px] font-black uppercase opacity-70">Qualité (Sans Rejet)</span>
                <span className="text-[10px] font-black">98%</span>
              </div>
              <div className="h-2 bg-emerald-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 w-[98%]"></div>
              </div>
            </div>
          </div>
          <div className="mt-10 p-6 bg-emerald-800/50 rounded-2xl border border-emerald-700">
            <p className="text-xs font-bold italic opacity-80 leading-relaxed">"La rigueur de votre saisie aujourd'hui garantit l'identité des citoyens de demain."</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderValidatorDashboard = () => (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="File d'Attente" value={stats.pending} icon={<Activity className="text-amber-600" />} color="bg-amber-50" trend="Priorité" onClick={() => onStatClick(CertificateStatus.PENDING, 'ALL')} />
        <StatCard title="Signés" value={stats.signed} icon={<ShieldCheck className="text-emerald-600" />} color="bg-emerald-50" trend="Total" onClick={() => onStatClick(CertificateStatus.SIGNED, 'ALL')} />
        <StatCard title="Total du Centre" value={stats.total} icon={<Building className="text-blue-600" />} color="bg-blue-50" onClick={() => onStatClick('ALL', 'ALL')} />
        <StatCard title="Délivrés" value={stats.delivered} icon={<Award className="text-indigo-600" />} color="bg-indigo-50" onClick={() => onStatClick(CertificateStatus.DELIVERED, 'ALL')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center">
            <TrendingUp size={20} className="mr-3 text-emerald-600" /> Flux de Validation du Centre
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="valides" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center">
            Démographie (Inscriptions)
          </h3>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={genderData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              {genderData.map((entry, index) => (
                <div key={entry.name} className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-[10px] font-black uppercase text-slate-400">{entry.name} : {entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdminDashboard = () => (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Registre National" value={stats.total} icon={<Database className="text-blue-600" />} color="bg-blue-50" trend="Total" onClick={() => onStatClick('ALL', 'ALL')} />
        <StatCard title="En Attente" value={stats.pending} icon={<Clock className="text-amber-600" />} color="bg-amber-50" trend="Flux" onClick={() => onStatClick(CertificateStatus.PENDING, 'ALL')} />
        <StatCard title="Actes Signés" value={stats.signed} icon={<ShieldCheck className="text-emerald-600" />} color="bg-emerald-50" onClick={() => onStatClick(CertificateStatus.SIGNED, 'ALL')} />
        <StatCard title="Taux de Délivrance" value={Math.round((stats.delivered / (stats.total || 1)) * 100)} icon={<Award className="text-purple-600" />} color="bg-purple-50" trend="%" onClick={() => onStatClick(CertificateStatus.DELIVERED, 'ALL')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-50 shadow-sm">
          <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center">
            <Activity size={20} className="mr-3 text-emerald-600" /> Activité Nationale Consolidée
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip />
                <Line type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={4} dot={{ r: 6, fill: '#6366f1' }} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="valides" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-xl text-white">
          <h3 className="text-lg font-black mb-8 flex items-center">
            <ShieldCheck size={20} className="mr-3 text-emerald-400" /> Intégrité Système
          </h3>
          <div className="space-y-6">
            <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Dernière Signature Hash</p>
              <p className="text-[10px] font-mono opacity-60 truncate">SN-3A2B-F981-D92C-9011</p>
            </div>
            <div className="p-5 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Utilisateurs Connectés</p>
              <div className="flex -space-x-2 mt-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-emerald-700 flex items-center justify-center text-[10px] font-black">U{i}</div>)}
                <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-black">+12</div>
              </div>
            </div>
            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Générer Rapport Annuel</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-emerald-600">
            <Zap size={16} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
              Tableau de bord {isAdmin ? "Stratégique" : isValidator ? "de Contrôle" : "Opérationnel"}
            </span>
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'}</h1>
          <p className="text-slate-500 font-medium text-lg italic">
            {isAdmin ? "Supervision globale du registre national sénégalais." :
              isValidator ? `Gestion du flux d'état civil pour le centre de ${safeCenters.find(c => c.id === user?.centerId)?.name?.replace('Centre ', '') || 'votre centre'}.` :
                "Suivi de vos dossiers d'enregistrement et de saisie."}
          </p>
        </div>

        <div className="flex items-center space-x-3 p-2 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <button
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedYear === 2025 ? 'bg-[#064e3b] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            onClick={() => setSelectedYear(2025)}
          >
            2025
          </button>
          <button
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedYear === 'ALL' ? 'bg-[#064e3b] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
            onClick={() => setSelectedYear('ALL')}
          >
            Global
          </button>
        </div>
      </div>

      {isAgent && renderAgentDashboard()}
      {isValidator && renderValidatorDashboard()}
      {isAdmin && renderAdminDashboard()}
    </div>
  );
};