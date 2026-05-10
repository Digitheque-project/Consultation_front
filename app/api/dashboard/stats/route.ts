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
