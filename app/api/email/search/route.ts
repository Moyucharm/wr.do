import { NextRequest, NextResponse } from "next/server";

import { searchForwardEmailsByUser } from "@/lib/dto/email";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

// 跨当前用户所有邮箱搜索 ForwardEmail
export async function GET(req: NextRequest) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();
    const page = parseInt(searchParams.get("page") || "1", 10);
    const size = parseInt(searchParams.get("size") || "20", 10);
    const all = searchParams.get("all") === "true";

    if (!query) {
      return NextResponse.json({ list: [], total: 0 }, { status: 200 });
    }

    const result = await searchForwardEmailsByUser(
      user.id,
      query,
      page,
      size,
      user.role === "ADMIN" && all,
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error searching forward emails:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
