'use server';

import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function sendSupportRequest({
  email,
  category,
  message
}: {
  email: string;
  category: string;
  message: string;
}) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  console.log('[SOPORTE KÔNSUL] Solicitud de ayuda recibida:', {
    userId: user?.id,
    userEmail: user?.email,
    contactEmail: email,
    category,
    message,
    date: new Date().toISOString()
  });

  // Try notifying via Mailing if available
  try {
    const mailingUrl = process.env.NEXT_PUBLIC_MAILING_URL || 'https://mailing.konsul.digital';
    const internalKey = process.env.INTERNAL_API_KEY || 'konsul_ecosystem_secret_key';

    await fetch(`${mailingUrl}/api/v1/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': internalKey
      },
      body: JSON.stringify({
        to: 'somos@konsul.digital',
        subject: `[Soporte Kônsul] ${category} - ${email}`,
        body: `Se ha recibido una nueva solicitud de soporte desde Kônsul Suite:\n\nUsuario: ${user?.given_name || ''} ${user?.family_name || ''} (${user?.id || 'Sin ID'})\nEmail de contacto: ${email}\nCategoría / Tema: ${category}\n\nMensaje:\n${message}\n\nFecha: ${new Date().toLocaleString()}`
      })
    }).catch(err => {
      console.warn('No se pudo enviar correo de soporte vía Mailing:', err.message);
    });
  } catch (e) {
    // Non-blocking
  }

  return { success: true };
}
