import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { checkApiKey } from "@/lib/dto/api-key";
import { parseCfTempPagination, toCfTempMail } from "@/lib/email/cf-temp";

export async function GET(req: Request) {
  const apiKey = req.headers.get("x-admin-auth");
  if (!apiKey) return Response.json("Unauthorized", { status: 401 });

  const user = await checkApiKey(apiKey);
  if (!user?.id) return Response.json("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const pagination = parseCfTempPagination(
    url.searchParams.get("limit"),
    url.searchParams.get("offset"),
    { limit: 20 },
  );
  if ("error" in pagination) {
    return Response.json(pagination.error, { status: 400 });
  }

  const address = url.searchParams.get("address")?.trim().toLowerCase() || "";

  try {
    let where: Prisma.ForwardEmailWhereInput;

    if (address) {
      const mailbox = await prisma.userEmail.findFirst({
        where: {
          emailAddress: address,
          userId: user.id,
          deletedAt: null,
        },
        select: { emailAddress: true },
      });
      if (!mailbox) {
        return Response.json("Email address not found", { status: 404 });
      }
      where = { to: mailbox.emailAddress };
    } else {
      const mailboxes = await prisma.userEmail.findMany({
        where: {
          userId: user.id,
          deletedAt: null,
        },
        select: { emailAddress: true },
      });
      if (mailboxes.length === 0) {
        return Response.json({ results: [], count: 0 });
      }
      where = {
        to: { in: mailboxes.map((mailbox) => mailbox.emailAddress) },
      };
    }

    const emails = await prisma.forwardEmail.findMany({
      where,
      orderBy: { cfTempId: "desc" },
      skip: pagination.offset,
      take: pagination.limit,
    });
    // Match upstream CF Temp admin list: only compute total on first page.
    const count =
      pagination.offset === 0 ? await prisma.forwardEmail.count({ where }) : 0;

    return Response.json({
      results: emails.map(toCfTempMail),
      count,
    });
  } catch (error) {
    console.error("Failed to get CF Temp admin mails:", error);
    return Response.json("Internal Server Error", { status: 500 });
  }
}
