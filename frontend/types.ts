
export enum Role {
  ADMIN = 'ADMINISTRATEUR',
  AGENT = 'AGENT_SAISIE',
  VALIDATOR = 'VALIDATEUR',
  MANAGER = 'RESPONSABLE'
}

export enum CertificateStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  SIGNED = 'SIGNED',
  DELIVERED = 'DELIVERED'
}

export interface QualifiedSignature {
  algorithm: string;
  signatureValue: string; // Base64 signature
  publicKey: string;      // Base64 public key (simulation)
  certificateId: string;  // ID du certificat de l'officier
  timestamp: string;
  legalNotice: string;    // Mention légale (Loi 2008-08)
  issuer: string;         // Autorité de certification simulation (ex: ADIE/SENUM)
}

export interface Notification {
  id: string;
  userId?: string;
  role?: Role;
  centerId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  relatedId?: string;
}

export interface ActionLog {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
  hash: string;         // Hachage cryptographique du log actuel
  previousHash: string; // Hachage du log précédent (chaînage)
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  centerId?: string;
  pkiCertificateId?: string; // Simulation de l'ID du certificat PKI
  birthDate: string;           // Ajout: Date de naissance
  registrationNumber: string;  // Ajout: Numéro d'immatriculation professionnel (Matricule)
  active: boolean;             // Ajout: État du compte (Actif/Inactif)
}

export interface Center {
  id: string;
  code: string;
  name: string;
  region: string;
  department: string;
  arrondissement?: string;
  commune: string;
  address: string;
}

export interface FraudFinding {
  category: 'VISUAL' | 'DATA' | 'TEMPORAL' | 'STAMP';
  detail: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface FraudAnalysis {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  confidenceScore: number;
  findings: FraudFinding[];
  analyzedAt: string;
  summary: string;
}

export interface BirthCertificate {
  id: string;
  registrationNumber: string;
  status: CertificateStatus;
  centerId: string;
  registrationYear: number;
  declarationDate: string;
  createdBy: string; 
  
  childFirstName: string;
  childLastName: string;
  childGender: 'M' | 'F';
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  hospital: string;
  hospitalCertificateScan?: string;
  
  fatherFirstName: string;
  fatherLastName: string;
  fatherBirthDate: string;
  fatherOccupation: string;
  fatherBirthPlace: string;
  fatherAddress: string;
  fatherNin?: string;
  fatherCniRecto?: string;
  fatherCniVerso?: string;
  
  motherFirstName: string;
  motherLastName: string;
  motherBirthDate: string;
  motherOccupation: string;
  motherBirthPlace: string;
  motherAddress: string;
  motherNin?: string;
  motherCniRecto?: string;
  motherCniVerso?: string;

  isLateRegistration: boolean;
  judgmentCourt?: string;
  judgmentDate?: string;
  judgmentNumber?: string;
  judgmentRegistrationDate?: string;
  
  signedBy?: string;
  signedAt?: string;
  signatureHash?: string; // Legacy
  pkiSignature?: QualifiedSignature; // Nouvelle signature PKI
  
  history: ActionLog[];
  fraudAnalysis?: FraudAnalysis;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface SyncAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'STATUS_CHANGE';
  payload: any;
  timestamp: string;
  attempts: number;
}
