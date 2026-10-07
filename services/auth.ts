import { isSupabaseConfigured, getBrowserClient } from "@/lib/supabase/browser";
import { useSessionStore } from "@/store/session-store";

export async function signIn(email: string, password: string, remember: boolean) {
  const { data, error } = await getBrowserClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  useSessionStore.getState().login(data.user.email ?? email, remember);
}

export async function signUp(input: { name: string; email: string; department: string; password: string }) {
  const { data, error } = await getBrowserClient().auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        name: input.name,
        department: input.department,
        university: "ABC University",
        title: "Faculty",
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error("Confirm your email, then sign in. In Supabase Auth, turn off email confirmation for instant signup.");
  }
  useSessionStore.getState().login(data.user?.email ?? input.email, true);
}

export async function sendPasswordReset(email: string) {
  const { error } = await getBrowserClient().auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const { error } = await getBrowserClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    await getBrowserClient().auth.signOut();
  }
  useSessionStore.getState().logout();
}

export async function hydrateAuthSession() {
  if (!isSupabaseConfigured()) return;
  const { data } = await getBrowserClient().auth.getSession();
  const email = data.session?.user.email;
  if (email) {
    const remember = useSessionStore.getState().session?.remember ?? true;
    useSessionStore.getState().login(email, remember);
    return;
  }
  if (useSessionStore.getState().session) useSessionStore.getState().logout();
}
