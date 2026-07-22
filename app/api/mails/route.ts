import { prisma } from "@/lib/db";
import {
  getCfTempMailbox,
  parseCfTempPagination,
  toCfTempMail,
} from "@/lib/email/cf-temp";

export async function GET(req: Request) {
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const pagination = parseCfTempPagination(
    url.searchParams.get("limit"),
    url.searchParams.get("offset"),
  );
  if ("error" in pagination) {
    return Response.json(pagination.error, { status: 400 });
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
        orderBy: { cfTempId: "desc" },
        skip: pagination.offset,
        take: pagination.limit,
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
