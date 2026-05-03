import { NextRequest, NextResponse } from "next/server";

import { deleteNonStarredUserEmails } from "@/lib/dto/email";
import { checkUserStatus } from "@/lib/dto/user";
import { getCurrentUser } from "@/lib/session";

// 批量删除（软删除）当前用户所有非星标邮箱
export async function DELETE(req: NextRequest) {
  try {
    const user = checkUserStatus(await getCurrentUser());
    if (user instanceof Response) return user;

    let body: { confirm?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // 简单的危险操作二次校验
    if (body.confirm !== "DELETE ALL UNSTARRED") {
      return NextResponse.json(
        {
          error:
            "Confirmation phrase mismatch. Pass { confirm: 'DELETE ALL UNSTARRED' }.",
        },
        { status: 400 },
      );
    }

    const result = await deleteNonStarredUserEmails(
      user.id,
      user.role === "ADMIN",
    );

    return NextResponse.json(
      {
        success: true,
        deletedCount: result.deletedCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error deleting non-starred emails:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
