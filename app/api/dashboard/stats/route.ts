import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/lib/api/server";

// Uniquement le token du médecin connecté : plus de secret de service en
// repli (un appel sans utilisateur aurait reçu un accès « service »).
function resolveAuthHeader(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (header) {
    return header;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authorization = resolveAuthHeader(request);

  if (!authorization) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const [hospitalisationResponse, cpaResponse, vpaResponse] = await Promise.all([
      serverApi.get("/hospitalisations/stats", {
        headers: { Authorization: authorization },
      }),
      serverApi.get("/cpa/stats", {
        headers: { Authorization: authorization },
      }),
      serverApi.get("/vpa/stats", {
        headers: { Authorization: authorization },
      }),
    ]);

    return NextResponse.json({
      hospitalizedTotal: hospitalisationResponse.data.hospitalizedTotal,
      hospitalizedNewToday: hospitalisationResponse.data.hospitalizedNewToday,
      externalConsultationsTotal: cpaResponse.data.total,
      externalConsultationsUrgent: cpaResponse.data.urgent,
      controlServiceTotal: hospitalisationResponse.data.hospitalizedTotal,
      controlExternalTotal: vpaResponse.data.pending,
    });
  } catch (error) {
    return NextResponse.json({ message: "Failed to load stats." }, { status: 502 });
  }
}
