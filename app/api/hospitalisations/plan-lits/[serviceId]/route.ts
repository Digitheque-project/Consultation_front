import { NextRequest, NextResponse } from "next/server";
import { isAxiosError } from "axios";
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
