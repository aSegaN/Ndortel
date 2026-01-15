// frontend/views/UserManagement.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Role, User } from '../types';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Building,
  MoreVertical,
  Mail,
  BadgeCheck,
  UserCheck,
  Lock,
  X,
  Edit2,
  Trash2,
  Key,
  Check,
  AlertCircle,
  Calendar,
  Hash,
  Power,
  PowerOff,
  UserX
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { users, centers, addUser, updateUser, authState } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // État du formulaire
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: Role.AGENT,
    centerId: '',
    birthDate: '',
    registrationNumber: ''
  });

  // Validation du mot de passe
  const passwordCriteria = useMemo(() => ({
    length: formData.password.length >= 12,
    upper: /[A-Z]/.test(formData.password),
    lower: /[a-z]/.test(formData.password),
    digit: /[0-9]/.test(formData.password),
    special: /[^A-Za-z0-9]/.test(formData.password),
  }), [formData.password]);

  const isPasswordValid = editingUser && !formData.password
    ? true
    : Object.values(passwordCriteria).every(Boolean);

  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        centerId: user.centerId || '',
        birthDate: user.birthDate || '',
        registrationNumber: user.registrationNumber || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: Role.AGENT,
        centerId: '',
        birthDate: '',
        registrationNumber: ''
      });
    }
    setShowModal(true);
  };

  const handleToggleStatus = (user: User) => {
    if (user.id === authState.user?.id) {
      alert("Vous ne pouvez pas désactiver votre propre compte.");
      return;
    }

    const confirmMsg = user.active
      ? `Êtes-vous sûr de vouloir désactiver le compte de ${user.name} ? L'utilisateur ne pourra plus se connecter.`
      : `Voulez-vous réactiver le compte de ${user.name} ?`;

    if (window.confirm(confirmMsg)) {
      updateUser(user.id, { active: !user.active });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    if (editingUser) {
      const updateData = { ...formData };
      if (!(updateData as any).password) delete (updateData as any).password;
      updateUser(editingUser.id, updateData);
    } else {
      addUser(formData);
    }
    setShowModal(false);
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.ADMIN: return 'bg-purple-50 text-purple-700 border-purple-100';
      case Role.VALIDATOR: return 'bg-amber-50 text-amber-700 border-amber-100';
      case Role.AGENT: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 mb-2">
            <Shield size={16} fill="currentColor" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Administration Souveraine</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Collaborateurs</h1>
          <p className="text-slate-500 font-medium text-lg italic mt-1">Gestion des accès et habilitations des officiers d'état civil.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 px-8 py-4 bg-[#064e3b] text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#043327] transition-all shadow-xl shadow-emerald-900/20"
        >
          <UserPlus size={18} />
          <span>Nouveau Collaborateur</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <div className="relative max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un officier par nom, email ou matricule..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-8 py-5">Officier / Identité</th>
                <th className="px-8 py-5">Matricule</th>
                <th className="px-8 py-5">Rôle / Habilitation</th>
                <th className="px-8 py-5">État Compte</th>
                <th className="px-8 py-5">Affectation</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className={`transition-colors group ${!u.active ? 'bg-slate-50/50 grayscale-[0.5]' : 'hover:bg-slate-50/30'}`}>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${!u.active ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                        {u.name[0]}
                      </div>
                      <div>
                        <p className={`text-sm font-black leading-none ${!u.active ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{u.name}</p>
                        <p className="text-xs font-medium text-slate-400 mt-1 flex items-center">
                          <Mail size={12} className="mr-1" /> {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg w-fit">
                      <Hash size={12} className="mr-1 text-slate-400" /> {u.registrationNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${u.active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <span>{u.active ? 'Actif' : 'Désactivé'}</span>
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-xs font-bold text-slate-600">
                      <Building size={14} className="mr-2 text-slate-300" />
                      {centers.find(c => c.id === u.centerId)?.name || 'Portail National'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenModal(u)}
                        className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-2 transition-colors ${u.active ? 'text-slate-300 hover:text-red-600' : 'text-red-600 hover:text-emerald-600'}`}
                        title={u.active ? 'Désactiver le compte' : 'Réactiver le compte'}
                      >
                        {u.active ? <UserX size={20} /> : <UserCheck size={20} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de création/édition */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-[#064e3b] text-white flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black tracking-tight">{editingUser ? 'Modifier Officier' : 'Nouvel Officier'}</h2>
                <p className="text-emerald-100/70 text-xs font-medium uppercase tracking-widest mt-1">Habilitations Ndortel</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nom complet</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                    placeholder="Prénom et Nom"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date de Naissance</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        required
                        type="date"
                        value={formData.birthDate}
                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Matricule Professionnel</label>
                    <div className="relative">
                      <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        required
                        type="text"
                        value={formData.registrationNumber}
                        onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                        placeholder="Ex: AGT-2025-001"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adresse Email Professionnelle</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-bold text-sm"
                    placeholder="email@etatcivil.sn"
                  />
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      {editingUser ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe sécurisé'}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        required={!editingUser}
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className={`w-full pl-12 pr-5 py-3.5 bg-slate-50 border rounded-2xl outline-none font-bold text-sm transition-all ${formData.password ? (isPasswordValid ? 'border-emerald-500 focus:ring-emerald-500/10' : 'border-amber-500 focus:ring-amber-500/10') : 'border-slate-100 focus:ring-emerald-500/10 focus:border-emerald-600'
                          }`}
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>

                  {(formData.password || !editingUser) && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Critères de sécurité ANSSI</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {[
                          { label: '12+ caractères', met: passwordCriteria.length },
                          { label: 'Majuscule', met: passwordCriteria.upper },
                          { label: 'Minuscule', met: passwordCriteria.lower },
                          { label: 'Chiffre', met: passwordCriteria.digit },
                          { label: 'Spécial', met: passwordCriteria.special },
                        ].map((c, i) => (
                          <div key={i} className={`flex items-center space-x-2 text-[10px] font-bold ${c.met ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {c.met ? <Check size={12} /> : <AlertCircle size={12} />}
                            <span>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rôle</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as Role })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm appearance-none"
                    >
                      <option value={Role.AGENT}>Agent de saisie</option>
                      <option value={Role.VALIDATOR}>Validateur / Officier</option>
                      <option value={Role.ADMIN}>Administrateur</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Centre d'affectation</label>
                    <select
                      value={formData.centerId}
                      onChange={e => setFormData({ ...formData, centerId: e.target.value })}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm appearance-none"
                    >
                      <option value="">Portail National</option>
                      {centers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
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
                  disabled={!isPasswordValid}
                  className={`px-10 py-3.5 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all ${isPasswordValid ? 'bg-[#064e3b] shadow-emerald-900/20 hover:bg-[#043327]' : 'bg-slate-300 cursor-not-allowed shadow-none'
                    }`}
                >
                  {editingUser ? 'Mettre à jour' : 'Enregistrer Officier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
