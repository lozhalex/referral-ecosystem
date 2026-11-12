export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return 'denied';
  return await Notification.requestPermission();
};

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered successfully:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

export const subscribeToPush = async (subscription: PushSubscriptionJSON) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/auto/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(subscription)
    });
    return await response.json();
  } catch (error) {
    console.error('Push subscription error:', error);
    return { success: false };
  }
};

export const getVapidPublicKey = async (): Promise<string | null> => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/auto/push/vapid-public-key', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.publicKey || null;
  } catch (error) {
    console.error('Error fetching VAPID key:', error);
    return null;
  }
};

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}