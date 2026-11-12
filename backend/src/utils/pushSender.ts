import webpush from 'web-push';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const sendPushToUser = async (userId: number, title: string, body: string) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions for user ${userId}`);
      return;
    }

    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return;
    }

    webpush.setVapidDetails(
      'mailto:admin@booomerang.ru',
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({ title, body });

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          },
          payload
        );
      } catch (err) {
        console.error(`Failed to send push to subscription ${sub.id}:`, err);
      }
    }
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
};