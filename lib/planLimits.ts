export const PLAN_LIMITS = {
  FREE:   { questionsPerMonth: 100, mocksPerMonth: 2 },
  PRO:    { questionsPerMonth: Infinity, mocksPerMonth: Infinity },
  CAMPUS: { questionsPerMonth: Infinity, mocksPerMonth: Infinity },
} as const;

// Use during development. Swap to PLAN_LIMITS before launch.
export const DEV_LIMITS = {
  FREE: { questionsPerMonth: 500, mocksPerMonth: 10 },
} as const;
