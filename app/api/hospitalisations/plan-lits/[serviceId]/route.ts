import { NextRequest, NextResponse } from "next/server";
import { isAxiosError } from "axios";
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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ serviceId: string }> }
) {
  const authorization = resolveAuthHeader(request);

  if (!authorization) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { serviceId } = await context.params;
  if (!serviceId?.trim()) {
    return NextResponse.json({ message: "serviceId requis" }, { status: 400 });
  }

  try {
    const response = await serverApi.get(
      `/hospitalisations/plan-lits/${encodeURIComponent(serviceId)}`,
      {
        headers: { Authorization: authorization },
      }
    );

    return NextResponse.json(response.data, { status: response.status });
  } catch (error) {
    if (isAxiosError(error) && error.response) {
      return NextResponse.json(
        error.response.data ?? { message: error.message },
        { status: error.response.status }
      );
    }

    return NextResponse.json({ message: "Impossible de charger le plan des lits." }, { status: 502 });
  }
}
