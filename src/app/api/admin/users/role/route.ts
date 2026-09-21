import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session || user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.userId || !body.role) {
      return NextResponse.json({ error: "Missing required fields: userId and role" }, { status: 400 });
    }

    const { userId, role } = body;

    if (!["CUSTOMER", "LAWYER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    // Guard: Prevent admin from modifying their own role (accidental lockout)
    if (userId === user.id && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Security restriction: You cannot demote your own administrator account" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    const previousRole = targetUser.role;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    await createAuditLog({
      actorId: user.id,
      action: "USER_ROLE_UPDATED",
      entity: "User",
      entityId: userId,
      details: {
        targetUserEmail: targetUser.email,
        previousRole,
        newRole: role,
        changedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User role successfully changed from ${previousRole} to ${role}`,
    });
  } catch (error) {
    console.error("Admin user role update error:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }
}
