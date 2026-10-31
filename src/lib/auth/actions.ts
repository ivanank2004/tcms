"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession } from "./session";
import { redirect } from "next/navigation";

const SignUpSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const SignInSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type AuthActionResult = {
  error?: string;
  success?: boolean;
};

export async function signUpAction(prevState: AuthActionResult | null, formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = SignUpSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return { error: "An account with this email already exists" };
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash,
    });

    await createSession(userId);
  } catch (error) {
    console.error("Sign up failure:", error);
    return { error: "Failed to create account. Please try again." };
  }

  redirect("/dashboard");
}

export async function signInAction(prevState: AuthActionResult | null, formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = SignInSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { email, password } = parsed.data;

  let userId: string | null = null;
  try {
    const matched = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (matched.length === 0 || !matched[0].passwordHash) {
      return { error: "Invalid email or password" };
    }

    const valid = await bcrypt.compare(password, matched[0].passwordHash);
    if (!valid) {
      return { error: "Invalid email or password" };
    }

    userId = matched[0].id;
    await createSession(userId);
  } catch (error) {
    console.error("Sign in failure:", error);
    return { error: "An unexpected error occurred during sign-in." };
  }

  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
