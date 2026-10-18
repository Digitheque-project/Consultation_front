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

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "6";

  try {
    const response = await serverApi.get("/hospitalisations/actives", {
      headers: { Authorization: authorization },
      params: { limit },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ message: "Failed to load hospitalisations." }, { status: 502 });
  }
}
