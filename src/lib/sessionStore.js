import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export const SESSIONS_TABLE = 'sessions';

const buildSkippedResult = () => ({
  ok: false,
  skipped: true,
  error: new Error('Supabase environment variables are not configured.'),
});

const ensureSupabase = () => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  return getSupabaseClient();
};

const findExistingNamedSessionRow = async (supabase, sessionName) => {
  const namedSessionResponse = await supabase
    .from(SESSIONS_TABLE)
    .select('id, client_session_id')
    .eq('session_name', sessionName)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (namedSessionResponse.error) {
    return {
      error: namedSessionResponse.error,
    };
  }

  return {
    data: namedSessionResponse.data,
  };
};

const findExistingClientSessionRow = async (supabase, sessionId) => {
  const clientSessionResponse = await supabase
    .from(SESSIONS_TABLE)
    .select('id, client_session_id')
    .eq('client_session_id', sessionId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (clientSessionResponse.error) {
    return {
      error: clientSessionResponse.error,
    };
  }

  return {
    data: clientSessionResponse.data,
  };
};

const buildSessionPayload = ({
  sessionId,
  sessionName = null,
  command,
  commandHistory,
  objects,
  logs,
  parserMemory,
  heldObjectId,
}) => ({
  client_session_id: sessionId,
  session_name: sessionName,
  last_command: command,
  command_history: commandHistory,
  held_object_id: heldObjectId,
  objects,
  logs,
  parser_memory: parserMemory,
  updated_at: new Date().toISOString(),
});

export const createClientSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const loadLatestSession = async () => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult();
  }
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
  sessionName = null,
  command,
  commandHistory,
  objects,
  logs,
  parserMemory,
  heldObjectId,
}) => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult();
  }

  let data;
  let error;
  const payload = buildSessionPayload({
    sessionId,
    sessionName,
    command,
    commandHistory,
    objects,
    logs,
    parserMemory,
    heldObjectId,
  });

  if (sessionName) {
    const existingNamedSessionResponse = await findExistingNamedSessionRow(supabase, sessionName);

    if (existingNamedSessionResponse.error) {
      return {
        ok: false,
        skipped: false,
        error: existingNamedSessionResponse.error,
      };
    }

    if (existingNamedSessionResponse.data?.id) {
      const response = await supabase
        .from(SESSIONS_TABLE)
        .update({
          ...payload,
          client_session_id: existingNamedSessionResponse.data.client_session_id ?? sessionId,
        })
        .eq('id', existingNamedSessionResponse.data.id)
        .select()
        .single();

      data = response.data;
      error = response.error;
    } else {
      const response = await supabase
        .from(SESSIONS_TABLE)
        .insert({
          ...payload,
          client_session_id: createClientSessionId(),
        })
        .select()
        .single();

      data = response.data;
      error = response.error;
    }
  } else {
    const existingClientSessionResponse = await findExistingClientSessionRow(supabase, sessionId);

    if (existingClientSessionResponse.error) {
      return {
        ok: false,
        skipped: false,
        error: existingClientSessionResponse.error,
      };
    }

    if (existingClientSessionResponse.data?.id) {
      const response = await supabase
        .from(SESSIONS_TABLE)
        .update(payload)
        .eq('id', existingClientSessionResponse.data.id)
        .select()
        .single();

      data = response.data;
      error = response.error;
    } else {
      const response = await supabase
        .from(SESSIONS_TABLE)
        .insert(payload)
        .select()
        .single();

      data = response.data;
      error = response.error;
    }
  }

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

export const loadSessionByName = async (sessionName) => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult();
  }

  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select()
    .eq('session_name', sessionName)
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

export const listSessions = async () => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult();
  }

  const { data, error } = await supabase
    .from(SESSIONS_TABLE)
    .select('session_name, updated_at')
    .not('session_name', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    return {
      ok: false,
      skipped: false,
      error,
    };
  }

  const uniqueSessions = [];
  const seenNames = new Set();

  (data ?? []).forEach((session) => {
    if (!session.session_name || seenNames.has(session.session_name)) {
      return;
    }

    seenNames.add(session.session_name);
    uniqueSessions.push(session);
  });

  return {
    ok: true,
    skipped: false,
    data: uniqueSessions,
  };
};

export const deleteSessionByName = async (sessionName) => {
  const supabase = ensureSupabase();

  if (!supabase) {
    return buildSkippedResult();
  }

  const { error, count } = await supabase
    .from(SESSIONS_TABLE)
    .delete({ count: 'exact' })
    .eq('session_name', sessionName);

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
    count: count ?? 0,
  };
};
