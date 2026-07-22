import { ForwardEmail, UserEmail } from "@prisma/client";
import { jwtVerify, SignJWT } from "jose";

import { env } from "@/env.mjs";
import { prisma } from "@/lib/db";

const JWT_ISSUER = "wr.do";
const JWT_AUDIENCE = "cf-temp";

type AddressTokenPayload = {
  userId: string;
  emailId: string;
  address: string;
};

export function getCfTempCompatId(id: string) {
  const hex = id.replace(/[^a-f0-9]/gi, "").slice(0, 13);
  return Number.parseInt(hex || "0", 16);
}

export function parseCfTempPagination(
  limitValue: string | null,
  offsetValue: string | null,
  defaults: { limit?: number; offset?: number } = {},
) {
  const defaultLimit = defaults.limit ?? 10;
  const defaultOffset = defaults.offset ?? 0;

  const parse = (value: string | null, fallback: number) => {
    if (value === null) return fallback;
    if (!/^\d+$/.test(value)) return null;
    return Number.parseInt(value, 10);
  };

  const limit = parse(limitValue, defaultLimit);
  const offset = parse(offsetValue, defaultOffset);
  if (limit === null || limit < 1 || limit > 100) {
    return { error: "Invalid limit" as const };
  }
  if (offset === null || offset < 0) {
    return { error: "Invalid offset" as const };
  }

  return { limit, offset };
}

function getJwtSecret() {
  if (!env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required for CF Temp compatibility");
  }

  return new TextEncoder().encode(env.AUTH_SECRET);
}

export function assertCfTempAuthConfigured() {
  getJwtSecret();
}

export async function signCfTempAddressToken(userEmail: UserEmail) {
  return new SignJWT({
    userId: userEmail.userId,
    emailId: userEmail.id,
    address: userEmail.emailAddress,
    address_id: getCfTempCompatId(userEmail.id),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .sign(getJwtSecret());
}

export async function getCfTempMailbox(token: string) {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    algorithms: ["HS256"],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  const { userId, emailId, address } = payload as AddressTokenPayload;
  if (!userId || !emailId || !address) return null;

  return prisma.userEmail.findFirst({
    where: {
      id: emailId,
      userId,
      emailAddress: address,
      deletedAt: null,
    },
  });
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodeHeader(value: string) {
  const sanitized = sanitizeHeader(value);
  if (/^[\x20-\x7e]*$/.test(sanitized)) return sanitized;
  return `=?UTF-8?B?${Buffer.from(sanitized).toString("base64")}?=`;
}

function encodeBody(value: string) {
  return (
    Buffer.from(value)
      .toString("base64")
      .match(/.{1,76}/g)
      ?.join("\r\n") || ""
  );
}

function formatDate(email: ForwardEmail) {
  const date = new Date(email.date || email.createdAt);
  return Number.isNaN(date.getTime())
    ? email.createdAt.toUTCString()
    : date.toUTCString();
}

export function createCfTempRawEmail(email: ForwardEmail) {
  const headers = [
    `From: ${
      email.fromName
        ? `${encodeHeader(email.fromName)} <${sanitizeHeader(email.from)}>`
        : sanitizeHeader(email.from)
    }`,
    `To: ${sanitizeHeader(email.to)}`,
    `Subject: ${encodeHeader(email.subject || "")}`,
    `Date: ${formatDate(email)}`,
  ];

  if (email.cc && email.cc !== "[]") {
    headers.push(`Cc: ${sanitizeHeader(email.cc)}`);
  }
  if (email.replyTo) {
    headers.push(`Reply-To: ${sanitizeHeader(email.replyTo)}`);
  }
  if (email.messageId) {
    headers.push(`Message-ID: ${sanitizeHeader(email.messageId)}`);
  }

  headers.push("MIME-Version: 1.0");

  const text = email.text || "";
  const html = email.html || "";
  if (text && html) {
    const boundary = `wrdo-${email.id.replace(/[^a-z0-9]/gi, "")}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return [
      ...headers,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeBody(text),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeBody(html),
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  headers.push(
    `Content-Type: ${html ? "text/html" : "text/plain"}; charset="UTF-8"`,
    "Content-Transfer-Encoding: base64",
  );
  return [...headers, "", encodeBody(html || text), ""].join("\r\n");
}

export function toCfTempMail(email: ForwardEmail) {
  return {
    id: email.cfTempId,
    message_id: email.messageId,
    source: email.from,
    address: email.to,
    raw: createCfTempRawEmail(email),
    created_at: email.createdAt,
  };
}
