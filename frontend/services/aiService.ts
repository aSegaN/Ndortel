// ============================================
// FICHIER: src/services/aiService.ts
// DESCRIPTION: Client pour les endpoints IA du backend
// SÉCURITÉ: Aucune clé API côté client
// ============================================

import { apiClient } from './apiService';

// ============================================
// TYPES
// ============================================

export type DocumentType = 'CNI_RECTO' | 'CNI_VERSO' | 'BULLETIN_HOSPITAL';

export interface OCRResult {
  success: boolean;
  documentType: DocumentType;
  data: CNIRectoData | CNIVersoData | BulletinData;
  timestamp: string;
}

export interface CNIRectoData {
  firstName: string | null;
  lastName: string | null;
  nin: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  gender: 'M' | 'F' | null;
  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface CNIVersoData {
  address: string | null;
  profession: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  issuingAuthority: string | null;
}

export interface BulletinData {
  childFirstName: string | null;
  childLastName: string | null;
  birthDate: string | null;
  birthTime: string | null;
  birthPlace: string | null;
  gender: 'M' | 'F' | null;
  hospitalName: string | null;
  weight: number | null;
  motherName: string | null;
  fatherName: string | null;
}

export type FraudRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type FindingCategory = 'VISUAL' | 'DATA' | 'TEMPORAL' | 'STAMP' | 'IDENTITY';
export type FindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface FraudFinding {
  category: FindingCategory;
  severity: FindingSeverity;
  description: string;
  affectedDocument?: string;
}

export interface FraudAnalysis {
  riskLevel: FraudRiskLevel;
  confidenceScore: number;
  findings: FraudFinding[];
  summary: string;
  recommendations?: string[];
  analyzedAt: string;
  analyzedBy: string;
  documentsAnalyzed: number;
}

export interface FraudCheckResult {
  success: boolean;
  analysis: FraudAnalysis;
}

export interface AIServiceStatus {
  available: boolean;
  provider: string;
  models: {
    ocr: string;
    fraudCheck: string;
  };
  features: {
    ocr: boolean;
    fraudDetection: boolean;
  };
}

// ============================================
// SERVICE AI
// ============================================

class AIService {
  private baseUrl = '/ai';

  /**
   * Vérifie le statut du service IA
   */
  async getStatus(): Promise<AIServiceStatus> {
    const response = await apiClient.get<AIServiceStatus>(`${this.baseUrl}/status`);
    return response;
  }

  /**
   * Extrait les données d'un document via OCR
   * @param imageBase64 - Image encodée en base64
   * @param documentType - Type de document à analyser
   */
  async extractFromDocument(
    imageBase64: string, 
    documentType: DocumentType
  ): Promise<OCRResult> {
    const response = await apiClient.post<OCRResult>(`${this.baseUrl}/ocr`, {
      imageBase64,
      documentType
    });
    return response;
  }

  /**
   * Extrait les données d'une CNI (recto)
   */
  async extractCNIRecto(imageBase64: string): Promise<CNIRectoData | null> {
    try {
      const result = await this.extractFromDocument(imageBase64, 'CNI_RECTO');
      if (result.success) {
        return result.data as CNIRectoData;
      }
      return null;
    } catch (error) {
      console.error('Erreur extraction CNI recto:', error);
      return null;
    }
  }

  /**
   * Extrait les données d'une CNI (verso)
   */
  async extractCNIVerso(imageBase64: string): Promise<CNIVersoData | null> {
    try {
      const result = await this.extractFromDocument(imageBase64, 'CNI_VERSO');
      if (result.success) {
        return result.data as CNIVersoData;
      }
      return null;
    } catch (error) {
      console.error('Erreur extraction CNI verso:', error);
      return null;
    }
  }

  /**
   * Extrait les données d'un bulletin hospitalier
   */
  async extractBulletin(imageBase64: string): Promise<BulletinData | null> {
    try {
      const result = await this.extractFromDocument(imageBase64, 'BULLETIN_HOSPITAL');
      if (result.success) {
        return result.data as BulletinData;
      }
      return null;
    } catch (error) {
      console.error('Erreur extraction bulletin:', error);
      return null;
    }
  }

  /**
   * Analyse les documents pour détecter les fraudes potentielles
   */
  async analyzeForFraud(params: {
    documents: {
      hospitalBulletin?: string;
      fatherCniRecto?: string;
      fatherCniVerso?: string;
      motherCniRecto?: string;
      motherCniVerso?: string;
    };
    metadata: {
      childBirthDate: string;
      declarationDate: string;
      fatherNin?: string;
      motherNin?: string;
    };
  }): Promise<FraudAnalysis | null> {
    try {
      const response = await apiClient.post<FraudCheckResult>(
        `${this.baseUrl}/fraud-check`,
        params
      );
      
      if (response.success) {
        return response.analysis;
      }
      return null;
    } catch (error) {
      console.error('Erreur analyse fraude:', error);
      return null;
    }
  }

  /**
   * Convertit un fichier en base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Erreur lecture fichier'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Vérifie si le service IA est disponible
   */
  async isAvailable(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.available;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const aiService = new AIService();
export default aiService;
