import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const buildSkippedResult = (message) => ({
  ok: false,
  skipped: true,
  error: new Error(message),
});

const ensureSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return getSupabaseClient();
};

export const getCurrentAuthState = async () => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult('Supabase environment variables are not configured.');
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    return {
      ok: false,
      skipped: false,
      error,
    };
  }

  return {
    ok: true,
    skipped: false,
    session,
    user: session?.user ?? null,
  };
};

export const subscribeToAuthChanges = (callback) => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback({
      event,
      session,
      user: session?.user ?? null,
    });
  });

  return () => {
    data.subscription.unsubscribe();
  };
};

export const signInWithPassword = async ({ email, password }) => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult('Supabase environment variables are not configured.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      skipped: false,
      error,
    };
  }

  return {
    ok: true,
    skipped: false,
    user: data.user ?? null,
    session: data.session ?? null,
  };
};

export const signUpWithPassword = async ({ email, password }) => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult('Supabase environment variables are not configured.');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return {
      ok: false,
      skipped: false,
      error,
    };
  }

  return {
    ok: true,
    skipped: false,
    user: data.user ?? null,
    session: data.session ?? null,
  };
};

export const signOut = async () => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult('Supabase environment variables are not configured.');
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return {
      ok: false,
      skipped: false,
      error,
    };
  }

  return {
    ok: true,
    skipped: false,
  };
};
