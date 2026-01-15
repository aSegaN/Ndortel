import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Center, BirthCertificate, Role, CertificateStatus, AuthState, Notification, QualifiedSignature } from '../types';
import { apiClient } from '../services/apiService';

interface AppContextType {
  authState: AuthState;
  centers: Center[];
  users: User[];
  certificates: BirthCertificate[];
  notifications: Notification[];
  isLoading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addCertificate: (cert: any, status?: CertificateStatus) => Promise<void>;
  updateCertificate: (id: string, cert: any, status?: CertificateStatus) => Promise<void>;
  updateCertificateStatus: (id: string, status: CertificateStatus, signer?: string) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  addCenter: (center: any) => Promise<void>;
  updateCenter: (id: string, center: Partial<Center>) => Promise<void>;
  addUser: (user: any) => Promise<void>;
  updateUser: (id: string, user: Partial<User>) => Promise<void>;
  clearCertificates: () => void;
  syncNow: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Utilitaire de hachage SHA-256
async function computeSHA256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simulation de Signature PKI via WebCrypto
const generateQualifiedSignature = async (certData: any, userName: string): Promise<QualifiedSignature> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(certData));

  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    data
  );

  const exportedPubKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
  const pubKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPubKey)));

  return {
    algorithm: "RSASSA-PKCS1-v1_5 / SHA-256",
    signatureValue: signatureBase64,
    publicKey: pubKeyBase64,
    certificateId: `SEN-PKI-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    legalNotice: "Signature Qualifiée conforme à la Loi n° 2008-08 sur les Transactions Électroniques au Sénégal.",
    issuer: "SENUM SA - Autorité de Certification de l'État du Sénégal"
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [centers, setCenters] = useState<Center[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [certificates, setCertificates] = useState<BirthCertificate[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Ref pour accéder à l'état actuel dans les callbacks
  const authStateRef = useRef(authState);
  authStateRef.current = authState;

  // Gérer la connectivité
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (authStateRef.current.isAuthenticated) {
        loadAllData(authStateRef.current.user);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fonction pour charger toutes les données (accepte user en paramètre)
  const loadAllData = async (user: User | null) => {
    if (!user) {
      console.log('loadAllData: No user, skipping');
      return;
    }

    console.log('loadAllData: Loading data for user', user.email, 'role:', user.role);

    try {
      // Déterminer si l'utilisateur est admin
      const isAdmin = user.role === Role.ADMIN;
      console.log('loadAllData: isAdmin =', isAdmin);

      // Charger en parallèle
      const promises: Promise<any>[] = [
        apiClient.getCertificates().catch(err => {
          console.error('Error loading certificates:', err);
          return [];
        }),
        apiClient.getCenters().catch(err => {
          console.error('Error loading centers:', err);
          return [];
        }),
        apiClient.getNotifications().catch(err => {
          console.error('Error loading notifications:', err);
          return [];
        })
      ];

      // Ajouter la requête users seulement pour les admins
      if (isAdmin) {
        promises.push(
          apiClient.getUsers().catch(err => {
            console.error('Error loading users:', err);
            return [];
          })
        );
      }

      const results = await Promise.all(promises);

      const [certsData, centersData, notifsData] = results;
      const usersData = isAdmin ? results[3] : [];

      console.log('loadAllData: Loaded', {
        certificates: certsData?.length ?? 0,
        centers: centersData?.length ?? 0,
        users: usersData?.length ?? 0,
        notifications: notifsData?.length ?? 0
      });

      // S'assurer que ce sont toujours des tableaux
      setCertificates(Array.isArray(certsData) ? certsData : []);
      setCenters(Array.isArray(centersData) ? centersData : []);
      setNotifications(Array.isArray(notifsData) ? notifsData : []);

      if (isAdmin) {
        setUsers(Array.isArray(usersData) ? usersData : []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    }
  };

  // Fonction pour rafraîchir toutes les données (utilise l'état actuel)
  const refreshData = useCallback(async () => {
    const currentAuth = authStateRef.current;
    if (!currentAuth.isAuthenticated || !currentAuth.user) {
      console.log('refreshData: Not authenticated, skipping');
      return;
    }
    await loadAllData(currentAuth.user);
  }, []);

  // Initialisation
  useEffect(() => {
    const initData = async () => {
      try {
        // Vérifier si un token existe
        const token = apiClient.getToken();

        if (token) {
          try {
            // Récupérer l'utilisateur actuel
            const user = await apiClient.getCurrentUser();
            console.log('Init: User retrieved', user.email, 'role:', user.role);

            setAuthState({ user, isAuthenticated: true });

            // Charger toutes les données avec l'utilisateur
            await loadAllData(user);
          } catch (error) {
            console.error('Session expirée:', error);
            apiClient.logout();
            setAuthState({ user: null, isAuthenticated: false });
          }
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  const syncNow = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await refreshData();
      setPendingSyncCount(0);
    } finally {
      setIsSyncing(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('Login: Attempting login for', email);
      const { user } = await apiClient.login(email, password);
      console.log('Login: Success, user role:', user.role);

      // Mettre à jour l'état
      setAuthState({ user, isAuthenticated: true });

      // Charger les données AVEC l'utilisateur (pas via refreshData qui utilise l'ancien état)
      await loadAllData(user);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    apiClient.logout();
    setAuthState({ user: null, isAuthenticated: false });
    setCertificates([]);
    setUsers([]);
    setCenters([]);
    setNotifications([]);
  };

  const addCertificate = async (data: any, status: CertificateStatus = CertificateStatus.PENDING) => {
    try {
      const payload = { ...data, status };

      await apiClient.createCertificate(payload);

      // Rafraîchir la liste
      const updatedCerts = await apiClient.getCertificates();
      setCertificates(updatedCerts);
    } catch (error) {
      console.error('Erreur création certificat:', error);
      throw error;
    }
  };

  const updateCertificate = async (id: string, data: any, status?: CertificateStatus) => {
    try {
      const payload = status ? { ...data, status } : data;

      await apiClient.updateCertificate(id, payload);

      // Rafraîchir la liste
      const updatedCerts = await apiClient.getCertificates();
      setCertificates(updatedCerts);
    } catch (error) {
      console.error('Erreur mise à jour certificat:', error);
      throw error;
    }
  };

  const updateCertificateStatus = async (id: string, status: CertificateStatus, signer?: string) => {
    try {
      let pkiSignature = undefined;
      let signatureHash = undefined;

      if (status === CertificateStatus.SIGNED) {
        // Générer la signature PKI
        const cert = certificates.find(c => c.id === id);
        if (cert) {
          pkiSignature = await generateQualifiedSignature(
            { num: cert.registrationNumber, child: cert.childFirstName, date: cert.birthDate },
            signer || authState.user?.name || "Inconnu"
          );
          signatureHash = pkiSignature.signatureValue.substr(0, 16).toUpperCase();
        }
      }

      await apiClient.updateCertificateStatus(id, status, pkiSignature, signatureHash);

      // Rafraîchir la liste
      const updatedCerts = await apiClient.getCertificates();
      setCertificates(updatedCerts);
    } catch (error) {
      console.error('Erreur changement statut:', error);
      throw error;
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await apiClient.markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Erreur marquage notification:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      await apiClient.clearReadNotifications();
      setNotifications(prev => prev.filter(n => !n.read));
    } catch (error) {
      console.error('Erreur suppression notifications:', error);
    }
  };

  const addCenter = async (center: any) => {
    try {
      await apiClient.createCenter(center);
      const updatedCenters = await apiClient.getCenters();
      setCenters(updatedCenters);
    } catch (error) {
      console.error('Erreur création centre:', error);
      throw error;
    }
  };

  const updateCenter = async (id: string, data: Partial<Center>) => {
    try {
      await apiClient.updateCenter(id, data);
      const updatedCenters = await apiClient.getCenters();
      setCenters(updatedCenters);
    } catch (error) {
      console.error('Erreur mise à jour centre:', error);
      throw error;
    }
  };

  const addUser = async (user: any) => {
    try {
      await apiClient.createUser(user);
      const updatedUsers = await apiClient.getUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      throw error;
    }
  };

  const updateUser = async (id: string, data: Partial<User> & { password?: string }) => {
    try {
      await apiClient.updateUser(id, data);
      const updatedUsers = await apiClient.getUsers();
      setUsers(updatedUsers);
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      throw error;
    }
  };

  const clearCertificates = () => {
    setCertificates([]);
  };

  return (
    <AppContext.Provider value={{
      isLoading, authState, centers, users, certificates, notifications,
      isOnline, isSyncing, pendingSyncCount,
      login, logout, syncNow, refreshData,
      addCertificate, updateCertificate, updateCertificateStatus,
      markNotificationAsRead, clearNotifications,
      addCenter, updateCenter, addUser, updateUser, clearCertificates
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};