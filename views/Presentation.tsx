
import React, { useRef } from 'react';
import { 
  ShieldCheck, 
  Zap, 
  Fingerprint, 
  Globe, 
  FileText, 
  Users, 
  CheckCircle2, 
  Lock, 
  ArrowRight,
  Sparkles,
  Smartphone,
  Stamp,
  Heart,
  Anchor,
  Scale,
  Award,
  BookOpen,
  BadgeCheck,
  Cpu,
  Database,
  Search,
  History,
  ChevronDown,
  Navigation
} from 'lucide-react';
import { BRAND } from '../constants';

// Fix: React.RefNode is not a valid type, changed to React.ReactNode
const ValueProp: React.FC<{ title: string; desc: string; icon: React.ReactNode, color: string }> = ({ title, desc, icon, color }) => (
  <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 p-6 sm:p-8 bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
    <div className={`shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${color} flex items-center justify-center text-white group-hover:scale-110 transition-transform shadow-lg`}>
      {icon}
    </div>
    <div className="space-y-2">
      <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);

interface PresentationProps {
  onStart: () => void;
  onGuide: () => void;
}

export const Presentation: React.FC<PresentationProps> = ({ onStart, onGuide }) => {
  const storyRef = useRef<HTMLDivElement>(null);
  const pillarsRef = useRef<HTMLDivElement>(null);
  const visionRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 sm:pb-32 animate-in fade-in duration-1000 px-2 sm:px-4 md:px-8">
      
      {/* NAVIGATION LOCALE - Scrollable on mobile */}
      <div className="sticky top-4 sm:top-6 z-50 mb-10 sm:mb-16 flex justify-center">
        <nav className="glass px-4 sm:px-8 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border border-white/40 shadow-2xl flex items-center space-x-6 sm:space-x-10 overflow-x-auto no-scrollbar max-w-full">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-[#064e3b] hover:opacity-70 transition-all whitespace-nowrap">Accueil</button>
          <button onClick={() => scrollTo(storyRef)} className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-[#064e3b] transition-all whitespace-nowrap">Histoire</button>
          <button onClick={() => scrollTo(pillarsRef)} className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-[#064e3b] transition-all whitespace-nowrap">Piliers</button>
          <button onClick={() => scrollTo(visionRef)} className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-[#064e3b] transition-all whitespace-nowrap">Vision 2050</button>
          <button onClick={() => scrollTo(techRef)} className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-[#064e3b] transition-all whitespace-nowrap">Technologie</button>
        </nav>
      </div>

      {/* SECTION HERO */}
      <section className="relative overflow-hidden rounded-[40px] sm:rounded-[64px] bg-[#064e3b] text-white p-8 sm:p-12 md:p-24 min-h-[600px] sm:min-h-[800px] flex flex-col justify-center shadow-[0_32px_64px_-16px_rgba(6,78,59,0.3)] mb-16 sm:mb-24">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
           <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-emerald-400 rounded-full blur-[180px]" />
           <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-amber-500 rounded-full blur-[180px]" />
        </div>

        <div className="relative z-10 max-w-4xl space-y-8 sm:space-y-12">
          <div className="inline-flex items-center space-x-3 bg-white/10 px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-white/20 backdrop-blur-xl">
            <Sparkles size={16} className="text-amber-400 sm:w-[18px]" />
            <span className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em]">Souveraineté Digitale</span>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <h1 className="text-4xl sm:text-6xl md:text-[9rem] font-black leading-[0.9] sm:leading-[0.8] tracking-tighter">
              {BRAND.name}<span className="text-amber-400">.</span>
            </h1>
            <p className="text-lg sm:text-2xl md:text-5xl font-medium text-emerald-50/90 italic tracking-tight leading-tight max-w-2xl">
              L'acte qui fonde la citoyenneté, la technologie qui la protège.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 pt-4">
            <button 
              onClick={onStart}
              className="w-full sm:w-auto px-10 sm:px-12 py-5 sm:py-6 bg-amber-500 text-white rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-2xl hover:bg-amber-600 hover:scale-105 transition-all flex items-center justify-center sm:justify-start space-x-3 group"
            >
              <span>Accéder au Portail</span>
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform sm:w-[20px]" />
            </button>
            <button 
              onClick={() => scrollTo(storyRef)}
              className="w-full sm:w-auto px-8 sm:px-10 py-5 sm:py-6 bg-white/10 border border-white/20 text-white rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center sm:justify-start space-x-3"
            >
              <span>Notre Vision</span>
              <ChevronDown size={18} className="sm:w-[20px]" />
            </button>
          </div>
        </div>

        {/* MOCK DE L'INTERFACE - Hidden on small mobile */}
        <div className="absolute right-[-5%] bottom-[-5%] w-[40%] h-[50%] bg-white/5 border border-white/10 rounded-[48px] backdrop-blur-2xl hidden lg:block animate-float overflow-hidden shadow-2xl z-0 pointer-events-none">
           <div className="p-8 sm:p-12 space-y-8 sm:space-y-10">
              <div className="flex items-center space-x-4 sm:space-x-6">
                 <div className="w-12 h-12 sm:w-16 sm:h-16 bg-emerald-500/30 rounded-xl sm:rounded-2xl" />
                 <div className="space-y-2 sm:space-y-3">
                    <div className="w-32 sm:w-48 h-3 sm:h-4 bg-white/30 rounded-full" />
                    <div className="w-20 sm:w-32 h-2 sm:h-3 bg-white/10 rounded-full" />
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-8">
                 <div className="h-24 sm:h-32 bg-white/10 rounded-2xl sm:rounded-3xl border border-white/10 shadow-inner" />
                 <div className="h-24 sm:h-32 bg-white/10 rounded-2xl sm:rounded-3xl border border-white/10 shadow-inner" />
              </div>
              <div className="h-32 sm:h-40 bg-emerald-500/5 rounded-2xl sm:rounded-3xl border border-white/10 flex items-center justify-center">
                 <ShieldCheck size={56} className="text-emerald-400/20 sm:w-[72px]" />
              </div>
           </div>
        </div>
      </section>

      {/* SECTION STORYTELLING */}
      <section ref={storyRef} className="py-20 sm:py-40 scroll-mt-24 sm:scroll-mt-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 sm:gap-16 items-center">
          <div className="lg:col-span-7 space-y-6 sm:space-y-10">
            <div className="inline-block px-4 sm:px-5 py-1.5 sm:py-2 bg-emerald-50 text-emerald-700 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-100">Le Sens du Ndortel</div>
            <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.95] sm:leading-[0.9]">Sortir de l'ombre de l'invisibilité.</h2>
            <div className="space-y-6 sm:space-y-8 text-lg sm:text-xl text-slate-500 font-medium leading-relaxed">
              <p>
                En Wolof, <span className="text-[#064e3b] font-black italic">Ndortel</span> signifie <span className="text-[#064e3b] font-black underline decoration-amber-400 decoration-4 sm:decoration-8 underline-offset-4">Le Commencement</span>. 
              </p>
              <p>
                Pendant trop longtemps, le commencement administratif d'un citoyen sénégalais a été marqué par la fragilité. Des milliers d'enfants naissaient sans que l'État ne puisse "les voir", entravant leur accès futur à l'école ou à la santé.
              </p>
              <div className="bg-slate-50 p-6 sm:p-10 rounded-[32px] sm:rounded-[48px] border-l-[8px] sm:border-l-[12px] border-[#064e3b] italic shadow-sm relative">
                <p className="text-[#064e3b] font-bold leading-relaxed text-base sm:text-lg">
                  "NDORTEL est né de la volonté de sécuriser ce premier souffle républicain. Nous transformons le papier vulnérable en une forteresse numérique souveraine."
                </p>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-5 grid grid-cols-2 gap-4 sm:gap-8 pt-8 lg:pt-0 relative px-2 sm:px-4">
            <div className="aspect-square bg-slate-200 rounded-[32px] sm:rounded-[56px] overflow-hidden shadow-2xl border-2 sm:border-4 border-white relative z-10 transition-transform hover:scale-105 duration-500">
               <img 
                 src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop" 
                 className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" 
                 alt="Enfant du Sénégal" 
                 onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544126592-807daa2b567b?q=80&w=600&auto=format&fit=crop'; }}
               />
               <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            <div className="aspect-square bg-amber-400 rounded-[32px] sm:rounded-[56px] p-6 sm:p-10 flex flex-col justify-end text-[#064e3b] shadow-2xl translate-y-6 sm:translate-y-12 z-20">
               <Fingerprint size={40} className="mb-4 sm:mb-6 sm:w-[56px] sm:h-[56px]" />
               <h4 className="text-xl sm:text-3xl font-black tracking-tighter leading-none uppercase">Un NIN unique dès le premier jour.</h4>
            </div>

            <div className="aspect-square bg-[#064e3b] rounded-[32px] sm:rounded-[56px] p-6 sm:p-10 flex flex-col justify-end text-white shadow-2xl -translate-y-4 sm:-translate-y-8 z-30">
               <Database size={40} className="mb-4 sm:mb-6 text-emerald-400 sm:w-[56px] sm:h-[56px]" />
               <h4 className="text-xl sm:text-3xl font-black tracking-tighter leading-none uppercase">Registre National Unifié.</h4>
            </div>

            <div className="aspect-square bg-slate-100 rounded-[32px] sm:rounded-[56px] overflow-hidden shadow-2xl border-2 sm:border-4 border-white translate-y-2 sm:translate-y-4 z-10">
               <img 
                 src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop" 
                 className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
                 alt="Officier d'état civil sénégalais" 
               />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION PHILOSOPHIE */}
      <section ref={pillarsRef} className="py-20 sm:py-40 scroll-mt-24 sm:scroll-mt-32">
        <div className="text-center space-y-4 sm:space-y-6 max-w-3xl mx-auto mb-16 sm:mb-24">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">Architecture de Confiance.</h2>
          <p className="text-lg sm:text-2xl text-slate-500 font-medium leading-relaxed px-4">
            Ndortel n'est pas qu'une application, c'est le nouveau socle de notre administration républicaine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
          <div className="group p-8 sm:p-12 bg-white rounded-[40px] sm:rounded-[64px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 sm:hover:-translate-y-4 transition-all duration-700">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-50 text-emerald-700 rounded-2xl sm:rounded-[32px] flex items-center justify-center mb-8 sm:mb-12 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <Anchor size={32} className="sm:w-[48px] sm:h-[48px]" />
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-widest mb-4 sm:mb-6">Ancrage Territorial</h4>
            <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed">
              La République est partout. Ndortel est conçu pour fonctionner dans les zones les plus isolées, avec des modes hybrides synchronisés.
            </p>
          </div>

          <div className="group p-8 sm:p-12 bg-white rounded-[40px] sm:rounded-[64px] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 sm:hover:-translate-y-4 transition-all duration-700">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-amber-50 text-amber-700 rounded-2xl sm:rounded-[32px] flex items-center justify-center mb-8 sm:mb-12 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
              <Scale size={32} className="sm:w-[48px] sm:h-[48px]" />
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-widest mb-4 sm:mb-6">Équité Juridique</h4>
            <p className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed">
              L'algorithme ne fait pas de favoritisme. Chaque déclaration suit un workflow strict, garantissant le droit égal à l'identité.
            </p>
          </div>

          <div className="group p-8 sm:p-12 bg-[#064e3b] rounded-[40px] sm:rounded-[64px] shadow-[0_32px_64px_-12px_rgba(6,78,59,0.3)] hover:-translate-y-2 sm:hover:-translate-y-4 transition-all duration-700 text-white md:col-span-2 lg:col-span-1">
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/10 text-amber-400 rounded-2xl sm:rounded-[32px] flex items-center justify-center mb-8 sm:mb-12 group-hover:scale-110 group-hover:bg-amber-400 group-hover:text-[#064e3b] transition-all shadow-sm">
              <ShieldCheck size={32} className="sm:w-[48px] sm:h-[48px]" />
            </div>
            <h4 className="text-xl sm:text-2xl font-black uppercase tracking-widest mb-4 sm:mb-6">Souveraineté Digitale</h4>
            <p className="text-base sm:text-lg text-emerald-100/70 font-medium leading-relaxed">
              Nos identités ne sont pas à vendre. Ndortel est hébergé exclusivement sur les serveurs de SENUM SA, sous contrôle régalien.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION VISION 2050 */}
      <section ref={visionRef} className="py-20 sm:py-32 scroll-mt-24 sm:scroll-mt-32">
        <div className="bg-slate-900 rounded-[48px] sm:rounded-[80px] overflow-hidden text-white flex flex-col lg:flex-row shadow-2xl relative min-h-[500px] sm:min-h-[650px]">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-emerald-600/10 blur-[120px] pointer-events-none" />
          
          <div className="flex-1 p-8 sm:p-12 md:p-24 space-y-8 sm:space-y-12 relative z-10 flex flex-col justify-center">
            <div className="inline-block px-5 sm:px-6 py-1.5 sm:py-2 bg-amber-500 text-white rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] shadow-lg w-fit">Sénégal 2050</div>
            <h2 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-[0.95] sm:leading-[0.85]">Préparer la Nation de demain.</h2>
            <p className="text-lg sm:text-xl text-slate-400 font-medium leading-relaxed max-w-xl">
              La Vision Sénégal 2050 exige une administration "zéro papier", agile et centrée sur l'usager. Ndortel est la première brique de cet édifice.
            </p>
            
            <div className="grid grid-cols-2 gap-8 sm:gap-12 pt-4 sm:pt-8">
               <div className="space-y-2 sm:space-y-4">
                  <div className="text-4xl sm:text-5xl md:text-6xl font-black text-emerald-400">0%</div>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500">Taux de fraude identitaire visé</p>
               </div>
               <div className="space-y-2 sm:space-y-4">
                  <div className="text-4xl sm:text-5xl md:text-6xl font-black text-amber-400">100%</div>
                  <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500">Registres Numérisés d'ici 2030</p>
               </div>
            </div>
            
            <div className="pt-4 sm:pt-8">
              <button 
                onClick={onGuide}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white text-slate-900 rounded-2xl sm:rounded-3xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center sm:justify-start space-x-4 shadow-xl"
              >
                <span>Consulter le guide technique</span>
                <BookOpen size={18} className="sm:w-[20px]" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden min-h-[300px] sm:min-h-[400px]">
             <img 
               src="https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1200&auto=format&fit=crop" 
               className="w-full h-full object-cover opacity-60 grayscale-[20%] hover:grayscale-0 transition-all duration-1000" 
               alt="Futur Sénégal Emergent" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
             <div className="absolute bottom-10 sm:bottom-16 left-8 sm:left-12 right-8 sm:right-12 text-left space-y-2 sm:space-y-4">
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] text-emerald-400">Projet Stratégique Majeur</p>
                <p className="text-2xl sm:text-4xl font-black leading-tight">Digitalisation Intégrale de l'État Civil Sénégalais</p>
             </div>
          </div>
        </div>
      </section>

      {/* SECTION TECHNOLOGIE GINDI IA */}
      <section ref={techRef} className="py-20 sm:py-40 scroll-mt-24 sm:scroll-mt-32">
        <div className="text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto mb-16 sm:mb-24 px-4">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none">L'Intelligence au service du Droit.</h2>
          <p className="text-xl sm:text-2xl text-slate-500 font-medium leading-relaxed italic">
            "La technologie n'est qu'un outil ; la justice est notre unique destination."
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
          <ValueProp 
            color="bg-indigo-600"
            icon={<Fingerprint size={28} className="sm:w-[32px]" />}
            title="Extraction Gindi (OCR IA)"
            desc="Notre moteur Gindi analyse les documents hospitaliers et les CNI pour automatiser la saisie. Précision accrue de 99%."
          />
          <ValueProp 
            color="bg-emerald-600"
            icon={<Stamp size={28} className="sm:w-[32px]" />}
            title="Sceau National Cryptographique"
            desc="Chaque signature d'officier est scellée par une empreinte unique (Hash). L'authenticité est vérifiable mondialement."
          />
          <ValueProp 
            color="bg-amber-500"
            icon={<Smartphone size={28} className="sm:w-[32px]" />}
            title="L'Identité Connectée"
            desc="Les citoyens reçoivent des extraits munis de QR Codes dynamiques. Une interopérabilité native."
          />
          <ValueProp 
            color="bg-slate-900"
            icon={<Users size={28} className="sm:w-[32px]" />}
            title="Chaîne de Responsabilité"
            desc="Un workflow granulaire auditable qui assure qu'aucune modification ne reste anonyme."
          />
        </div>
      </section>

      {/* SECTION PERFORMANCE */}
      <section className="bg-emerald-50 p-8 sm:p-12 md:p-24 rounded-[48px] sm:rounded-[80px] mb-20 sm:mb-40 shadow-inner">
        <div className="flex flex-col xl:flex-row items-center gap-12 sm:gap-20">
          <div className="flex-1 space-y-8 sm:space-y-10">
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black text-emerald-950 tracking-tighter leading-none">Une Performance Publique mesurable.</h2>
            <p className="text-lg sm:text-2xl text-emerald-800/70 font-medium leading-relaxed max-w-xl">
              Nous avons construit Ndortel pour répondre aux indicateurs de performance du Ministère. Des chiffres réels pour un impact durable.
            </p>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
               <div className="flex items-center space-x-3 bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-sm border border-emerald-100">
                  <BadgeCheck className="text-emerald-600 sm:w-[20px]" size={18} />
                  <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-emerald-900">Conformité CDP</span>
               </div>
               <div className="flex items-center space-x-3 bg-white px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-sm border border-emerald-100">
                  <BadgeCheck className="text-emerald-600 sm:w-[20px]" size={18} />
                  <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-emerald-900">Infrastructure SENUM</span>
               </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 w-full xl:w-auto">
             <div className="bg-white p-8 sm:p-12 rounded-[40px] sm:rounded-[56px] shadow-xl text-center flex-1 min-w-0 sm:min-w-[260px] border border-emerald-100 transition-transform hover:-translate-y-2">
                <div className="text-4xl sm:text-6xl font-black text-emerald-900 tracking-tighter">99.9%</div>
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 sm:mt-4">Disponibilité</p>
             </div>
             <div className="bg-white p-8 sm:p-12 rounded-[40px] sm:rounded-[56px] shadow-xl text-center flex-1 min-w-0 sm:min-w-[260px] border border-emerald-100 transition-transform hover:-translate-y-2">
                <div className="text-4xl sm:text-6xl font-black text-emerald-900 tracking-tighter">-90%</div>
                <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 sm:mt-4">Temps d'Attente</p>
             </div>
          </div>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="py-16 sm:py-24 text-center space-y-12 sm:space-y-16">
        <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto px-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 animate-pulse">
              <Heart fill="currentColor" size={32} className="sm:w-[40px]" />
            </div>
          </div>
          <h2 className="text-4xl sm:text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-none">Bâtissons le futur du Sénégal.</h2>
          <p className="text-lg sm:text-2xl text-slate-500 font-medium max-w-2xl mx-auto italic leading-relaxed">
            Chaque enfant enregistré dans Ndortel est une promesse tenue par la République.
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-8 px-4">
           <button 
             onClick={onStart}
             className="w-full md:w-auto px-12 sm:px-16 py-6 sm:py-8 bg-[#064e3b] text-white rounded-[32px] sm:rounded-[40px] font-black text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] shadow-2xl hover:bg-black transition-all"
           >
             Lancer le Ndortel
           </button>
           <button 
             onClick={onGuide}
             className="w-full md:w-auto px-10 sm:px-14 py-6 sm:py-8 bg-white text-slate-400 border border-slate-200 rounded-[32px] sm:rounded-[40px] font-black text-xs sm:text-sm uppercase tracking-[0.2em] sm:tracking-[0.3em] hover:bg-slate-50 transition-all flex items-center justify-center space-x-4 shadow-sm"
           >
             <BookOpen size={20} className="sm:w-[24px]" />
             <span>Documentation</span>
           </button>
        </div>
      </section>
    </div>
  );
};
