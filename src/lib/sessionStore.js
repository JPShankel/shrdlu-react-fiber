import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export const SESSIONS_TABLE = 'sessions';

export const createClientSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const loadLatestSession = async () => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      skipped: true,
      error: new Error('Supabase environment variables are not configured.'),
    };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select()
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

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
    data,
  };
};

export const saveSession = async ({
  sessionId,
  command,
  commandHistory,
  objects,
  logs,
  parserMemory,
  heldObjectId,
}) => {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      skipped: true,
      error: new Error('Supabase environment variables are not configured.'),
    };
  }

  const supabase = getSupabaseClient();
  const payload = {
    client_session_id: sessionId,
    last_command: command,
    command_history: commandHistory,
    held_object_id: heldObjectId,
    objects,
    logs,
    parser_memory: parserMemory,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .upsert(payload, { onConflict: 'client_session_id' })
    .select()
    .single();

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
    data,
  };
};
