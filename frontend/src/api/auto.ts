import { apiClient } from './client';

// ==========================================
// АВТОМОБИЛИ
// ==========================================

export const getCars = async () => {
  const response = await apiClient.get('/api/auto/cars');
  return response.data;
};

export const createCar = async (data: {
  marka?: string;
  model?: string;
  year?: string;
  gosnomer?: string;
  vin?: string;
  mileage?: number;
}) => {
  const response = await apiClient.post('/api/auto/cars', data);
  return response.data;
};

export const updateCar = async (id: number, data: {
  marka?: string;
  model?: string;
  year?: string;
  gosnomer?: string;
  vin?: string;
  mileage?: number;
}) => {
  const response = await apiClient.put(`/api/auto/cars/${id}`, data);
  return response.data;
};

export const deleteCar = async (id: number) => {
  const response = await apiClient.post(`/api/auto/cars/${id}/delete`);
  return response.data;
};

// ==========================================
// ЖУРНАЛ ОБСЛУЖИВАНИЯ
// ==========================================

export const getJournal = async (carId?: number) => {
  const params = carId ? { carId } : {};
  const response = await apiClient.get('/api/auto/journal', { params });
  return response.data;
};

export const createRecord = async (data: {
  carId: number;
  date: string;
  mileage: number;
  category: string;
  subcat?: string;
  work?: string;
  cost?: number;
  comment?: string;
}) => {
  const response = await apiClient.post('/api/auto/journal', data);
  return response.data;
};

// ==========================================
// ИНТЕРВАЛЫ
// ==========================================

export const getIntervals = async () => {
  const response = await apiClient.get('/api/auto/intervals');
  return response.data;
};

export const saveIntervals = async (intervals: Record<string, number>) => {
  const response = await apiClient.post('/api/auto/intervals', { intervals });
  return response.data;
};

// ==========================================
// ВВОД ПРОБЕГА (Mileage Check)
// ==========================================

export const submitMileageCheck = async (carId: number, km: number) => {
  const response = await apiClient.post('/api/auto/mileage-check', { carId, km });
  return response.data;
};

export const getMileageCheckStatus = async () => {
  const response = await apiClient.get('/api/auto/mileage-check/status');
  return response.data;
};

// ==========================================
// НАСТРОЙКИ
// ==========================================

export const getSettings = async () => {
  const response = await apiClient.get('/api/auto/settings');
  return response.data;
};

export const saveSettings = async (mileageReminderTime: string) => {
  const response = await apiClient.post('/api/auto/settings', { mileageReminderTime });
  return response.data;
};

// ==========================================
// ДАШБОРД
// ==========================================

export const getDashboard = async (carId?: number) => {
  const params = carId ? { carId } : {};
  const response = await apiClient.get('/api/auto/dashboard', { params });
  return response.data;
};