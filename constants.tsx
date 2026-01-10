
import React from 'react';
import { 
  CheckCircle2, 
  Clock4, 
  FileEdit,
  ShieldCheck,
  Award
} from 'lucide-react';
import { CertificateStatus } from './types';

export const STATUS_CONFIG = {
  [CertificateStatus.DRAFT]: { 
    label: 'Brouillon', 
    color: 'bg-slate-100 text-slate-700 border-slate-200', 
    icon: <FileEdit size={14} /> 
  },
  [CertificateStatus.PENDING]: { 
    label: 'En attente', 
    color: 'bg-amber-50 text-amber-700 border-amber-200', 
    icon: <Clock4 size={14} /> 
  },
  [CertificateStatus.SIGNED]: { 
    label: 'Signé', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
    icon: <ShieldCheck size={14} /> 
  },
  [CertificateStatus.DELIVERED]: { 
    label: 'Délivré', 
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: <Award size={14} /> 
  },
};

export const BRAND = {
  name: 'NDORTEL',
  fullName: 'Système National de Souveraineté de l\'État Civil',
  meaning: 'Le Commencement (Wolof)',
  primary: '#064e3b',
  accent: '#fbbf24',
  bg: '#f8fafc'
};

export const SENEGAL_GEOGRAPHY = {
  "Dakar": {
    "Dakar": ["Dakar-Plateau", "Medina", "Fann-Point E", "Gueule Tapée", "Grand Dakar", "Yoff", "Ngor", "Ouakam"],
    "Pikine": ["Pikine Est", "Pikine Ouest", "Dalifort", "Djiddah Thiaroye Kao", "Mbao"],
    "Guédiawaye": ["Golf Sud", "Sam Notaire", "Ndiarème Limamoulaye"],
    "Rufisque": ["Rufisque Est", "Rufisque Ouest", "Rufisque Nord", "Sangalkam", "Diamniadio"]
  },
  "Thiès": {
    "Thiès": ["Thiès Nord", "Thiès Est", "Thiès Ouest"],
    "Mbour": ["Mbour", "Saly Portudal", "Sandiara", "Joal-Fadiouth"],
    "Tivaouane": ["Tivaouane", "Mboro", "Meckhe"]
  }
};
