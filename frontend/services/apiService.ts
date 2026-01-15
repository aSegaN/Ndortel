import { BirthCertificate, User, Center, CertificateStatus, Notification } from '../types';

// Utiliser la variable d'environnement Vite correctement
const API_BASE_URL = '/api';

// ============================================
// API CLIENT UTILITIES
// ============================================

interface ApiError {
  error: string;
  details?: any;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Charger le token depuis localStorage au démarrage
    this.token = localStorage.getItem('ndortel_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ndortel_token', token);
    } else {
      localStorage.removeItem('ndortel_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      // Si 401, le token est invalide
      if (response.status === 401) {
        this.setToken(null);
        window.location.href = '/'; // Rediriger vers login
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }

      const data = await response.json();

      if (!response.ok) {
        const error = data as ApiError;
        throw new Error(error.error || 'Erreur API');
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erreur réseau');
    }
  }

  // ============================================
  // AUTH METHODS
  // ============================================

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    this.setToken(response.token);

    return {
      token: response.token,
      user: {
        id: response.user.id,
        name: response.user.name,
        email: response.user.email,
        role: response.user.role,
        centerId: response.user.center_id,
        birthDate: response.user.birth_date,
        registrationNumber: response.user.registration_number,
        active: response.user.active,
        pkiCertificateId: response.user.pki_certificate_id
      }
    };
  }

  async getCurrentUser(): Promise<User> {
    const user = await this.request<any>('/auth/me');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      centerId: user.center_id,
      birthDate: user.birth_date,
      registrationNumber: user.registration_number,
      active: user.active,
      pkiCertificateId: user.pki_certificate_id
    };
  }

  logout() {
    this.setToken(null);
  }

  // ============================================
  // CERTIFICATES METHODS
  // ============================================

  async getCertificates(params?: {
    status?: CertificateStatus | 'ALL';
    year?: number | 'ALL';
    centerId?: string;
    search?: string;
  }): Promise<BirthCertificate[]> {
    const queryParams = new URLSearchParams();

    if (params?.status && params.status !== 'ALL') {
      queryParams.append('status', params.status);
    }
    if (params?.year && params.year !== 'ALL') {
      queryParams.append('year', params.year.toString());
    }
    if (params?.centerId) {
      queryParams.append('centerId', params.centerId);
    }
    if (params?.search) {
      queryParams.append('search', params.search);
    }

    const query = queryParams.toString();
    return this.request<BirthCertificate[]>(`/certificates${query ? '?' + query : ''}`);
  }

  async getCertificate(id: string): Promise<BirthCertificate> {
    return this.request<BirthCertificate>(`/certificates/${id}`);
  }

  async createCertificate(data: Partial<BirthCertificate>): Promise<{ id: string; registrationNumber: string }> {
    return this.request<{ id: string; registrationNumber: string }>('/certificates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCertificate(id: string, data: Partial<BirthCertificate>): Promise<void> {
    await this.request(`/certificates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateCertificateStatus(
    id: string,
    status: CertificateStatus,
    pkiSignature?: any,
    signatureHash?: string
  ): Promise<void> {
    await this.request(`/certificates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, pkiSignature, signatureHash }),
    });
  }

  async verifyCertificateIntegrity(id: string): Promise<{ isValid: boolean; message: string }> {
    return this.request<{ isValid: boolean; message: string }>(`/certificates/${id}/verify-integrity`);
  }

  // ============================================
  // USERS METHODS
  // ============================================

  async getUsers(): Promise<User[]> {
    const users = await this.request<any[]>('/users');
    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      centerId: u.center_id,
      birthDate: u.birth_date,
      registrationNumber: u.registration_number,
      active: u.active,
      pkiCertificateId: u.pki_certificate_id
    }));
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    centerId?: string;
    birthDate: string;
    registrationNumber: string;
  }): Promise<User> {
    const user = await this.request<any>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      centerId: user.center_id,
      birthDate: user.birth_date,
      registrationNumber: user.registration_number,
      active: user.active
    };
  }

  async updateUser(id: string, data: Partial<User> & { password?: string }): Promise<User> {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.email) payload.email = data.email;
    if (data.role) payload.role = data.role;
    if (data.centerId !== undefined) payload.centerId = data.centerId;
    if (data.birthDate) payload.birthDate = data.birthDate;
    if (data.registrationNumber) payload.registrationNumber = data.registrationNumber;
    if (typeof data.active === 'boolean') payload.active = data.active;
    if (data.password) payload.password = data.password;

    const user = await this.request<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      centerId: user.center_id,
      birthDate: user.birth_date,
      registrationNumber: user.registration_number,
      active: user.active
    };
  }

  // ============================================
  // CENTERS METHODS
  // ============================================

  async getCenters(): Promise<Center[]> {
    const centers = await this.request<any[]>('/centers');
    return centers.map(c => ({
      id: c.id,
      code: c.code,
      name: c.name,
      region: c.region,
      department: c.department,
      arrondissement: c.arrondissement,
      commune: c.commune,
      address: c.address
    }));
  }

  async createCenter(data: {
    code: string;
    name: string;
    region: string;
    department: string;
    commune: string;
    address: string;
    arrondissement?: string;
  }): Promise<Center> {
    const center = await this.request<any>('/centers', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    return {
      id: center.id,
      code: center.code,
      name: center.name,
      region: center.region,
      department: center.department,
      arrondissement: center.arrondissement,
      commune: center.commune,
      address: center.address
    };
  }

  async updateCenter(id: string, data: Partial<Center>): Promise<Center> {
    const center = await this.request<any>(`/centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    return {
      id: center.id,
      code: center.code,
      name: center.name,
      region: center.region,
      department: center.department,
      arrondissement: center.arrondissement,
      commune: center.commune,
      address: center.address
    };
  }

  // ============================================
  // NOTIFICATIONS METHODS
  // ============================================

  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>('/notifications');
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.request(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async clearReadNotifications(): Promise<void> {
    await this.request('/notifications/clear-read', {
      method: 'DELETE',
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatistics(params?: {
    centerId?: string;
    year?: number;
  }): Promise<{
    total: number;
    byStatus: Record<CertificateStatus, number>;
    byMonth: Array<{ month: string; count: number }>;
    byGender: { M: number; F: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.centerId) queryParams.append('centerId', params.centerId);
    if (params?.year) queryParams.append('year', params.year.toString());

    const query = queryParams.toString();
    return this.request(`/statistics${query ? '?' + query : ''}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export default
export default apiClient;