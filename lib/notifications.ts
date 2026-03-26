import { Resend } from 'resend';
import { AuthRequestEmail } from '@/app/emails/AuthRequestEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const ORIGIN_EMAIL = process.env.MAINTENANCE_ORIGIN_EMAIL || 'onboarding@resend.dev';
const ADMIN_EMAIL = process.env.MAINTENANCE_ADMIN_EMAIL || '';


export async function sendMaintenanceAuthNotification(request: {
  hash_id: string;
  machineName: string;
  description: string;
}) {
  const approveUrl = `${APP_URL}/maintenance/verify?token=${request.hash_id}&action=approve`;
  const denyUrl = `${APP_URL}/maintenance/verify?token=${request.hash_id}&action=reject`;

  try {
    const { data, error } = await resend.emails.send({
      from: ORIGIN_EMAIL,
      to: [ADMIN_EMAIL],
      subject: `Autorización Requerida: ${request.machineName}`,
      react: AuthRequestEmail({
        machineName: request.machineName,
        description: request.description,
        approveUrl,
        denyUrl,
      }),
    });


    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Notification service error:', err);
    return { success: false, error: err };
  }
}

// Future placeholder for WhatsApp
export async function sendMaintenanceWhatsAppNotification(request: any) {
  console.log('WhatsApp notification logic to be implemented here');
  return { success: true };
}
