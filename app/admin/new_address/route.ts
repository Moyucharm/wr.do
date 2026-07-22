import { Prisma } from "@prisma/client";

import { checkApiKey } from "@/lib/dto/api-key";
import { getDomainsByFeature } from "@/lib/dto/domains";
import { createUserEmail } from "@/lib/dto/email";
import { getPlanQuota } from "@/lib/dto/plan";
import {
  assertCfTempAuthConfigured,
  getCfTempCompatId,
  signCfTempAddressToken,
} from "@/lib/email/cf-temp";
import { reservedAddressSuffix } from "@/lib/enums";
import { restrictByTimeRange } from "@/lib/team";

type NewAddressBody = {
  name?: unknown;
  domain?: unknown;
  enablePrefix?: unknown;
};

export async function POST(req: Request) {
  const apiKey = req.headers.get("x-admin-auth");
  if (!apiKey) return Response.json("Unauthorized", { status: 401 });

  const user = await checkApiKey(apiKey);
  if (!user?.id) return Response.json("Unauthorized", { status: 401 });

  let body: NewAddressBody;
  try {
    body = await req.json();
  } catch {
    return Response.json("Invalid request body", { status: 400 });
  }

  if (
    body.enablePrefix !== undefined &&
    typeof body.enablePrefix !== "boolean"
  ) {
    return Response.json("Invalid enablePrefix", { status: 400 });
  }
  if (body.enablePrefix) {
    return Response.json("enablePrefix is not supported", { status: 400 });
  }

  const name =
    typeof body.name === "string"
      ? body.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : "";
  const domain =
    typeof body.domain === "string" ? body.domain.trim().toLowerCase() : "";
  if (!name || !domain || name.includes("@")) {
    return Response.json("Missing or invalid name/domain", { status: 400 });
  }

  const zones = await getDomainsByFeature("enable_email", true);
  const zone = zones.find((item) => item.domain_name.toLowerCase() === domain);
  if (!zone) return Response.json("Invalid domain", { status: 400 });
  if (name.length < (zone.min_email_length ?? 1)) {
    return Response.json(
      `Email address length must be at least ${zone.min_email_length ?? 1}`,
      { status: 400 },
    );
  }
  if (reservedAddressSuffix.includes(name)) {
    return Response.json("Invalid email address", { status: 400 });
  }

  try {
    assertCfTempAuthConfigured();
  } catch (error) {
    console.error("CF Temp compatibility is not configured:", error);
    return Response.json("Internal Server Error", { status: 500 });
  }

  const plan = await getPlanQuota(user.team!);
  const limit = await restrictByTimeRange({
    model: "userEmail",
    userId: user.id,
    limit: plan.emEmailAddresses,
    rangeType: "month",
  });
  if (limit) return Response.json(limit.statusText, { status: limit.status });

  try {
    const userEmail = await createUserEmail(user.id, `${name}@${domain}`);
    const jwt = await signCfTempAddressToken(userEmail);
    return Response.json({
      jwt,
      address: userEmail.emailAddress,
      address_id: getCfTempCompatId(userEmail.id),
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return Response.json("Email address already exists", { status: 409 });
    }
    console.error("Failed to create CF Temp compatible address:", error);
    return Response.json("Internal Server Error", { status: 500 });
  }
}
