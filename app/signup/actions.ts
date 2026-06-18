"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function redirectWithError(message: string): never {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

function redirectWithMessage(message: string): never {
  redirect(`/signup?message=${encodeURIComponent(message)}`);
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirectWithError("メールアドレスとパスワードを入力してください。");
  }

  if (password.length < 8) {
    redirectWithError("パスワードは8文字以上で入力してください。");
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/app`,
    },
  });

  if (error) {
    redirectWithError(error.message);
  }

  redirectWithMessage(
    "認証メールを送りました。メールボックスを確認してください。",
  );
}