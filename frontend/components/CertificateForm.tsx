// ============================================
// FICHIER: frontend/components/CertificateForm.tsx
// VERSION: 2.0.0 - Sécurisé (Proxy Backend AI)
// ============================================
// CHANGEMENTS DE SÉCURITÉ:
// - Suppression de l'import direct @google/genai
// - Utilisation du service aiService pour tous les appels IA
// - La clé API n'est plus exposée côté client
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { aiService, CNIRectoData, FraudAnalysis } from '../services/aiService';
import {
  BirthCertificate,
  CertificateStatus,
  Role,
  FraudFinding
} from '../types';
import { SENEGAL_GEOGRAPHY } from '../constants';
import {
  Save,
  Send,
  X,
  Upload,
  User,
  Baby,
  FileText,
  Calendar,
  MapPin,
  Briefcase,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Scan,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Camera,
  Eye,
  EyeOff,
  Sparkles,
  Brain,
  Fingerprint,
  AlertCircle,
  Info
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface CertificateFormProps {
  certificate?: BirthCertificate;
  onClose: () => void;
  onSave: (certificate: Partial<BirthCertificate>, status: CertificateStatus) => void;
}

interface FormData {
  // Enfant
  childFirstName: string;
  childLastName: string;
  childGender: 'M' | 'F' | '';
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  hospital: string;
  hospitalCertificateScan: string;

  // Père
  fatherFirstName: string;
  fatherLastName: string;
  fatherBirthDate: string;
  fatherBirthPlace: string;
  fatherOccupation: string;
  fatherAddress: string;
  fatherNin: string;
  fatherCniRecto: string;
  fatherCniVerso: string;

  // Mère
  motherFirstName: string;
  motherLastName: string;
  motherBirthDate: string;
  motherBirthPlace: string;
  motherOccupation: string;
  motherAddress: string;
  motherNin: string;
  motherCniRecto: string;
  motherCniVerso: string;

  // Jugement (inscription tardive)
  isLateRegistration: boolean;
  judgmentCourt: string;
  judgmentDate: string;
  judgmentNumber: string;
  judgmentRegistrationDate: string;

  // Analyse IA
  fraudAnalysis: FraudAnalysis | null;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export const CertificateForm: React.FC<CertificateFormProps> = ({
  certificate,
  onClose,
  onSave
}) => {
  const { authState, centers } = useApp();
  const user = authState.user;
  const isEditing = !!certificate;

  // ============================================
  // ÉTAT DU FORMULAIRE
  // ============================================

  const [formData, setFormData] = useState<FormData>({
    childFirstName: certificate?.childFirstName || '',
    childLastName: certificate?.childLastName || '',
    childGender: certificate?.childGender || '',
    birthDate: certificate?.birthDate || '',
    birthTime: certificate?.birthTime || '',
    birthPlace: certificate?.birthPlace || '',
    hospital: certificate?.hospital || '',
    hospitalCertificateScan: certificate?.hospitalCertificateScan || '',

    fatherFirstName: certificate?.fatherFirstName || '',
    fatherLastName: certificate?.fatherLastName || '',
    fatherBirthDate: certificate?.fatherBirthDate || '',
    fatherBirthPlace: certificate?.fatherBirthPlace || '',
    fatherOccupation: certificate?.fatherOccupation || '',
    fatherAddress: certificate?.fatherAddress || '',
    fatherNin: certificate?.fatherNin || '',
    fatherCniRecto: certificate?.fatherCniRecto || '',
    fatherCniVerso: certificate?.fatherCniVerso || '',

    motherFirstName: certificate?.motherFirstName || '',
    motherLastName: certificate?.motherLastName || '',
    motherBirthDate: certificate?.motherBirthDate || '',
    motherBirthPlace: certificate?.motherBirthPlace || '',
    motherOccupation: certificate?.motherOccupation || '',
    motherAddress: certificate?.motherAddress || '',
    motherNin: certificate?.motherNin || '',
    motherCniRecto: certificate?.motherCniRecto || '',
    motherCniVerso: certificate?.motherCniVerso || '',

    isLateRegistration: certificate?.isLateRegistration || false,
    judgmentCourt: certificate?.judgmentCourt || '',
    judgmentDate: certificate?.judgmentDate || '',
    judgmentNumber: certificate?.judgmentNumber || '',
    judgmentRegistrationDate: certificate?.judgmentRegistrationDate || '',

    fraudAnalysis: certificate?.fraudAnalysis || null
  });

  // États UI
  const [activeTab, setActiveTab] = useState<'child' | 'father' | 'mother' | 'documents'>('child');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États OCR
  const [isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [ocrTarget, setOcrTarget] = useState<'father' | 'mother' | null>(null);

  // États Analyse Fraude
  const [isAnalyzingFraud, setIsAnalyzingFraud] = useState(false);
  const [fraudScanPhase, setFraudScanPhase] = useState<string>('');

  // États visibilité images
  const [showFatherCni, setShowFatherCni] = useState(false);
  const [showMotherCni, setShowMotherCni] = useState(false);

  // ============================================
  // EFFETS
  // ============================================

  // Synchroniser le nom de l'enfant avec celui du père
  useEffect(() => {
    if (formData.fatherLastName && !formData.childLastName) {
      setFormData(prev => ({
        ...prev,
        childLastName: prev.fatherLastName
      }));
    }
  }, [formData.fatherLastName]);

  // Détection automatique inscription tardive (> 6 mois)
  useEffect(() => {
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const diffMonths = (today.getFullYear() - birthDate.getFullYear()) * 12
        + (today.getMonth() - birthDate.getMonth());

      if (diffMonths > 6 && !formData.isLateRegistration) {
        setFormData(prev => ({ ...prev, isLateRegistration: true }));
      }
    }
  }, [formData.birthDate]);

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ============================================
  // FLOUTAGE DES VISAGES (Conformité CDP/RGPD)
  // ============================================

  const blurFaceOnImage = async (
    imageBase64: string,
    faceBox: { x: number; y: number; width: number; height: number }
  ): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;

        // Dessiner l'image originale
        ctx.drawImage(img, 0, 0);

        // Calculer les coordonnées du visage (en pixels)
        const faceX = (faceBox.x / 100) * img.width;
        const faceY = (faceBox.y / 100) * img.height;
        const faceWidth = (faceBox.width / 100) * img.width;
        const faceHeight = (faceBox.height / 100) * img.height;

        // Extraire la zone du visage
        const faceData = ctx.getImageData(faceX, faceY, faceWidth, faceHeight);

        // Appliquer un flou (pixelisation)
        const blurSize = 25;
        for (let y = 0; y < faceHeight; y += blurSize) {
          for (let x = 0; x < faceWidth; x += blurSize) {
            let r = 0, g = 0, b = 0, count = 0;

            // Moyenner les pixels dans le bloc
            for (let dy = 0; dy < blurSize && y + dy < faceHeight; dy++) {
              for (let dx = 0; dx < blurSize && x + dx < faceWidth; dx++) {
                const i = ((y + dy) * faceWidth + (x + dx)) * 4;
                r += faceData.data[i];
                g += faceData.data[i + 1];
                b += faceData.data[i + 2];
                count++;
              }
            }

            // Appliquer la moyenne à tous les pixels du bloc
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            for (let dy = 0; dy < blurSize && y + dy < faceHeight; dy++) {
              for (let dx = 0; dx < blurSize && x + dx < faceWidth; dx++) {
                const i = ((y + dy) * faceWidth + (x + dx)) * 4;
                faceData.data[i] = r;
                faceData.data[i + 1] = g;
                faceData.data[i + 2] = b;
              }
            }
          }
        }

        // Remettre les données floutées
        ctx.putImageData(faceData, faceX, faceY);

        // Ajouter un overlay vert semi-transparent
        ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.fillRect(faceX, faceY, faceWidth, faceHeight);

        // Ajouter un badge "CDP"
        ctx.fillStyle = '#10b981';
        ctx.fillRect(faceX, faceY, 50, 20);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('CDP', faceX + 10, faceY + 14);

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };

      img.src = imageBase64;
    });
  };

  // ============================================
  // OCR - EXTRACTION VIA BACKEND SÉCURISÉ
  // ============================================

  const extractDataFromCNI = async (imageBase64: string): Promise<CNIRectoData | null> => {
    try {
      setOcrStatus('Envoi au serveur sécurisé...');

      const result = await aiService.extractCNIRecto(imageBase64);

      if (result) {
        setOcrStatus('✓ Extraction réussie');
        return result;
      } else {
        setOcrStatus('⚠ Extraction partielle');
        return null;
      }
    } catch (error: any) {
      console.error('Erreur OCR:', error);

      if (error.message?.includes('503')) {
        setOcrStatus('⚠ Service IA indisponible');
      } else if (error.message?.includes('429')) {
        setOcrStatus('⚠ Limite de requêtes atteinte');
      } else {
        setOcrStatus('✗ Erreur de communication');
      }

      return null;
    }
  };

  // ============================================
  // HANDLER UPLOAD CNI
  // ============================================

  const handleCniUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    parent: 'father' | 'mother',
    side: 'recto' | 'verso'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image (JPEG, PNG)');
      return;
    }

    // Vérifier la taille (max 10 Mo)
    if (file.size > 10 * 1024 * 1024) {
      alert('L\'image est trop volumineuse (max 10 Mo)');
      return;
    }

    try {
      // Convertir en base64
      const base64 = await aiService.fileToBase64(file);

      // Déterminer le champ à mettre à jour
      const fieldName = `${parent}Cni${side.charAt(0).toUpperCase() + side.slice(1)}` as keyof FormData;

      // Stocker l'image
      setFormData(prev => ({ ...prev, [fieldName]: base64 }));

      // OCR uniquement sur le recto
      if (side === 'recto') {
        setIsExtractingOcr(true);
        setOcrTarget(parent);
        setOcrStatus('Analyse en cours...');

        const extracted = await extractDataFromCNI(base64);

        if (extracted) {
          // Appliquer les données extraites selon le parent
          if (parent === 'father') {
            setFormData(prev => ({
              ...prev,
              fatherFirstName: extracted.firstName || prev.fatherFirstName,
              fatherLastName: extracted.lastName || prev.fatherLastName,
              fatherNin: extracted.nin || prev.fatherNin,
              fatherBirthDate: extracted.birthDate || prev.fatherBirthDate,
              fatherBirthPlace: extracted.birthPlace || prev.fatherBirthPlace,
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              motherFirstName: extracted.firstName || prev.motherFirstName,
              motherLastName: extracted.lastName || prev.motherLastName,
              motherNin: extracted.nin || prev.motherNin,
              motherBirthDate: extracted.birthDate || prev.motherBirthDate,
              motherBirthPlace: extracted.birthPlace || prev.motherBirthPlace,
            }));
          }

          // Flouter le visage si détecté
          if (extracted.faceBox) {
            const blurredImage = await blurFaceOnImage(base64, extracted.faceBox);
            setFormData(prev => ({ ...prev, [fieldName]: blurredImage }));
          }
        }

        setIsExtractingOcr(false);
        setOcrTarget(null);

        // Effacer le statut après 3 secondes
        setTimeout(() => setOcrStatus(''), 3000);
      }
    } catch (error) {
      console.error('Erreur upload CNI:', error);
      setOcrStatus('✗ Erreur lors du chargement');
      setIsExtractingOcr(false);
      setOcrTarget(null);
    }
  };

  // ============================================
  // HANDLER UPLOAD BULLETIN HOSPITALIER
  // ============================================

  const handleBulletinUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Veuillez sélectionner une image ou un PDF');
      return;
    }

    try {
      const base64 = await aiService.fileToBase64(file);
      setFormData(prev => ({ ...prev, hospitalCertificateScan: base64 }));
    } catch (error) {
      console.error('Erreur upload bulletin:', error);
    }
  };

  // ============================================
  // ANALYSE DE FRAUDE - VIA BACKEND SÉCURISÉ
  // ============================================

  const analyzeForFraud = async (): Promise<FraudAnalysis | null> => {
    setIsAnalyzingFraud(true);
    setFraudScanPhase('Connexion au serveur Gindi...');

    try {
      // Collecter les documents disponibles
      const documents: {
        hospitalBulletin?: string;
        fatherCniRecto?: string;
        fatherCniVerso?: string;
        motherCniRecto?: string;
        motherCniVerso?: string;
      } = {};

      if (formData.hospitalCertificateScan) {
        documents.hospitalBulletin = formData.hospitalCertificateScan;
      }
      if (formData.fatherCniRecto) {
        documents.fatherCniRecto = formData.fatherCniRecto;
      }
      if (formData.fatherCniVerso) {
        documents.fatherCniVerso = formData.fatherCniVerso;
      }
      if (formData.motherCniRecto) {
        documents.motherCniRecto = formData.motherCniRecto;
      }
      if (formData.motherCniVerso) {
        documents.motherCniVerso = formData.motherCniVerso;
      }

      // Vérifier qu'on a au moins un document
      const docCount = Object.keys(documents).length;
      if (docCount === 0) {
        setFraudScanPhase('Aucun document à analyser');
        setIsAnalyzingFraud(false);
        return null;
      }

      // Animation des phases de scan
      const phases = [
        'Analyse des motifs de bruit...',
        'Vérification des tampons officiels...',
        'Contrôle de cohérence des données...',
        'Détection des anomalies visuelles...',
        'Corrélation inter-documents...',
        'Génération du rapport...'
      ];

      let phaseIndex = 0;
      const phaseInterval = setInterval(() => {
        if (phaseIndex < phases.length) {
          setFraudScanPhase(phases[phaseIndex]);
          phaseIndex++;
        }
      }, 1200);

      // Appel au service backend sécurisé
      const analysis = await aiService.analyzeForFraud({
        documents,
        metadata: {
          childBirthDate: formData.birthDate,
          declarationDate: new Date().toISOString().split('T')[0],
          fatherNin: formData.fatherNin || undefined,
          motherNin: formData.motherNin || undefined
        }
      });

      clearInterval(phaseInterval);

      if (analysis) {
        setFraudScanPhase('Analyse terminée');
        setFormData(prev => ({ ...prev, fraudAnalysis: analysis }));
        return analysis;
      } else {
        setFraudScanPhase('Analyse impossible - Réessayez');
        return null;
      }

    } catch (error: any) {
      console.error('Erreur analyse fraude:', error);

      if (error.message?.includes('503')) {
        setFraudScanPhase('Service Gindi IA indisponible');
      } else if (error.message?.includes('429')) {
        setFraudScanPhase('Trop de requêtes - Patientez');
      } else {
        setFraudScanPhase('Erreur de communication serveur');
      }

      return null;
    } finally {
      setIsAnalyzingFraud(false);
    }
  };

  // ============================================
  // SOUMISSION DU FORMULAIRE
  // ============================================

  const handleSubmit = async (status: CertificateStatus) => {
    setIsSubmitting(true);

    try {
      // Validation basique
      if (!formData.childFirstName || !formData.childLastName || !formData.birthDate) {
        alert('Veuillez remplir les informations obligatoires de l\'enfant');
        setIsSubmitting(false);
        return;
      }

      if (!formData.fatherLastName && !formData.motherLastName) {
        alert('Veuillez renseigner au moins un parent');
        setIsSubmitting(false);
        return;
      }

      // Si soumission (pas brouillon), lancer l'analyse de fraude
      if (status === CertificateStatus.PENDING && !formData.fraudAnalysis) {
        const hasDocuments = formData.hospitalCertificateScan ||
          formData.fatherCniRecto ||
          formData.motherCniRecto;

        if (hasDocuments) {
          await analyzeForFraud();
        }
      }

      // Préparer les données
      const certificateData: Partial<BirthCertificate> = {
        ...formData,
        status,
        declarationDate: certificate?.declarationDate || new Date().toISOString()
      };

      onSave(certificateData, status);
    } catch (error) {
      console.error('Erreur soumission:', error);
      alert('Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // COMPOSANTS UI
  // ============================================

  const TabButton: React.FC<{
    id: typeof activeTab;
    label: string;
    icon: React.ReactNode;
  }> = ({ id, label, icon }) => (
    <button
      type="button"
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === id
          ? 'bg-[#064e3b] text-white shadow-lg'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const InputField: React.FC<{
    label: string;
    name: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }> = ({ label, name, type = 'text', required, placeholder, icon, disabled }) => (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={(formData as any)[name] || ''}
          onChange={handleInputChange}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-12' : 'px-4'} pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-600 outline-none font-semibold text-sm transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        />
      </div>
    </div>
  );

  // ============================================
  // RENDU DES ONGLETS
  // ============================================

  const renderChildTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Prénom(s)"
          name="childFirstName"
          required
          placeholder="Prénom(s) de l'enfant"
          icon={<Baby size={16} />}
        />
        <InputField
          label="Nom de famille"
          name="childLastName"
          required
          placeholder="Hérite du père"
          icon={<User size={16} />}
          disabled={!!formData.fatherLastName}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            Sexe <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <label className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.childGender === 'M'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}>
              <input
                type="radio"
                name="childGender"
                value="M"
                checked={formData.childGender === 'M'}
                onChange={handleInputChange}
                className="sr-only"
              />
              <span className="font-bold">♂ Masculin</span>
            </label>
            <label className={`flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.childGender === 'F'
                ? 'border-pink-500 bg-pink-50 text-pink-700'
                : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
              }`}>
              <input
                type="radio"
                name="childGender"
                value="F"
                checked={formData.childGender === 'F'}
                onChange={handleInputChange}
                className="sr-only"
              />
              <span className="font-bold">♀ Féminin</span>
            </label>
          </div>
        </div>

        <InputField
          label="Date de naissance"
          name="birthDate"
          type="date"
          required
          icon={<Calendar size={16} />}
        />
        <InputField
          label="Heure de naissance"
          name="birthTime"
          type="time"
          icon={<Clock size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Lieu de naissance"
          name="birthPlace"
          required
          placeholder="Ville / Village"
          icon={<MapPin size={16} />}
        />
        <InputField
          label="Établissement de santé"
          name="hospital"
          placeholder="Nom de l'hôpital / maternité"
          icon={<FileText size={16} />}
        />
      </div>

      {/* Alerte inscription tardive */}
      {formData.isLateRegistration && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3">
          <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="font-bold text-amber-800">Inscription tardive détectée</p>
            <p className="text-sm text-amber-600">
              La naissance date de plus de 6 mois. Un jugement supplétif sera requis.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderParentTab = (parent: 'father' | 'mother') => {
    const prefix = parent;
    const label = parent === 'father' ? 'Père' : 'Mère';
    const showCni = parent === 'father' ? showFatherCni : showMotherCni;
    const setShowCni = parent === 'father' ? setShowFatherCni : setShowMotherCni;
    const cniRecto = (formData as any)[`${prefix}CniRecto`];
    const cniVerso = (formData as any)[`${prefix}CniVerso`];

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Upload CNI */}
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Scan className="text-emerald-600" size={20} />
              <span className="font-bold text-slate-700">CNI du {label}</span>
            </div>
            {(isExtractingOcr && ocrTarget === parent) && (
              <div className="flex items-center space-x-2 text-emerald-600">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-xs font-bold">{ocrStatus}</span>
              </div>
            )}
            {(!isExtractingOcr && ocrStatus && ocrTarget === null) && (
              <span className={`text-xs font-bold ${ocrStatus.includes('✓') ? 'text-emerald-600' :
                  ocrStatus.includes('✗') ? 'text-red-600' : 'text-amber-600'
                }`}>
                {ocrStatus}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block w-full">
                <div className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${cniRecto ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                  }`}>
                  {cniRecto ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="mx-auto text-emerald-600" size={24} />
                      <p className="text-xs font-bold text-emerald-700">Recto chargé</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto text-slate-400" size={24} />
                      <p className="text-xs font-bold text-slate-500">Recto CNI</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCniUpload(e, parent, 'recto')}
                  className="sr-only"
                />
              </label>
            </div>

            <div>
              <label className="block w-full">
                <div className={`p-4 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${cniVerso ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'
                  }`}>
                  {cniVerso ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="mx-auto text-emerald-600" size={24} />
                      <p className="text-xs font-bold text-emerald-700">Verso chargé</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="mx-auto text-slate-400" size={24} />
                      <p className="text-xs font-bold text-slate-500">Verso CNI</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCniUpload(e, parent, 'verso')}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Aperçu CNI (avec toggle) */}
          {(cniRecto || cniVerso) && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowCni(!showCni)}
                className="flex items-center space-x-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                {showCni ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showCni ? 'Masquer' : 'Afficher'} les scans</span>
              </button>

              {showCni && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  {cniRecto && (
                    <img
                      src={cniRecto}
                      alt="CNI Recto"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  )}
                  {cniVerso && (
                    <img
                      src={cniVerso}
                      alt="CNI Verso"
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-3 flex items-center">
            <Sparkles size={12} className="mr-1 text-amber-500" />
            L'extraction automatique (Gindi OCR) est activée sur le recto
          </p>
        </div>

        {/* Informations du parent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Prénom(s)"
            name={`${prefix}FirstName`}
            placeholder={`Prénom(s) du ${label.toLowerCase()}`}
            icon={<User size={16} />}
          />
          <InputField
            label="Nom de famille"
            name={`${prefix}LastName`}
            placeholder={`Nom du ${label.toLowerCase()}`}
            icon={<User size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="NIN (Numéro d'Identification)"
            name={`${prefix}Nin`}
            placeholder="13 chiffres"
            icon={<Fingerprint size={16} />}
          />
          <InputField
            label="Date de naissance"
            name={`${prefix}BirthDate`}
            type="date"
            icon={<Calendar size={16} />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputField
            label="Lieu de naissance"
            name={`${prefix}BirthPlace`}
            placeholder="Ville / Village"
            icon={<MapPin size={16} />}
          />
          <InputField
            label="Profession"
            name={`${prefix}Occupation`}
            placeholder="Activité professionnelle"
            icon={<Briefcase size={16} />}
          />
        </div>

        <InputField
          label="Adresse de résidence"
          name={`${prefix}Address`}
          placeholder="Adresse complète"
          icon={<MapPin size={16} />}
        />
      </div>
    );
  };

  const renderDocumentsTab = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Upload bulletin hospitalier */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="text-emerald-600" size={20} />
          <span className="font-bold text-slate-700">Bulletin de naissance hospitalier</span>
        </div>

        <label className="block w-full">
          <div className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all ${formData.hospitalCertificateScan
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-slate-200 hover:border-emerald-300'
            }`}>
            {formData.hospitalCertificateScan ? (
              <div className="space-y-2">
                <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
                <p className="font-bold text-emerald-700">Document chargé</p>
                <p className="text-xs text-emerald-600">Cliquez pour remplacer</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto text-slate-400" size={32} />
                <p className="font-bold text-slate-500">Déposez le bulletin ici</p>
                <p className="text-xs text-slate-400">ou cliquez pour sélectionner</p>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleBulletinUpload}
            className="sr-only"
          />
        </label>
      </div>

      {/* Section Jugement Supplétif */}
      {formData.isLateRegistration && (
        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="text-amber-600" size={20} />
            <span className="font-bold text-amber-800">Jugement Supplétif Requis</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputField
              label="Tribunal"
              name="judgmentCourt"
              required
              placeholder="Nom du tribunal"
            />
            <InputField
              label="Numéro du jugement"
              name="judgmentNumber"
              required
              placeholder="Ex: 123/2025"
            />
            <InputField
              label="Date du jugement"
              name="judgmentDate"
              type="date"
              required
            />
            <InputField
              label="Date de transcription"
              name="judgmentRegistrationDate"
              type="date"
              required
            />
          </div>
        </div>
      )}

      {/* Analyse de Fraude IA */}
      <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Brain className="text-emerald-400" size={24} />
            <div>
              <h3 className="font-black text-lg">Gindi IA</h3>
              <p className="text-xs text-slate-400">Analyse de fraude documentaire</p>
            </div>
          </div>

          {!isAnalyzingFraud && !formData.fraudAnalysis && (
            <button
              type="button"
              onClick={analyzeForFraud}
              disabled={!formData.hospitalCertificateScan && !formData.fatherCniRecto && !formData.motherCniRecto}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl font-bold text-sm transition-all flex items-center space-x-2"
            >
              <Shield size={16} />
              <span>Lancer l'analyse</span>
            </button>
          )}
        </div>

        {/* Animation de scan */}
        {isAnalyzingFraud && (
          <div className="space-y-4">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 animate-pulse w-full" />
            </div>
            <p className="text-center text-sm text-emerald-400 font-mono">
              {fraudScanPhase}
            </p>
          </div>
        )}

        {/* Résultat de l'analyse */}
        {formData.fraudAnalysis && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl ${formData.fraudAnalysis.riskLevel === 'LOW' ? 'bg-emerald-900/50' :
                formData.fraudAnalysis.riskLevel === 'MEDIUM' ? 'bg-amber-900/50' :
                  'bg-red-900/50'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {formData.fraudAnalysis.riskLevel === 'LOW' ? (
                    <ShieldCheck className="text-emerald-400" size={24} />
                  ) : formData.fraudAnalysis.riskLevel === 'MEDIUM' ? (
                    <ShieldAlert className="text-amber-400" size={24} />
                  ) : (
                    <AlertCircle className="text-red-400" size={24} />
                  )}
                  <div>
                    <p className="font-black">
                      Risque {
                        formData.fraudAnalysis.riskLevel === 'LOW' ? 'Faible' :
                          formData.fraudAnalysis.riskLevel === 'MEDIUM' ? 'Modéré' :
                            'Élevé'
                      }
                    </p>
                    <p className="text-xs opacity-70">
                      Confiance: {Math.round(formData.fraudAnalysis.confidenceScore * 100)}%
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">
                  {formData.fraudAnalysis.documentsAnalyzed} doc(s) analysé(s)
                </span>
              </div>
            </div>

            {formData.fraudAnalysis.findings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase">Observations</p>
                {formData.fraudAnalysis.findings.map((finding, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${finding.severity === 'CRITICAL' ? 'bg-red-900/30 text-red-300' :
                        finding.severity === 'WARNING' ? 'bg-amber-900/30 text-amber-300' :
                          'bg-slate-700/30 text-slate-300'
                      }`}
                  >
                    <span className="font-mono text-[10px] mr-2 opacity-50">[{finding.category}]</span>
                    {finding.description}
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-slate-400 italic">
              {formData.fraudAnalysis.summary}
            </p>
          </div>
        )}

        {!isAnalyzingFraud && !formData.fraudAnalysis && (
          <p className="text-xs text-slate-500 text-center">
            Chargez au moins un document pour activer l'analyse
          </p>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDU PRINCIPAL
  // ============================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#064e3b] to-emerald-700 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight">
              {isEditing ? 'Modifier l\'acte' : 'Nouvel Acte de Naissance'}
            </h2>
            <p className="text-emerald-100/70 text-xs font-medium uppercase tracking-widest mt-1">
              Centre de {centers.find(c => c.id === user?.centerId)?.name || 'État Civil'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-4 border-b border-slate-100 flex space-x-2 overflow-x-auto shrink-0">
          <TabButton id="child" label="Enfant" icon={<Baby size={16} />} />
          <TabButton id="father" label="Père" icon={<User size={16} />} />
          <TabButton id="mother" label="Mère" icon={<User size={16} />} />
          <TabButton id="documents" label="Documents" icon={<FileText size={16} />} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'child' && renderChildTab()}
          {activeTab === 'father' && renderParentTab('father')}
          {activeTab === 'mother' && renderParentTab('mother')}
          {activeTab === 'documents' && renderDocumentsTab()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition-all"
          >
            Annuler
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => handleSubmit(CertificateStatus.DRAFT)}
              disabled={isSubmitting}
              className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              <span>Brouillon</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(CertificateStatus.PENDING)}
              disabled={isSubmitting || isAnalyzingFraud}
              className="px-8 py-3 bg-[#064e3b] text-white rounded-xl font-bold text-sm hover:bg-[#043327] transition-all flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-emerald-900/20"
            >
              {isSubmitting || isAnalyzingFraud ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Send size={16} />
              )}
              <span>Soumettre pour validation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateForm;
