
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CertificateStatus, Role } from '../types';
import { STATUS_CONFIG, SENEGAL_GEOGRAPHY } from '../constants';
import { Eye, Filter, PlusCircle, MapPin, Search, ChevronLeft, ChevronRight, FileType, Hash, Edit2 } from 'lucide-react';

const ITEMS_PER_PAGE = 25;

interface CertificateListProps {
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onCreate: () => void;
  externalStatusFilter?: CertificateStatus | 'ALL';
  onStatusFilterChange?: (status: CertificateStatus | 'ALL') => void;
  externalYearFilter?: number | 'ALL';
  onYearFilterChange?: (year: number | 'ALL') => void;
}

export const CertificateList: React.FC<CertificateListProps> = ({ 
  onView, 
  onEdit,
  onCreate, 
  externalStatusFilter = 'ALL',
  onStatusFilterChange,
  externalYearFilter = 'ALL',
  onYearFilterChange
}) => {
  const { certificates, authState, centers } = useApp();
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'NORMAL' | 'JUGEMENT'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const user = authState.user;
  const isAdmin = user?.role === Role.ADMIN;
  
  const statusFilter = externalStatusFilter;
  const setStatusFilter = onStatusFilterChange || (() => {});
  const yearFilter = externalYearFilter;
  const setYearFilter = onYearFilterChange || (() => {});

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(certificates.map(c => c.registrationYear)));
    return (years as number[]).sort((a: number, b: number) => b - a);
  }, [certificates]);

  const filteredCerts = useMemo(() => {
    let result = (isAdmin 
      ? certificates 
      : certificates.filter(c => c.centerId === user?.centerId));

    if (statusFilter !== 'ALL') {
      result = result.filter(c => c.status === statusFilter);
    }

    if (yearFilter !== 'ALL') {
      result = result.filter(c => c.registrationYear === yearFilter);
    }

    if (isAdmin && regionFilter !== 'ALL') {
      const regionCenters = centers.filter(c => c.region === regionFilter).map(c => c.id);
      result = result.filter(c => regionCenters.includes(c.centerId));
    }

    if (typeFilter === 'NORMAL') {
      result = result.filter(c => !c.isLateRegistration);
    } else if (typeFilter === 'JUGEMENT') {
      result = result.filter(c => c.isLateRegistration);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.registrationNumber.toLowerCase().includes(lowerSearch) ||
        c.childFirstName.toLowerCase().includes(lowerSearch) ||
        c.childLastName.toLowerCase().includes(lowerSearch)
      );
    }

    return result.sort((a, b) => b.registrationNumber.localeCompare(a.registrationNumber));
  }, [certificates, user, isAdmin, statusFilter, regionFilter, yearFilter, typeFilter, searchTerm, centers]);

  const totalPages = Math.ceil(filteredCerts.length / ITEMS_PER_PAGE);
  const paginatedCerts = filteredCerts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setRegionFilter('ALL');
    setTypeFilter('ALL');
    setYearFilter('ALL');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex flex-col space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[300px] max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Rechercher par N° d'acte, Prénom ou Nom de l'enfant..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
            
            <div className="flex items-center space-x-3">
              {user?.role === Role.AGENT && (
                <button 
                  onClick={onCreate}
                  className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold shadow-lg shadow-emerald-100"
                >
                  <PlusCircle size={20} />
                  <span>Nouvel Acte</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 text-gray-400 mr-2">
              <Filter size={14} className="text-gray-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">Affiner :</span>
            </div>

            <select 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              value={yearFilter}
              onChange={(e) => { setYearFilter(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value)); setCurrentPage(1); }}
            >
              <option value="ALL">Toutes les années</option>
              {availableYears.map(year => (
                <option key={year} value={year}>Année {year}</option>
              ))}
            </select>

            <select 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="ALL">Tous les statuts</option>
              {Object.values(CertificateStatus).map(s => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>

            {isAdmin && (
              <div className="flex items-center space-x-2">
                <select 
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={regionFilter}
                  onChange={(e) => { setRegionFilter(e.target.value); setCurrentPage(1); }}
                >
                  <option value="ALL">Toutes les régions</option>
                  {Object.keys(SENEGAL_GEOGRAPHY).map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>
            )}

            <select 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value as any); setCurrentPage(1); }}
            >
              <option value="ALL">Tous les types</option>
              <option value="NORMAL">Normal</option>
              <option value="JUGEMENT">Jugement</option>
            </select>

            <div className="ml-auto text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
               {filteredCerts.length.toLocaleString()} Résultats
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
              <tr>
                <th className="px-6 py-4">Numéro d'Acte</th>
                {isAdmin && <th className="px-6 py-4">Centre émetteur</th>}
                <th className="px-6 py-4">Identité Enfant</th>
                <th className="px-6 py-4">Naissance</th>
                <th className="px-6 py-4 text-center">Origine</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedCerts.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-gray-50 rounded-full text-gray-300">
                        <FileType size={48} />
                      </div>
                      <p className="text-gray-500 font-medium italic">Aucun acte ne correspond à votre recherche actuelle.</p>
                      <button 
                        onClick={resetFilters}
                        className="text-emerald-600 font-bold text-xs uppercase hover:underline"
                      >
                        Réinitialiser tous les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4 font-mono text-sm font-bold text-emerald-800">
                      {cert.registrationNumber}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-1 uppercase text-[10px] font-bold text-gray-400">
                          <MapPin size={10} className="text-blue-500" />
                          <span className="truncate max-w-[120px]" title={centers.find(c => c.id === cert.centerId)?.name}>
                            {centers.find(c => c.id === cert.centerId)?.name.replace('Centre ', '')}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 uppercase text-sm tracking-tight">{cert.childFirstName} {cert.childLastName}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase">{cert.childGender === 'M' ? 'Masculin' : 'Féminin'}</div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="text-sm font-medium text-gray-700">{new Date(cert.birthDate).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                       {cert.isLateRegistration ? (
                         <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 uppercase tracking-tighter shadow-sm">JUGEMENT</span>
                       ) : (
                         <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-tighter shadow-sm">NORMAL</span>
                       )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${STATUS_CONFIG[cert.status].color} border-current/10`}>
                        <span>{STATUS_CONFIG[cert.status].label}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {cert.status === CertificateStatus.DRAFT && onEdit && user?.role === Role.AGENT && (
                          <button 
                            onClick={() => onEdit(cert.id)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Modifier le brouillon"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        <button 
                          onClick={() => onView(cert.id)}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all inline-flex items-center shadow-sm group-hover:scale-110"
                          title="Voir les détails"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-8 py-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-sm text-gray-500 font-medium italic">
            Visualisation de <span className="font-bold text-gray-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> à <span className="font-bold text-gray-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredCerts.length)}</span> sur <span className="font-bold text-gray-900">{filteredCerts.length.toLocaleString()}</span> résultats
          </div>
          <div className="flex items-center space-x-3">
            <button 
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-gray-600 shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="flex items-center space-x-1.5">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = currentPage;
                if (currentPage < 3) pageNum = i + 1;
                else if (currentPage > totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                
                if (pageNum <= 0 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${
                      currentPage === pageNum 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                        : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-gray-600 shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
