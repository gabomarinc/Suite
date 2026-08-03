import { prisma } from './prisma';

export interface AppMailingLimits {
  emailsPerMonth: number;
  contacts: number;
  aiRequests: number;
}

export interface AppProcessLimits {
  activeExecutions: number;
  aiRequests: number;
}

export interface AppBillsLimits {
  aiRequests: number;
  digitalPayments: boolean;
  customSmtp: boolean;
}

export interface AppKreditLimits {
  contacts: number;
  properties: number;
}

export interface AppReactivaLeadsLimits {
  contacts: number;
  campaigns: number;
}

export interface AppLeadsHubLimits {
  access: boolean;
  contacts: number;
}

export interface PlanLimits {
  mailing: AppMailingLimits;
  process: AppProcessLimits;
  bills: AppBillsLimits;
  kredit: AppKreditLimits;
  reactivaLeads: AppReactivaLeadsLimits;
  leadsHub: AppLeadsHubLimits;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    mailing: { emailsPerMonth: 10, contacts: 50, aiRequests: 0 },
    process: { activeExecutions: 1, aiRequests: 0 },
    bills: { aiRequests: 0, digitalPayments: false, customSmtp: false },
    kredit: { contacts: 10, properties: 1 },
    reactivaLeads: { contacts: 50, campaigns: 1 },
    leadsHub: { access: false, contacts: 0 },
  },
  basic: {
    mailing: { emailsPerMonth: 25000, contacts: 2000, aiRequests: 25 },
    process: { activeExecutions: 20, aiRequests: 100 },
    bills: { aiRequests: 100, digitalPayments: false, customSmtp: false },
    kredit: { contacts: 500, properties: 10 },
    reactivaLeads: { contacts: 2000, campaigns: 2 },
    leadsHub: { access: false, contacts: 0 },
  },
  pro: {
    mailing: { emailsPerMonth: 100000, contacts: 20000, aiRequests: 100 },
    process: { activeExecutions: 999999, aiRequests: 1000 }, // 999999 is unlimited
    bills: { aiRequests: 1000, digitalPayments: true, customSmtp: true },
    kredit: { contacts: 999999, properties: 999999 },
    reactivaLeads: { contacts: 999999, campaigns: 999999 },
    leadsHub: { access: false, contacts: 0 },
  },
  basic_leads: {
    mailing: { emailsPerMonth: 25000, contacts: 2000, aiRequests: 25 },
    process: { activeExecutions: 20, aiRequests: 100 },
    bills: { aiRequests: 100, digitalPayments: false, customSmtp: false },
    kredit: { contacts: 500, properties: 10 },
    reactivaLeads: { contacts: 2000, campaigns: 2 },
    leadsHub: { access: true, contacts: 1000 },
  },
  pro_leads: {
    mailing: { emailsPerMonth: 100000, contacts: 20000, aiRequests: 100 },
    process: { activeExecutions: 999999, aiRequests: 1000 },
    bills: { aiRequests: 1000, digitalPayments: true, customSmtp: true },
    kredit: { contacts: 999999, properties: 999999 },
    reactivaLeads: { contacts: 999999, campaigns: 999999 },
    leadsHub: { access: true, contacts: 999999 },
  },
};

export function getLimitsForPlan(plan: string | null | undefined): PlanLimits {
  const planName = plan || 'free';
  return PLAN_LIMITS[planName] || PLAN_LIMITS.free;
}

/**
 * Checks if the user's monthly limits need to be reset.
 * If more than 30 days have passed since limitsResetDate, reset usages to 0 and update reset date.
 */
export async function getOrResetUserUsage(user: {
  id: string;
  aiUsageBills: number;
  aiUsageProcess: number;
  aiUsageMailing: number;
  emailUsage: number;
  limitsResetDate: Date;
}) {
  const now = new Date();
  const resetDate = new Date(user.limitsResetDate);
  
  // Calculate difference in milliseconds
  const diffTime = Math.abs(now.getTime() - resetDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Reset if more than 30 days have passed
  if (diffDays >= 30) {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        aiUsageBills: 0,
        aiUsageProcess: 0,
        aiUsageMailing: 0,
        emailUsage: 0,
        limitsResetDate: now,
      },
      select: {
        aiUsageBills: true,
        aiUsageProcess: true,
        aiUsageMailing: true,
        emailUsage: true,
        limitsResetDate: true,
      }
    });
    return {
      aiUsageBills: updatedUser.aiUsageBills,
      aiUsageProcess: updatedUser.aiUsageProcess,
      aiUsageMailing: updatedUser.aiUsageMailing,
      emailUsage: updatedUser.emailUsage,
      limitsResetDate: updatedUser.limitsResetDate,
    };
  }
  
  return {
    aiUsageBills: user.aiUsageBills,
    aiUsageProcess: user.aiUsageProcess,
    aiUsageMailing: user.aiUsageMailing,
    emailUsage: user.emailUsage,
    limitsResetDate: user.limitsResetDate,
  };
}
