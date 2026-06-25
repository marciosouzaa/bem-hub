export type PlanKey = "free" | "starter" | "pro" | "business";

export type PlanLimit = {
  users: number;
  assistants: number;
  monthlyMessages: number;
  documents: number;
  integrations: number;
};

export const planLimits: Record<PlanKey, PlanLimit> = {
  free: {
    users: 1,
    assistants: 1,
    monthlyMessages: 50,
    documents: 5,
    integrations: 0,
  },
  starter: {
    users: 3,
    assistants: 3,
    monthlyMessages: 800,
    documents: 50,
    integrations: 1,
  },
  pro: {
    users: 10,
    assistants: 15,
    monthlyMessages: 4000,
    documents: 500,
    integrations: 3,
  },
  business: {
    users: 25,
    assistants: 50,
    monthlyMessages: 15000,
    documents: 3000,
    integrations: 10,
  },
};
