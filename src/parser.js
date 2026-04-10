const DETERMINERS = new Set(['the', 'a', 'an']);
const CONJUNCTIONS = new Set(['and', 'then']);
const COLOR_WORDS = new Set(['red', 'yellow', 'orange', 'green', 'blue']);
const SIZE_WORDS = new Set(['small', 'medium', 'large']);
const SHAPE_WORDS = new Set(['cube', 'sphere', 'cone', 'object', 'thing']);

const LOCATION_PATTERNS = [
  { relation: 'next_to', words: ['next', 'to'] },
  { relation: 'left_of', words: ['to', 'the', 'left', 'of'] },
  { relation: 'right_of', words: ['to', 'the', 'right', 'of'] },
  { relation: 'in_front_of', words: ['in', 'front', 'of'] },
  { relation: 'behind', words: ['behind'] },
  { relation: 'on_top_of', words: ['on', 'top', 'of'] },
  { relation: 'on', words: ['on'] },
  { relation: 'onto', words: ['onto'] },
  { relation: 'in', words: ['in'] },
];

const COMMAND_PATTERNS = [
  { action: 'add', words: ['add'] },
  { action: 'remove', words: ['remove'] },
  { action: 'remove', words: ['delete'] },
  { action: 'pick_up', words: ['pick', 'up'] },
  { action: 'pick_up', words: ['pickup'] },
  { action: 'put_down', words: ['put', 'down'] },
  { action: 'put_down', words: ['drop'] },
  { action: 'put', words: ['put'] },
  { action: 'place', words: ['place'] },
  { action: 'move', words: ['move'] },
];

const matchesPattern = (tokens, startIndex, words) =>
  words.every((word, offset) => tokens[startIndex + offset] === word);

const tokenize = (input) =>
  input
    .toLowerCase()
    .replace(/[.,!?;:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const splitClauses = (tokens) => {
  const clauses = [];
  let current = [];

  tokens.forEach((token) => {
    if (CONJUNCTIONS.has(token)) {
      if (current.length) {
        clauses.push(current);
        current = [];
      }
      return;
    }

    current.push(token);
  });

  if (current.length) {
    clauses.push(current);
  }

  return clauses;
};

const parseCommandWord = (tokens) => {
  for (const pattern of COMMAND_PATTERNS) {
    if (matchesPattern(tokens, 0, pattern.words)) {
      return {
        action: pattern.action,
        consumed: pattern.words.length,
      };
    }
  }

  return {
    action: 'unknown',
    consumed: 0,
  };
};

const parseReference = (tokens) => {
  const reference = {
    kind: 'object',
    pronoun: null,
    color: null,
    size: null,
    shape: null,
    raw: tokens.join(' ').trim(),
  };

  if (!tokens.length) {
    return reference;
  }

  if (tokens[0] === 'it' || tokens[0] === 'them') {
    return {
      ...reference,
      kind: 'pronoun',
      pronoun: tokens[0],
      raw: tokens[0],
    };
  }

  tokens.forEach((token) => {
    if (DETERMINERS.has(token)) {
      return;
    }

    if (COLOR_WORDS.has(token)) {
      reference.color = token;
      return;
    }

    if (SIZE_WORDS.has(token)) {
      reference.size = token;
      return;
    }

    if (SHAPE_WORDS.has(token) && token !== 'object' && token !== 'thing') {
      reference.shape = token;
    }
  });

  return reference;
};

const findLocationStart = (tokens, startIndex) => {
  for (let i = startIndex; i < tokens.length; i += 1) {
    for (const pattern of LOCATION_PATTERNS) {
      if (matchesPattern(tokens, i, pattern.words)) {
        return {
          index: i,
          relation: pattern.relation,
          consumed: pattern.words.length,
        };
      }
    }
  }

  return null;
};

const parseClause = (tokens) => {
  const command = parseCommandWord(tokens);
  const remaining = tokens.slice(command.consumed);
  const locationStart = findLocationStart(remaining, 0);

  if (!locationStart) {
    return {
      raw: tokens.join(' '),
      action: command.action,
      directObject: parseReference(remaining),
      location: null,
    };
  }

  return {
    raw: tokens.join(' '),
    action: command.action,
    directObject: parseReference(remaining.slice(0, locationStart.index)),
    location: {
      relation: locationStart.relation,
      target: parseReference(remaining.slice(locationStart.index + locationStart.consumed)),
    },
  };
};

const describeObject = (object) => `${object.size} ${object.color} ${object.type}`;
const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

const resolveReference = (reference, objects, memory) => {
  if (!reference || (!reference.raw && reference.kind !== 'pronoun')) {
    return {
      status: 'missing',
      matches: [],
      summary: 'no reference',
    };
  }

  if (reference.kind === 'pronoun') {
    if (reference.pronoun === 'it' && memory.lastSingular) {
      return {
        status: 'resolved',
        matches: [memory.lastSingular],
        summary: `pronoun -> ${describeObject(memory.lastSingular)}`,
      };
    }

    return {
      status: 'unresolved',
      matches: [],
      summary: `pronoun ${reference.pronoun} has no context`,
    };
  }

  const matches = objects.filter((object) => {
    if (reference.shape && object.type !== reference.shape) {
      return false;
    }

    if (reference.color && object.color !== reference.color) {
      return false;
    }

    if (reference.size && object.size !== reference.size) {
      return false;
    }

    return true;
  });

  if (matches.length === 1) {
    return {
      status: 'resolved',
      matches,
      summary: `resolved -> ${describeObject(matches[0])}`,
    };
  }

  if (matches.length > 1) {
    const chosen = pickRandom(matches);

    return {
      status: 'resolved',
      matches: [chosen],
      candidates: matches,
      summary: `ambiguous -> randomly chose ${describeObject(chosen)} from ${matches.map(describeObject).join(', ')}`,
    };
  }

  return {
    status: 'unresolved',
    matches: [],
    summary: 'no matching object',
  };
};

export const parseCommand = (input, objects, memory = {}) => {
  const tokens = tokenize(input);
  const clauses = splitClauses(tokens).map(parseClause);
  const nextMemory = { ...memory };

  const resolvedClauses = clauses.map((clause) => {
    const directResolution = resolveReference(clause.directObject, objects, nextMemory);

    if (directResolution.status === 'resolved' && directResolution.matches[0]) {
      nextMemory.lastSingular = directResolution.matches[0];
    }

    const locationResolution = clause.location
      ? resolveReference(clause.location.target, objects, nextMemory)
      : null;

    return {
      ...clause,
      directResolution,
      location: clause.location
        ? {
            ...clause.location,
            resolution: locationResolution,
          }
        : null,
    };
  });

  return {
    tokens,
    clauses: resolvedClauses,
    memory: nextMemory,
  };
};
