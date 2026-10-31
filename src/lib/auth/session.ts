import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { redirect } from "next/navigation";

const SESSION_COOKIE_NAME = "qa_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return sessionId;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return null;
    }

    const now = new Date();
    const result = await db
      .select({
        user: users,
        session: sessions,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
      .limit(1);

    if (!result || result.length === 0) {
      return null;
    }

    return result[0].user;
  } catch (error) {
    console.error("Failed to retrieve current user session:", error);
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      cookieStore.delete(SESSION_COOKIE_NAME);
    }
  } catch (error) {
    console.error("Failed to destroy session:", error);
  }
}
