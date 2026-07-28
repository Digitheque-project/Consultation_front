import { NextRequest, NextResponse } from 'next/server';

/** Reconstruit la base URL publique à partir des headers de proxy (Render, Vercel, etc.).
 *  Évite d'utiliser request.url qui donne https://localhost:10000 sur Render. */
function getPublicBaseUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const host = request.headers.get('host') ?? 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const base = getPublicBaseUrl(request);

  const consultationId = searchParams.get('consultationId') || searchParams.get('id');
  const patientId = searchParams.get('patientId');
  const from = searchParams.get('from') || 'unknown';
  const origin = searchParams.get('origin');

  if (!consultationId) {
    return NextResponse.redirect(`${base}/modules/consultation-externe/planning-complet?error=missing_params`);
  }

  const params = new URLSearchParams();
  params.set('consultationId', consultationId);
  if (patientId) params.set('patientId', patientId);
  params.set('from', from);
  if (origin) params.set('origin', origin);

  return NextResponse.redirect(`${base}/modules/consultation-externe/traitement?${params.toString()}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultationId, patientId, from = 'unknown', origin } = body;

    if (!consultationId) {
      return NextResponse.json(
        { error: 'Paramètres manquants: consultationId requis' },
        { status: 400 }
      );
    }

    // Chemin relatif — router.push() résout sur le bon domaine côté navigateur
    const params = new URLSearchParams();
    params.set('consultationId', consultationId.toString());
    if (patientId) params.set('patientId', patientId.toString());
    params.set('from', from);
    if (origin) params.set('origin', origin.toString());

    return NextResponse.json({
      redirectUrl: `/modules/consultation-externe/traitement?${params.toString()}`,
      success: true,
    });

  } catch {
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la requête' },
      { status: 500 }
    );
  }
}
