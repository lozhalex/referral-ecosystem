import axios from 'axios';

const API_URL = '/api/auto';

// === АВТОМОБИЛИ ===
export const getCars = async () => {
  const response = await axios.get(`${API_URL}/cars`);
  return response.data;
};

export const createCar = async (data: any) => {
  const response = await axios.post(`${API_URL}/cars`, data);
  return response.data;
};

export const updateCar = async (id: number, data: any) => {
  const response = await axios.put(`${API_URL}/cars/${id}`, data);
  return response.data;
};

export const deleteCar = async (id: number) => {
  const response = await axios.post(`${API_URL}/cars/${id}/delete`);
  return response.data;
};

// === ЖУРНАЛ ===
export const getJournal = async (carId: number) => {
  const response = await axios.get(`${API_URL}/journal?carId=${carId}`);
  return response.data;
};

export const createRecord = async (data: any) => {
  const response = await axios.post(`${API_URL}/journal`, data);
  return response.data;
};

// === ИНТЕРВАЛЫ ===
export const getIntervals = async () => {
  const response = await axios.get(`${API_URL}/intervals`);
  return response.data;
};

export const saveIntervals = async (intervals: Record<string, number>) => {
  const response = await axios.post(`${API_URL}/intervals`, { intervals });
  return response.data;
};

// === ПРОБЕГ ===
export const submitMileageCheck = async (carId: number, km: number) => {
  const response = await axios.post(`${API_URL}/mileage-check`, { carId, km });
  return response.data;
};

export const getMileageCheckStatus = async () => {
  const response = await axios.get(`${API_URL}/mileage-check/status`);
  return response.data;
};

// 🆕 НОВОЕ: Получить все отметки пробега для расчёта среднего темпа
export const getMileageChecks = async (carId: number) => {
  const response = await axios.get(`${API_URL}/mileage-checks/${carId}`);
  return response.data;
};

// === DASHBOARD ===
export const getDashboard = async (carId?: number) => {
  const url = carId ? `${API_URL}/dashboard?carId=${carId}` : `${API_URL}/dashboard`;
  const response = await axios.get(url);
  return response.data;
};

// === НАСТРОЙКИ ===
export const getSettings = async () => {
  const response = await axios.get(`${API_URL}/settings`);
  return response.data;
};

export const saveSettings = async (mileageReminderTime: string) => {
  const response = await axios.post(`${API_URL}/settings`, { mileageReminderTime });
  return response.data;
};

// === УВЕДОМЛЕНИЯ ===
export const getNotifications = async () => {
  const response = await axios.get(`${API_URL}/notifications`);
  return response.data;
};

export const markNotificationsRead = async (types?: string[]) => {
  const response = await axios.post(`${API_URL}/notifications/read`, { types });
  return response.data;
};