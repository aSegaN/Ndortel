// frontend/views/UserGuide.tsx
import React from 'react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import {
  BookOpen,
  ShieldCheck,
  FileText,
  Users,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Fingerprint,
  Info,
  ChevronRight,
  Stamp,
  Search,
  Database,
  // Added MapPin and HelpCircle to fix "Cannot find name" errors
  MapPin,
  HelpCircle
} from 'lucide-react';

const GuideSection: React.FC<{ title: string; children: React.ReactNode; icon: React.ReactNode; color: string }> = ({ title, children, icon, color }) => (
  <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className={`p-8 ${color} text-white flex items-center space-x-4`}>
      <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
        {icon}
      </div>
      <h3 className="text-xl font-black uppercase tracking-tight">{title}</h3>
    </div>
    <div className="p-10 space-y-8">
      {children}
    </div>
  </div>
);

const ProtocolItem: React.FC<{ title: string; desc: string; step: number }> = ({ title, desc, step }) => (
  <div className="flex items-start space-x-6 group">
    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-700 flex items-center justify-center font-black text-lg transition-all shrink-0 border border-slate-100 group-hover:border-emerald-200">
      {step}
    </div>
    <div>
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{title}</h4>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);

export const UserGuide: React.FC = () => {
  const { authState } = useApp();
  const role = authState.user?.role;

  const renderAgentGuide = () => (
    <div className="space-y-12">
      <GuideSection title="Votre Mission d'Agent de Saisie" icon={<FileText />} color="bg-emerald-800">
        <div className="space-y-6">
          <p className="text-slate-600 font-medium italic">En tant qu'Agent de Saisie, vous êtes le premier maillon de la chaîne de confiance. Votre rigueur garantit l'intégrité de l'identité nationale.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center">
                <Zap size={14} className="mr-2" /> Responsabilités Clés
              </h5>
              <ul className="space-y-3">
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Saisie exhaustive et sans fautes</span>
                </li>
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Vérification des originaux (CNI, Bulletin)</span>
                </li>
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Gestion des délais légaux</span>
                </li>
              </ul>
            </div>
            <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
              <h5 className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-4 flex items-center">
                <AlertTriangle size={14} className="mr-2" /> Points de Vigilance
              </h5>
              <ul className="space-y-3">
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <Info size={14} className="text-amber-500" />
                  <span>Déclenchement du mode "Jugement" après 6 mois</span>
                </li>
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <Info size={14} className="text-amber-500" />
                  <span>Conformité de l'OCR sur les CNI des parents</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-8 pt-8 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Protocole d'Enregistrement</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <ProtocolItem step={1} title="Vérification Documentaire" desc="Récupérez le bulletin de naissance de l'hôpital et les CNI recto-verso des deux parents." />
            <ProtocolItem step={2} title="Numérisation OCR" desc="Utilisez les outils d'extraction automatique pour limiter les erreurs de frappe sur les noms et NIN." />
            <ProtocolItem step={3} title="Contrôle de Filiation" desc="Assurez-vous que le nom de famille de l'enfant correspond à celui déclaré par le père." />
            <ProtocolItem step={4} title="Soumission" desc="Vérifiez une dernière fois la date de naissance avant d'envoyer l'acte à la signature de l'Officier." />
          </div>
        </div>
      </GuideSection>
    </div>
  );

  const renderValidatorGuide = () => (
    <div className="space-y-12">
      <GuideSection title="Votre Rôle d'Officier d'État Civil" icon={<Stamp />} color="bg-[#064e3b]">
        <div className="space-y-6">
          <p className="text-slate-600 font-medium italic">En tant qu'Officier (Validateur/Responsable), vous exercez une autorité légale. Votre signature engage la responsabilité de l'État.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-4 flex items-center">
                <Zap size={14} className="mr-2" /> Pouvoir de Signature
              </h5>
              <ul className="space-y-3">
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Validation finale du registre informatisé</span>
                </li>
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Délivrance sécurisée des extraits</span>
                </li>
                <li className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Signature cryptographique horodatée</span>
                </li>
              </ul>
            </div>
            <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
              <h5 className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-4 flex items-center">
                <Fingerprint size={14} className="mr-2" /> Sécurité Juridique
              </h5>
              <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                Chaque acte signé par vos soins génère un Hash unique SunuCivil. Ce code permet à n'importe quelle autorité de vérifier l'authenticité de l'extrait via le QR code intégré.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 pt-8 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Protocole de Validation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <ProtocolItem step={1} title="Examen du Dossier" desc="Consultez la liste des actes 'En attente' et visualisez les scans originaux joints par l'agent." />
            <ProtocolItem step={2} title="Vérification de Cohérence" desc="Comparez les données saisies avec les images des pièces d'identité (CNI)." />
            <ProtocolItem step={3} title="Signature Numérique" desc="Appliquez votre sceau électronique pour transformer le brouillon en Acte Officiel enregistré." />
            <ProtocolItem step={4} title="Délivrance" desc="Une fois signé, l'acte peut être imprimé en PDF pour le citoyen (Extraire PDF Officiel)." />
          </div>
        </div>
      </GuideSection>
    </div>
  );

  const renderAdminGuide = () => (
    <div className="space-y-12">
      <GuideSection title="Gouvernance du Système National" icon={<ShieldCheck />} color="bg-slate-900">
        <div className="space-y-6">
          <p className="text-slate-600 font-medium italic">En tant qu'Administrateur, vous pilotez l'architecture de confiance du système SunuCivil à l'échelle nationale.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center">
                <Users size={14} className="mr-2 text-indigo-500" /> Gestion des Accès
              </h5>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Vous devez veiller à ce que chaque officier soit affecté au bon centre. Désactivez immédiatement les accès en cas de changement de poste ou de départ.
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center">
                <MapPin size={14} className="mr-2 text-emerald-500" /> Maillage Territorial
              </h5>
              <p className="text-xs font-medium text-slate-500 leading-relaxed">
                Créez les nouveaux centres secondaires. Chaque centre possède un code unique qui préfixe les numéros d'actes (Ex: 0001 pour Plateau).
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8 pt-8 border-t border-slate-100">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Protocole d'Audit</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <ProtocolItem step={1} title="Monitoring du Flux" desc="Surveillez le tableau de bord pour détecter les engorgements dans certains centres (retards de signature)." />
            <ProtocolItem step={2} title="Contrôle d'Intégrité" desc="Assurez-vous que les serveurs de synchronisation sont opérationnels pour la base de données nationale." />
            <ProtocolItem step={3} title="Support Technique" desc="Accompagnez les agents sur l'utilisation des outils OCR et la gestion des cas complexes (jugements)." />
            <ProtocolItem step={4} title="Rapports Stratégiques" desc="Générez des statistiques par région pour le Ministère de l'Intérieur." />
          </div>
        </div>
      </GuideSection>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      {/* Header Premium */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2 text-amber-600">
          <BookOpen size={16} fill="currentColor" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centre de Connaissances</span>
        </div>
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">Guide & Protocoles</h1>
        <p className="text-slate-500 font-medium text-lg italic mt-1">
          Votre manuel d'utilisation personnalisé pour le rôle de <span className="text-emerald-700 font-black uppercase tracking-widest text-sm bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">{role}</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {role === Role.AGENT && renderAgentGuide()}
        {role === Role.VALIDATOR && renderValidatorGuide()}
        {role === Role.MANAGER && renderValidatorGuide()}
        {role === Role.ADMIN && renderAdminGuide()}

        {/* Section FAQ Commune */}
        <div className="bg-amber-50 p-12 rounded-[3.5rem] border border-amber-100 flex flex-col md:flex-row items-center gap-10">
          <div className="shrink-0 w-24 h-24 bg-white rounded-3xl shadow-xl shadow-amber-900/10 flex items-center justify-center text-amber-500">
            <HelpCircle size={48} />
          </div>
          <div className="flex-1 space-y-4">
            <h3 className="text-2xl font-black text-amber-900 tracking-tight uppercase">Une question technique ?</h3>
            <p className="text-amber-800/70 font-medium leading-relaxed">
              Consultez notre base de connaissance étendue ou contactez le support national au <span className="font-bold text-amber-900">800 00 221</span> (Appel gratuit).
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button className="px-6 py-3 bg-white text-amber-700 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-md transition-all">Télécharger Manuel PDF</button>
              <button className="px-6 py-3 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-900/20 hover:bg-amber-700 transition-all">Contacter le Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
