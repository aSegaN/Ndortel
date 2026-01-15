
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Center } from '../types';
import { 
  MapPin, 
  Building2, 
  Plus, 
  Globe, 
  Search, 
  Navigation, 
  ChevronRight,
  Hash,
  Database,
  X,
  Edit2,
  Building
} from 'lucide-react';

export const CenterManagement: React.FC = () => {
  const { centers, addCenter, updateCenter } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    region: 'Dakar',
    department: '',
    commune: '',
    address: ''
  });

  const filteredCenters = centers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.region.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (center?: Center) => {
    if (center) {
      setEditingCenter(center);
      setFormData({
        name: center.name,
        code: center.code,
        region: center.region,
        department: center.department,
        commune: center.commune,
        address: center.address
      });
    } else {
      setEditingCenter(null);
      setFormData({
        name: '',
        code: '',
        region: 'Dakar',
        department: '',
        commune: '',
        address: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCenter) {
      updateCenter(editingCenter.id, formData);
    } else {
      addCenter(formData);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 mb-2">
            <Globe size={16} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Infrastructures Nationales</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Centres d'État Civil</h1>
          <p className="text-slate-500 font-medium text-lg italic mt-1">Maillage territorial et gestion des autorités d'enregistrement.</p>
        </div>

        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-8 py-4 bg-[#064e3b] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#043327] transition-all shadow-xl shadow-emerald-900/20"
        >
          <Plus size={18} />
          <span>Ouvrir un Centre</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Recherche & Filtre</h3>
            <div className="relative mb-6">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Code ou Nom du centre..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-[#064e3b] p-8 rounded-[2.5rem] shadow-xl text-white">
            <div className="flex items-center space-x-3 mb-4">
              <Database size={20} className="text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Répartition</span>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-100/70">Total Centres</span>
                <span className="text-xl font-black">{centers.length}</span>
              </div>
              <div className="h-px bg-emerald-800"></div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-100/70">Régions Couvertes</span>
                <span className="text-xl font-black">{new Set(centers.map(c => c.region)).size}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {filteredCenters.map((c) => (
            <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-800 group-hover:bg-emerald-50 transition-colors">
                    <Building2 size={32} strokeWidth={1.5} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">{c.name}</h4>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] font-black rounded uppercase tracking-widest">
                        Code: {c.code}
                      </span>
                    </div>
                    <div className="flex items-center mt-2 space-x-4">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center">
                        <MapPin size={12} className="mr-1" /> {c.region} / {c.department}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 italic">
                        {c.address}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleOpenModal(c)}
                    className="p-3 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button className="p-4 bg-slate-50 text-slate-300 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-[#064e3b] text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{editingCenter ? 'Modifier Centre' : 'Ouvrir un Centre'}</h2>
                <p className="text-emerald-100/70 text-xs font-medium uppercase tracking-widest mt-1">Expansion Territoriale</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom du centre</label>
                    <input 
                      required
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                      placeholder="Centre Civil de..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code National</label>
                    <input 
                      required
                      type="text"
                      maxLength={4}
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                      placeholder="0001"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Région</label>
                    <input 
                      required
                      type="text"
                      value={formData.region}
                      onChange={e => setFormData({...formData, region: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                      placeholder="Dakar"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Département</label>
                    <input 
                      required
                      type="text"
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                      placeholder="Dakar"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commune</label>
                    <input 
                      required
                      type="text"
                      value={formData.commune}
                      onChange={e => setFormData({...formData, commune: e.target.value})}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                      placeholder="Plateau"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse physique complète</label>
                  <textarea 
                    required
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    rows={2}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm resize-none"
                    placeholder="Place de l'Indépendance, Dakar BP 4022"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end space-x-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-8 py-3.5 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="px-10 py-3.5 bg-[#064e3b] text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/20 hover:bg-[#043327] transition-all"
                >
                  {editingCenter ? 'Mettre à jour' : 'Enregistrer Centre'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
