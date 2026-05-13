import { NextRequest, NextResponse } from "next/server";
import { serverApi } from "@/lib/api/server";

function resolveAuthHeader(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (header) {
    return header;
  }

  const serviceToken = process.env.SERVICE_API_TOKEN;
  if (serviceToken) {
    return `Bearer ${serviceToken}`;
  }

  return null;
}

export async function GET(request: NextRequest) {
  const authorization = resolveAuthHeader(request);

  if (!authorization) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") ?? "50";

  try {
    const response = await serverApi.get("/hospitalisations/notifications", {
      headers: { Authorization: authorization },
      params: { limit },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    return NextResponse.json({ message: "Failed to load notifications." }, { status: 502 });
  }
}
