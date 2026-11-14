import { apiClient } from './client';

const API_URL = '/api/admin/auto';

export const getAdminCars = async () => {
  const response = await apiClient.get(`${API_URL}/cars`);
  return response.data;
};

export const getAdminRecords = async () => {
  const response = await apiClient.get(`${API_URL}/records`);
  return response.data;
};

export const updateAdminRecord = async (id: number, data: any) => {
  const response = await apiClient.put(`${API_URL}/records/${id}`, data);
  return response.data;
};

export const deleteAdminRecord = async (id: number) => {
  const response = await apiClient.delete(`${API_URL}/records/${id}`);
  return response.data;
};