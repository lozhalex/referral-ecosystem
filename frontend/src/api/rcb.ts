import { apiClient } from './client';

export const markRcbRegistered = async () => {
  const response = await apiClient.post('/api/rcb/mark-registered');
  return response.data;
};

export const requestRcbPayment = async () => {
  const response = await apiClient.post('/api/rcb/request-payment');
  return response.data;
};

export const updateRcbLink = async (rcbReferralLink: string) => {
  const response = await apiClient.post('/api/rcb/update-link', { rcbReferralLink });
  return response.data;
};

export const getAdminRcbRequests = async () => {
  const response = await apiClient.get('/api/admin/rcb-requests');
  return response.data;
};

export const approveAdminRcbRequest = async (userId: number) => {
  const response = await apiClient.post(`/api/admin/rcb-requests/${userId}/approve`);
  return response.data;
};