import { prisma } from "@/lib/db";
import { getCfTempMailbox, toCfTempMail } from "@/lib/email/cf-temp";

function parsePagination(value: string | null, fallback: number) {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

export async function GET(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parsePagination(url.searchParams.get("limit"), 10);
  const offset = parsePagination(url.searchParams.get("offset"), 0);
  if (limit === null || limit < 1 || limit > 100) {
    return Response.json("Invalid limit", { status: 400 });
  }
  if (offset === null || offset < 0) {
    return Response.json("Invalid offset", { status: 400 });
  }

  let mailbox;
  try {
    mailbox = await getCfTempMailbox(authorization.slice(7).trim());
  } catch {
    return Response.json("Unauthorized", { status: 401 });
  }
  if (!mailbox) return Response.json("Unauthorized", { status: 401 });

  try {
    const [emails, count] = await prisma.$transaction([
      prisma.forwardEmail.findMany({
        where: { to: mailbox.emailAddress },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.forwardEmail.count({ where: { to: mailbox.emailAddress } }),
    ]);

    return Response.json({
      results: emails.map(toCfTempMail),
      count,
    });
  } catch (error) {
    console.error("Failed to get CF Temp compatible mails:", error);
    return Response.json("Internal Server Error", { status: 500 });
  }
}
