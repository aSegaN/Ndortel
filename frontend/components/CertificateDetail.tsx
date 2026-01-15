// frontend/components/CertificateDetail.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CertificateStatus, Role, BirthCertificate, Center, ActionLog } from '../types';
import { generateCertificatePDF } from '../services/pdfService';
import {
   CheckCircle,
   ShieldCheck,
   ArrowLeft,
   Clock,
   Fingerprint,
   RefreshCw,
   FileDown,
   Image as ImageIcon,
   ChevronDown,
   ChevronUp,
   CreditCard,
   MapPin,
   Building,
   FileText,
   Calendar,
   Briefcase,
   Lock,
   History,
   ShieldAlert,
   Database,
   Sparkles,
   AlertTriangle,
   Zap,
   Shield,
   BadgeCheck,
   Scale
} from 'lucide-react';

async function computeSHA256(message: string): Promise<string> {
   const msgUint8 = new TextEncoder().encode(message);
   const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
   const hashArray = Array.from(new Uint8Array(hashBuffer));
   return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const CertificateDetail: React.FC<{ certId: string, onBack: () => void }> = ({ certId, onBack }) => {
   const { certificates, centers } = useApp();
   const [downloading, setDownloading] = useState(false);
   const [showDocs, setShowDocs] = useState(false);
   const [showHistory, setShowHistory] = useState(false);
   const [showPKI, setShowPKI] = useState(false);
   const [integrityStatus, setIntegrityStatus] = useState<'LOADING' | 'VERIFIED' | 'CORRUPTED'>('LOADING');

   const cert = certificates.find(c => c.id === certId);
   const center = centers.find(c => c.id === cert?.centerId);

   useEffect(() => {
      const verifyIntegrity = async () => {
         if (!cert || !cert.history || cert.history.length === 0) {
            setIntegrityStatus('VERIFIED');
            return;
         }
         try {
            let isValid = true;
            for (let i = 0; i < cert.history.length; i++) {
               const log = cert.history[i];
               const previousLog = cert.history[i - 1];
               const expectedPreviousHash = previousLog ? previousLog.hash : "0000000000000000000000000000000000000000000000000000000000000000";
               if (log.previousHash !== expectedPreviousHash) { isValid = false; break; }
               const dataToHash = JSON.stringify({ action: log.action, performedBy: log.performedBy, timestamp: log.timestamp, details: log.details, previousHash: log.previousHash });
               const computedHash = await computeSHA256(dataToHash);
               if (computedHash !== log.hash) { isValid = false; break; }
            }
            setIntegrityStatus(isValid ? 'VERIFIED' : 'CORRUPTED');
         } catch (e) { setIntegrityStatus('CORRUPTED'); }
      };
      verifyIntegrity();
   }, [cert]);

   if (!cert) return <div className="p-8 text-center font-bold text-red-600">Acte introuvable</div>;

   const handleDownloadPDF = async () => {
      setDownloading(true);
      try { await generateCertificatePDF(cert, center); }
      catch (error) { alert("Erreur génération PDF."); }
      finally { setDownloading(false); }
   };

   const ParentCard = ({ title, firstName, lastName, nin, birthDate, birthPlace, occupation, color }: any) => (
      <div className={`p-8 rounded-[2.5rem] border ${color} bg-white shadow-sm space-y-4`}>
         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</h4>
         <div className="space-y-3">
            <p className="text-xl font-black text-gray-900 uppercase leading-tight">{firstName} {lastName}</p>
            <div className="grid grid-cols-1 gap-2 text-xs font-bold text-gray-600">
               <div className="flex items-center space-x-2"><CreditCard size={14} className="text-gray-400" /><span>NIN: {nin}</span></div>
               <div className="flex items-center space-x-2"><Calendar size={14} className="text-gray-400" /><span>Né(e) le: {new Date(birthDate).toLocaleDateString('fr-FR')} à {birthPlace}</span></div>
               <div className="flex items-center space-x-2"><Briefcase size={14} className="text-gray-400" /><span>Profession: {occupation}</span></div>
            </div>
         </div>
      </div>
   );

   const DocCard = ({ label, src, icon: Icon = ImageIcon }: { label: string, src?: string, icon?: any }) => (
      <div className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</h4>
         {src ? (
            <>
               <img src={src} className="w-full h-40 object-cover rounded-lg border shadow-inner" />
               {label.includes('CNI') && <div className="absolute top-12 right-6 bg-emerald-600/80 text-white px-2 py-1 rounded-md flex items-center space-x-1" title="Masquage CDP actif"><Lock size={10} /><span className="text-[8px] font-black uppercase">CDP</span></div>}
            </>
         ) : <div className="w-full h-40 bg-gray-100 rounded-lg flex flex-col items-center justify-center border border-dashed text-gray-300"><Icon size={24} /><span className="text-[8px] mt-2 uppercase font-black">Indisponible</span></div>}
      </div>
   );

   return (
      <div className="space-y-8 pb-32 animate-in fade-in duration-500">
         <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm sticky top-0 z-20">
            <button onClick={onBack} className="flex items-center space-x-2 text-gray-600 hover:text-emerald-700 font-bold px-4 py-2 rounded-lg hover:bg-slate-50 transition-all"><ArrowLeft size={18} /><span>Retour</span></button>
            <div className="flex items-center space-x-3">
               {cert.pkiSignature && (
                  <div className="flex items-center space-x-2 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-sm">
                     <BadgeCheck size={16} className="text-emerald-600" />
                     <span>Signature Qualifiée PKI</span>
                  </div>
               )}
               <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${integrityStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100 animate-pulse'}`}>
                  {integrityStatus === 'VERIFIED' ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  <span>{integrityStatus === 'VERIFIED' ? 'Registre Intègre' : 'Chaîne Corrompue'}</span>
               </div>
               <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center space-x-2 px-6 py-2 bg-[#064e3b] text-white rounded-lg font-bold hover:bg-black transition-all shadow-lg disabled:opacity-50">
                  {downloading ? <RefreshCw size={18} className="animate-spin" /> : <FileDown size={18} />}<span>Extraire PDF Officiel</span>
               </button>
            </div>
         </div>

         <div className="bg-white border p-6 md:p-16 max-w-[1100px] mx-auto shadow-2xl space-y-12 relative overflow-hidden rounded-[4rem]">
            {/* FILIGRANE SOUVERAIN */}
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none -rotate-12 translate-x-1/4"><Database size={400} /></div>

            {/* SECTION SIGNATURE PKI (SI SIGNÉ) */}
            {cert.pkiSignature && (
               <section className="bg-emerald-900 text-white rounded-[3rem] p-10 relative overflow-hidden shadow-2xl animate-in slide-in-from-top-6 duration-700">
                  <div className="absolute top-0 right-0 p-10 opacity-10"><Shield size={180} /></div>
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                           <div className="p-4 bg-emerald-500 rounded-3xl shadow-lg">
                              <Lock size={28} />
                           </div>
                           <div>
                              <h3 className="text-2xl font-black uppercase tracking-tight">Acte Scellé Numériquement</h3>
                              <p className="text-emerald-200 text-xs font-medium">Certification de l'État Civil du Sénégal (Loi 2008-08)</p>
                           </div>
                        </div>
                        <button onClick={() => setShowPKI(!showPKI)} className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center space-x-2">
                           <span>{showPKI ? 'Masquer Détails PKI' : 'Vérifier Signature'}</span>
                           <ChevronDown className={`transition-transform ${showPKI ? 'rotate-180' : ''}`} size={16} />
                        </button>
                     </div>

                     {showPKI && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-white/10 animate-in fade-in duration-500">
                           <div className="space-y-4">
                              <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center">
                                    <Fingerprint size={14} className="mr-2" /> Certificat Émetteur
                                 </p>
                                 <p className="text-sm font-bold">{cert.pkiSignature.issuer}</p>
                                 <p className="text-[10px] font-mono text-emerald-200/50 mt-1">ID: {cert.pkiSignature.certificateId}</p>
                              </div>
                              <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center">
                                    <Calendar size={14} className="mr-2" /> Horodatage Légal
                                 </p>
                                 <p className="text-sm font-bold">{new Date(cert.pkiSignature.timestamp).toLocaleString('fr-FR')}</p>
                              </div>
                           </div>
                           <div className="space-y-4">
                              <div className="bg-black/20 p-5 rounded-2xl border border-white/5">
                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Signature Cryptographique (Digest)</p>
                                 <code className="text-[10px] font-mono break-all opacity-70 leading-relaxed block h-20 overflow-y-auto custom-scrollbar pr-2">
                                    {cert.pkiSignature.signatureValue}
                                 </code>
                              </div>
                              <div className="flex items-center space-x-4 p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                 <Scale size={20} className="text-amber-400 shrink-0" />
                                 <p className="text-[10px] font-bold italic leading-relaxed text-emerald-100">
                                    {cert.pkiSignature.legalNotice}
                                 </p>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </section>
            )}

            {/* SECTION IA GINDI DETECTEE */}
            {cert.fraudAnalysis && (
               <section className={`p-8 rounded-[2.5rem] border-2 relative overflow-hidden animate-in slide-in-from-top-4 duration-700 ${cert.fraudAnalysis.riskLevel === 'LOW' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <div className="absolute top-0 right-0 p-6 opacity-10"><Fingerprint size={100} /></div>
                  <div className="relative z-10">
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                           <div className={`p-3 rounded-2xl ${cert.fraudAnalysis.riskLevel === 'LOW' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                              <Shield size={24} />
                           </div>
                           <div>
                              <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg">Rapport de Conformité Gindi IA</h4>
                              <p className="text-slate-500 text-xs font-medium">Audit cryptographique et biométrique effectué le {new Date(cert.fraudAnalysis.analyzedAt).toLocaleDateString()}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Confiance</p>
                           <p className={`text-4xl font-black ${cert.fraudAnalysis.riskLevel === 'LOW' ? 'text-emerald-600' : 'text-red-600'}`}>{cert.fraudAnalysis.confidenceScore}%</p>
                        </div>
                     </div>

                     <div className="p-6 bg-white/50 rounded-3xl border border-white shadow-sm mb-6">
                        <p className="text-sm text-slate-700 font-bold leading-relaxed italic">"{cert.fraudAnalysis.summary}"</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {cert.fraudAnalysis.findings.map((f, i) => (
                           <div key={i} className={`p-4 rounded-2xl border flex items-start space-x-3 bg-white/40 ${f.severity === 'CRITICAL' ? 'border-red-200 shadow-sm' : 'border-slate-100'}`}>
                              <div className={`mt-1 p-1 rounded-lg ${f.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                 {f.severity === 'CRITICAL' ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                              </div>
                              <div>
                                 <p className="text-[8px] font-black uppercase text-slate-400">{f.category}</p>
                                 <p className="text-[10px] font-bold text-slate-700 mt-0.5 leading-tight">{f.detail}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </section>
            )}

            <div className="text-center border-b pb-12 relative z-10">
               <h2 className="text-3xl font-black text-emerald-950 uppercase tracking-tighter">République du Sénégal</h2>
               <p className="text-xs font-bold text-emerald-700/60 tracking-[0.4em] mt-2">SOUVERAINETÉ DE L'ÉTAT CIVIL</p>
            </div>

            <div className="py-12 text-center border-y border-dashed border-emerald-100 bg-emerald-50/20 rounded-[3rem] relative z-10">
               <h3 className="text-xl font-bold uppercase text-emerald-900 tracking-[0.2em] mb-4">Registre National Informatisé</h3>
               <p className="text-emerald-700 font-mono font-black text-2xl tracking-widest">ACTE N° {cert.registrationNumber}</p>
               <div className="mt-10 text-5xl md:text-7xl font-black uppercase tracking-tighter text-emerald-950">{cert.childFirstName} {cert.childLastName}</div>
               <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                  <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-emerald-100 flex items-center space-x-2">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sexe</span>
                     <span className="text-sm font-black text-emerald-900">{cert.childGender === 'M' ? 'MASCULIN' : 'FÉMININ'}</span>
                  </div>
                  <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-emerald-100 flex items-center space-x-2">
                     <Calendar className="text-emerald-600" size={14} />
                     <span className="text-sm font-black text-emerald-900">{new Date(cert.birthDate).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="bg-white px-6 py-2 rounded-full shadow-sm border border-emerald-100 flex items-center space-x-2">
                     <Clock className="text-emerald-600" size={14} />
                     <span className="text-sm font-black text-emerald-900">{cert.birthTime}</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
               <ParentCard title="Le Père" firstName={cert.fatherFirstName} lastName={cert.fatherLastName} nin={cert.fatherNin} birthDate={cert.fatherBirthDate} birthPlace={cert.fatherBirthPlace} occupation={cert.fatherOccupation} color="border-blue-100" />
               <ParentCard title="La Mère" firstName={cert.motherFirstName} lastName={cert.motherLastName} nin={cert.motherNin} birthDate={cert.motherBirthDate} birthPlace={cert.motherBirthPlace} occupation={cert.motherOccupation} color="border-pink-100" />
            </div>

            <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 relative z-10 flex items-center space-x-8">
               <div className="w-20 h-20 bg-white rounded-3xl border shadow-xl flex items-center justify-center text-emerald-600"><Building size={32} /></div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Structure de naissance certifiée</p>
                  <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">{cert.hospital}</p>
                  <p className="text-sm font-bold text-emerald-700 flex items-center mt-1"><MapPin size={16} className="mr-1" /> {cert.birthPlace}</p>
               </div>
            </div>

            <div className="space-y-4 pt-10 relative z-10">
               <button onClick={() => setShowDocs(!showDocs)} className="w-full flex items-center justify-between p-8 bg-slate-100 text-slate-700 rounded-[2.5rem] hover:bg-slate-200 transition-all border border-slate-200 shadow-sm">
                  <div className="flex items-center space-x-4"><ImageIcon size={24} /><span className="font-black uppercase text-sm tracking-widest">Pièces Justificatives Scannées (Conformité CDP)</span></div>
                  {showDocs ? <ChevronUp /> : <ChevronDown />}
               </button>
               {showDocs && (
                  <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-top-6 duration-700">
                     <DocCard label="Bulletin Hôpital (Scan Original)" src={cert.hospitalCertificateScan} icon={Building} />
                     <DocCard label="CNI Père (Photo Floutée)" src={cert.fatherCniRecto} icon={CreditCard} />
                     <DocCard label="CNI Mère (Photo Floutée)" src={cert.motherCniRecto} icon={CreditCard} />
                  </div>
               )}

               <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl hover:bg-black transition-all">
                  <div className="flex items-center space-x-4"><History size={24} /><span className="font-black uppercase text-sm tracking-widest">Chaîne de Confiance & Audit Trail</span></div>
                  {showHistory ? <ChevronUp /> : <ChevronDown />}
               </button>
               {showHistory && (
                  <div className="p-10 bg-slate-900 rounded-[3rem] space-y-8 border border-white/5 shadow-inner">
                     {cert.history.map((log, idx) => (
                        <div key={log.id} className="relative flex items-start space-x-8 group">
                           <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 font-black z-10 shrink-0 shadow-lg">{idx + 1}</div>
                           <div className="flex-1 bg-white/5 p-6 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
                              <div className="flex justify-between items-start mb-2">
                                 <p className="text-emerald-100 font-black text-xs uppercase tracking-widest">{log.action}</p>
                                 <span className="text-[10px] font-mono text-emerald-500/50 bg-black/30 px-2 py-0.5 rounded-full">{new Date(log.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Officier: {log.performedBy}</p>
                              <div className="space-y-1 bg-black/20 p-4 rounded-xl">
                                 <p className="text-[8px] font-black text-emerald-500/30 uppercase tracking-[0.2em]">Signature Cryptographique (SHA-256)</p>
                                 <code className="text-[10px] font-mono text-emerald-400/60 break-all leading-tight">{log.hash}</code>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};
