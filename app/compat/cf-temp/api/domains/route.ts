import { checkApiKey } from "@/lib/dto/api-key";
import { getDomainsByFeatureClient } from "@/lib/dto/domains";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const apiKey = req.headers.get("x-admin-auth");
  if (!apiKey) return Response.json("Unauthorized", { status: 401 });

  try {
    const user = await checkApiKey(apiKey);
    if (!user?.id) return Response.json("Unauthorized", { status: 401 });

    const domains = await getDomainsByFeatureClient("enable_email");
    return Response.json(domains.map((domain) => domain.domain_name));
  } catch (error) {
    console.error("Failed to get CF Temp compatible domains:", error);
    return Response.json("Internal Server Error", { status: 500 });
  }
}
