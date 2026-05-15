import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Récupérer les paramètres de redirection
  const consultationId = searchParams.get('consultationId') || searchParams.get('id');
  const patientId = searchParams.get('patientId');
  const from = searchParams.get('from') || 'unknown';

  // Validation des paramètres requis
  if (!consultationId) {
    return NextResponse.redirect(new URL('/modules/consultation-externe/planning-complet?error=missing_params', request.url));
  }

  // Construire l'URL de destination avec les paramètres
  const traitementUrl = new URL('/modules/consultation-externe/traitement', request.url);
  traitementUrl.searchParams.set('consultationId', consultationId);
  if (patientId) {
    traitementUrl.searchParams.set('patientId', patientId);
  }
  traitementUrl.searchParams.set('from', from);

  // Redirection vers la page traitement
  return NextResponse.redirect(traitementUrl);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { consultationId, patientId, from = 'unknown' } = body;

    // Validation des paramètres requis
    if (!consultationId) {
      return NextResponse.json(
        { error: 'Paramètres manquants: consultationId requis' },
        { status: 400 }
      );
    }

    // Construire l'URL de destination
    const traitementUrl = new URL('/modules/consultation-externe/traitement', request.url);
    traitementUrl.searchParams.set('consultationId', consultationId.toString());
    if (patientId) {
      traitementUrl.searchParams.set('patientId', patientId.toString());
    }
    traitementUrl.searchParams.set('from', from);

    // Retourner l'URL de redirection pour les appels AJAX
    return NextResponse.json({
      redirectUrl: traitementUrl.toString(),
      success: true
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erreur lors du traitement de la requête' },
      { status: 500 }
    );
  }
}
