// lib/middleware/authMiddleware.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret123";

export function requireAuth(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload; // { id, email }
  } catch {
    return null;
  }
}

export function authGuard(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}
