const DETERMINERS = new Set(['the', 'a', 'an']);
const CONJUNCTIONS = new Set(['and', 'then']);
const COLOR_WORDS = new Set(['red', 'yellow', 'orange', 'green', 'blue']);
const SIZE_WORDS = new Set(['small', 'medium', 'large', 'jumbo']);
const SHAPE_WORDS = new Set(['cube', 'sphere', 'cone', 'box', 'object', 'thing']);
const REFERENCE_FILLER_WORDS = new Set(['that', 'which', 'is']);
const SIZE_RANK = {
  small: 1,
  medium: 2,
  large: 3,
  jumbo: 4,
};
const SIZE_HEIGHT = {
  small: 0.35,
  medium: 0.5,
  large: 0.7,
};
const DISTANCE_TIE_EPSILON = 0.001;
const AXIS_TOLERANCE = 0.2;
const PLANAR_TOLERANCE = 0.35;

const LOCATION_PATTERNS = [
  { relation: 'next_to', words: ['next', 'to'] },
  { relation: 'left_of', words: ['to', 'the', 'left', 'of'] },
  { relation: 'right_of', words: ['to', 'the', 'right', 'of'] },
  { relation: 'in_front_of', words: ['in', 'front', 'of'] },
  { relation: 'behind', words: ['behind'] },
  { relation: 'in', words: ['inside', 'of'] },
  { relation: 'in', words: ['inside'] },
  { relation: 'in', words: ['in'] },
  { relation: 'on_top_of', words: ['on', 'top', 'of'] },
  { relation: 'on', words: ['on'] },
  { relation: 'onto', words: ['onto'] },
];

const COMMAND_PATTERNS = [
  { action: 'help', words: ['help'] },
  { action: 'list_sessions', words: ['list', 'sessions'] },
  { action: 'save_session', words: ['save', 'session'] },
  { action: 'save_session', words: ['save'] },
  { action: 'load_session', words: ['load', 'session'] },
  { action: 'load_session', words: ['load'] },
  { action: 'delete_session', words: ['remove', 'session'] },
  { action: 'delete_session', words: ['delete', 'session'] },
  { action: 'shuffle', words: ['shuffle'] },
  { action: 'new_scene', words: ['make', 'new', 'scene'] },
  { action: 'new_scene', words: ['new', 'scene'] },
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

const QUERY_PATTERNS = [
  { action: 'query_where', words: ['where', 'is'] },
  { action: 'query_where', words: ['where', 'are'] },
  { action: 'query_object', words: ['which'] },
  { action: 'query_object', words: ['which', 'object', 'is'] },
  { action: 'query_object', words: ['which', 'thing', 'is'] },
  { action: 'query_object', words: ['which', 'one', 'is'] },
  { action: 'query_object', words: ['what'] },
  { action: 'query_object', words: ['what', 'object', 'is'] },
  { action: 'query_object', words: ['what', 'thing', 'is'] },
  { action: 'query_yes_no', words: ['is'] },
  { action: 'query_yes_no', words: ['are'] },
];

const REFERENCE_SPECIFIER_PATTERNS = [
  { relation: 'nearest_to', words: ['nearest', 'to'] },
  { relation: 'closest_to', words: ['closest', 'to'] },
  { relation: 'furthest_from', words: ['furthest', 'from'] },
  { relation: 'furthest_from', words: ['farthest', 'from'] },
  { relation: 'next_to', words: ['next', 'to'] },
  { relation: 'left_of', words: ['to', 'the', 'left', 'of'] },
  { relation: 'right_of', words: ['to', 'the', 'right', 'of'] },
  { relation: 'in_front_of', words: ['in', 'front', 'of'] },
  { relation: 'behind', words: ['behind'] },
  { relation: 'in', words: ['inside', 'of'] },
  { relation: 'in', words: ['inside'] },
  { relation: 'on_top_of', words: ['on', 'top', 'of'] },
  { relation: 'underneath', words: ['underneath'] },
  { relation: 'underneath', words: ['under'] },
  { relation: 'underneath', words: ['below'] },
  { relation: 'larger_than', words: ['larger', 'than'] },
  { relation: 'larger_than', words: ['bigger', 'than'] },
  { relation: 'smaller_than', words: ['smaller', 'than'] },
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

const parseQueryWord = (tokens) => {
  for (const pattern of QUERY_PATTERNS) {
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
  const raw = tokens.join(' ').trim();

  if (raw === 'the ground' || raw === 'ground') {
    return {
      kind: 'ground',
      pronoun: null,
      color: null,
      size: null,
      shape: null,
      excludedColors: [],
      excludedSizes: [],
      excludedShapes: [],
      specifiers: [],
      raw,
    };
  }

  const reference = {
    kind: 'object',
    pronoun: null,
    color: null,
    size: null,
    shape: null,
    excludedColors: [],
    excludedSizes: [],
    excludedShapes: [],
    specifiers: [],
    raw,
  };

  if (!tokens.length) {
    return reference;
  }

  if (tokens[0] === 'it' || tokens[0] === 'them') {
    return {
      ...reference,
      kind: 'pronoun',
      pronoun: tokens[0],
      excludedColors: [],
      excludedSizes: [],
      excludedShapes: [],
      specifiers: [],
      raw: tokens[0],
    };
  }

  let specifierStart = -1;
  let isNegatedSpecifier = false;

  for (let index = 0; index < tokens.length; index += 1) {
    if (REFERENCE_FILLER_WORDS.has(tokens[index])) {
      continue;
    }

    const negatedOffset = tokens[index] === 'not' ? 1 : 0;
    const matchedSpecifier = REFERENCE_SPECIFIER_PATTERNS.find((pattern) =>
      matchesPattern(tokens, index + negatedOffset, pattern.words)
    );
    if (matchedSpecifier) {
      specifierStart = index;
      isNegatedSpecifier = negatedOffset === 1;
      break;
    }
  }

  const baseTokens = specifierStart >= 0 ? tokens.slice(0, specifierStart) : tokens;

  let pendingNegation = false;

  baseTokens.forEach((token) => {
    if (DETERMINERS.has(token)) {
      return;
    }

    if (REFERENCE_FILLER_WORDS.has(token)) {
      return;
    }

    if (token === 'not') {
      pendingNegation = true;
      return;
    }

    if (COLOR_WORDS.has(token)) {
      if (pendingNegation) {
        reference.excludedColors.push(token);
      } else {
        reference.color = token;
      }
      pendingNegation = false;
      return;
    }

    if (SIZE_WORDS.has(token)) {
      if (pendingNegation) {
        reference.excludedSizes.push(token);
      } else {
        reference.size = token;
      }
      pendingNegation = false;
      return;
    }

    if (SHAPE_WORDS.has(token) && token !== 'object' && token !== 'thing') {
      if (pendingNegation) {
        reference.excludedShapes.push(token);
      } else {
        reference.shape = token;
      }
      pendingNegation = false;
    }
  });

  if (specifierStart >= 0) {
    const pattern = REFERENCE_SPECIFIER_PATTERNS.find((candidate) =>
      matchesPattern(tokens, specifierStart + (isNegatedSpecifier ? 1 : 0), candidate.words)
    );

    if (pattern) {
      const targetTokens = tokens.slice(specifierStart + (isNegatedSpecifier ? 1 : 0) + pattern.words.length);
      reference.specifiers.push({
        relation: pattern.relation,
        negated: isNegatedSpecifier,
        target: parseReference(targetTokens),
      });
    }
  }

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

const actionUsesDestination = (action) => action === 'put' || action === 'place' || action === 'move';

const parseClause = (tokens) => {
  const command = parseCommandWord(tokens);
  const query = command.action === 'unknown' ? parseQueryWord(tokens) : { action: 'unknown', consumed: 0 };
  const parsedVerb = command.action !== 'unknown' ? command : query;
  const remaining = tokens.slice(parsedVerb.consumed);
  const locationStart = actionUsesDestination(parsedVerb.action) ? findLocationStart(remaining, 0) : null;

  if (!locationStart) {
    if (parsedVerb.action === 'new_scene') {
      const requestedCount = Number.parseInt(remaining[0], 10);

      return {
        raw: tokens.join(' '),
        action: parsedVerb.action,
        directObject: parseReference([]),
        location: null,
        sceneCount: Number.isNaN(requestedCount) ? null : requestedCount,
      };
    }

    if (
      parsedVerb.action === 'save_session' ||
      parsedVerb.action === 'load_session' ||
      parsedVerb.action === 'delete_session' ||
      parsedVerb.action === 'list_sessions'
    ) {
      return {
        raw: tokens.join(' '),
        action: parsedVerb.action,
        directObject: parseReference([]),
        location: null,
        sessionName: remaining.join(' ').trim() || null,
      };
    }

    return {
      raw: tokens.join(' '),
      action: parsedVerb.action,
      directObject: parseReference(remaining),
      location: null,
    };
  }

  return {
    raw: tokens.join(' '),
    action: parsedVerb.action,
    directObject: parseReference(remaining.slice(0, locationStart.index)),
    location: {
      relation: locationStart.relation,
      target: parseReference(remaining.slice(locationStart.index + locationStart.consumed)),
    },
  };
};

const describeObject = (object) => `${object.size} ${object.color} ${object.type}`;
const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
const getReferenceResolutionPool = (resolution) => resolution?.candidates ?? resolution?.matches ?? [];
const getPlanarDistance = (left, right) => {
  const deltaX = left.basePosition[0] - right.basePosition[0];
  const deltaZ = left.basePosition[2] - right.basePosition[2];
  return Math.hypot(deltaX, deltaZ);
};
const positionsMatch = (a, b, tolerance = DISTANCE_TIE_EPSILON) => Math.abs(a - b) < tolerance;
const isDirectlyOnTopOf = (upperObject, lowerObject) => {
  const [upperX, upperY, upperZ] = upperObject.basePosition;
  const [lowerX, lowerY, lowerZ] = lowerObject.basePosition;
  const expectedUpperY = lowerY + SIZE_HEIGHT[lowerObject.size] + SIZE_HEIGHT[upperObject.size];

  return (
    positionsMatch(upperX, lowerX, AXIS_TOLERANCE) &&
    positionsMatch(upperZ, lowerZ, AXIS_TOLERANCE) &&
    positionsMatch(upperY, expectedUpperY, AXIS_TOLERANCE)
  );
};

const applySpecifier = (matches, specifier, objects, memory) => {
  const targetResolution = resolveReference(specifier.target, objects, memory);
  const targetMatches = getReferenceResolutionPool(targetResolution);

  if (targetResolution.status !== 'resolved' || !targetMatches.length) {
    return {
      matches: [],
      summary: `${specifier.relation} target unresolved`,
    };
  }

  let filteredMatches;

  switch (specifier.relation) {
    case 'nearest_to':
    case 'closest_to': {
      const targetIds = new Set(targetMatches.map((target) => target.id));
      const eligibleMatches = matches.filter((object) => !targetIds.has(object.id));
      let bestDistance = Number.POSITIVE_INFINITY;

      eligibleMatches.forEach((object) => {
        const distance = Math.min(...targetMatches.map((target) => getPlanarDistance(object, target)));
        if (distance < bestDistance) {
          bestDistance = distance;
        }
      });

      filteredMatches = eligibleMatches.filter((object) => {
        const distance = Math.min(...targetMatches.map((target) => getPlanarDistance(object, target)));
        return Math.abs(distance - bestDistance) < DISTANCE_TIE_EPSILON;
      });
      break;
    }
    case 'furthest_from': {
      const targetIds = new Set(targetMatches.map((target) => target.id));
      const eligibleMatches = matches.filter((object) => !targetIds.has(object.id));
      let bestDistance = Number.NEGATIVE_INFINITY;

      eligibleMatches.forEach((object) => {
        const distance = Math.min(...targetMatches.map((target) => getPlanarDistance(object, target)));
        if (distance > bestDistance) {
          bestDistance = distance;
        }
      });

      filteredMatches = eligibleMatches.filter((object) => {
        const distance = Math.min(...targetMatches.map((target) => getPlanarDistance(object, target)));
        return Math.abs(distance - bestDistance) < DISTANCE_TIE_EPSILON;
      });
      break;
    }
    case 'larger_than':
      filteredMatches = matches.filter((object) => targetMatches.some((target) => SIZE_RANK[object.size] > SIZE_RANK[target.size]));
      break;
    case 'smaller_than':
      filteredMatches = matches.filter((object) => targetMatches.some((target) => SIZE_RANK[object.size] < SIZE_RANK[target.size]));
      break;
    case 'on_top_of':
      filteredMatches = matches.filter((object) => targetMatches.some((target) => isDirectlyOnTopOf(object, target)));
      break;
    case 'underneath':
      filteredMatches = matches.filter((object) => targetMatches.some((target) => isDirectlyOnTopOf(target, object)));
      break;
    case 'next_to':
      filteredMatches = matches.filter((object) =>
        targetMatches.some((target) => getPlanarDistance(object, target) <= 1.4 + PLANAR_TOLERANCE)
      );
      break;
    case 'left_of':
      filteredMatches = matches.filter((object) =>
        targetMatches.some((target) => object.basePosition[0] < target.basePosition[0] - AXIS_TOLERANCE)
      );
      break;
    case 'right_of':
      filteredMatches = matches.filter((object) =>
        targetMatches.some((target) => object.basePosition[0] > target.basePosition[0] + AXIS_TOLERANCE)
      );
      break;
    case 'in_front_of':
      filteredMatches = matches.filter((object) =>
        targetMatches.some((target) => object.basePosition[2] < target.basePosition[2] - AXIS_TOLERANCE)
      );
      break;
    case 'behind':
      filteredMatches = matches.filter((object) =>
        targetMatches.some((target) => object.basePosition[2] > target.basePosition[2] + AXIS_TOLERANCE)
      );
      break;
    case 'in':
      filteredMatches = matches.filter((object) => targetMatches.some((target) => object.containerId === target.id));
      break;
    default:
      filteredMatches = matches;
      break;
  }

  if (specifier.negated) {
    const filteredIds = new Set(filteredMatches.map((object) => object.id));
    filteredMatches = matches.filter((object) => !filteredIds.has(object.id));
  }

  return {
    matches: filteredMatches,
    summary: `filtered by ${specifier.negated ? 'not ' : ''}${specifier.relation}`,
  };
};

function resolveReference(reference, objects, memory) {
  if (!reference || (!reference.raw && reference.kind !== 'pronoun')) {
    return {
      status: 'missing',
      matches: [],
      summary: 'no reference',
    };
  }

  if (reference.kind === 'ground') {
    return {
      status: 'resolved',
      matches: [{ id: 'ground', type: 'ground' }],
      summary: 'resolved -> ground',
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

    if (reference.excludedShapes.includes(object.type)) {
      return false;
    }

    if (reference.color && object.color !== reference.color) {
      return false;
    }

    if (reference.excludedColors.includes(object.color)) {
      return false;
    }

    if (reference.size && object.size !== reference.size) {
      return false;
    }

    if (reference.excludedSizes.includes(object.size)) {
      return false;
    }

    return true;
  });

  const filteredMatches = reference.specifiers.reduce((currentMatches, specifier) => {
    if (!currentMatches.length) {
      return currentMatches;
    }

    return applySpecifier(currentMatches, specifier, objects, memory).matches;
  }, matches);

  if (filteredMatches.length === 1) {
    return {
      status: 'resolved',
      matches: filteredMatches,
      summary: `resolved -> ${describeObject(filteredMatches[0])}`,
    };
  }

  if (filteredMatches.length > 1) {
    const chosen = pickRandom(filteredMatches);

    return {
      status: 'resolved',
      matches: [chosen],
      candidates: filteredMatches,
      summary: `ambiguous -> randomly chose ${describeObject(chosen)} from ${filteredMatches.map(describeObject).join(', ')}`,
    };
  }

  return {
    status: 'unresolved',
    matches: [],
    summary: 'no matching object',
  };
}

export const parseCommand = (input, objects, memory = {}) => {
  const tokens = tokenize(input);
  const clauses = splitClauses(tokens).map(parseClause);
  const nextMemory = { ...memory };
  let previousAction = null;

  const resolvedClauses = clauses.map((clause) => {
    const normalizedClause = clause.action === 'unknown' && previousAction
      ? { ...clause, action: previousAction }
      : clause;

    const directResolution = resolveReference(normalizedClause.directObject, objects, nextMemory);

    if (directResolution.status === 'resolved' && directResolution.matches[0]) {
      nextMemory.lastSingular = directResolution.matches[0];
    }

    const locationResolution = normalizedClause.location
      ? resolveReference(normalizedClause.location.target, objects, nextMemory)
      : null;

    if (normalizedClause.action !== 'unknown') {
      previousAction = normalizedClause.action;
    }

    return {
      ...normalizedClause,
      directResolution,
      location: normalizedClause.location
        ? {
            ...normalizedClause.location,
            resolution: locationResolution,
          }
        : null,
      sceneCount: normalizedClause.sceneCount ?? null,
      sessionName: normalizedClause.sessionName ?? null,
    };
  });

  return {
    tokens,
    clauses: resolvedClauses,
    memory: nextMemory,
  };
};
