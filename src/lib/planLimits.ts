import { prisma } from './prisma';

export interface PlanLimits {
  kanbanBoards: number;
  automationRules: number;
  aiRequests: number;
  emails: number;
  leadsHubAccess: boolean;
  leadsHubContacts: number;
  supportLevel: 'standard' | 'priority';
  reportsAdvanced: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    kanbanBoards: 1,
    automationRules: 1,
    aiRequests: 5,
    emails: 10,
    leadsHubAccess: false,
    leadsHubContacts: 0,
    supportLevel: 'standard',
    reportsAdvanced: false,
  },
  basic: {
    kanbanBoards: 3,
    automationRules: 5,
    aiRequests: 100,
    emails: 500,
    leadsHubAccess: false,
    leadsHubContacts: 0,
    supportLevel: 'standard',
    reportsAdvanced: false,
  },
  pro: {
    kanbanBoards: 99999, // ilimitado
    automationRules: 99999, // ilimitado
    aiRequests: 1000, // fair use
    emails: 5000, // fair use
    leadsHubAccess: false,
    leadsHubContacts: 0,
    supportLevel: 'priority',
    reportsAdvanced: true,
  },
  basic_leads: {
    kanbanBoards: 3,
    automationRules: 5,
    aiRequests: 100,
    emails: 500,
    leadsHubAccess: true,
    leadsHubContacts: 1000,
    supportLevel: 'standard',
    reportsAdvanced: false,
  },
  pro_leads: {
    kanbanBoards: 99999, // ilimitado
    automationRules: 99999, // ilimitado
    aiRequests: 1000, // fair use
    emails: 5000, // fair use
    leadsHubAccess: true,
    leadsHubContacts: 99999, // ilimitado
    supportLevel: 'priority',
    reportsAdvanced: true,
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
  aiUsage: number;
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
        aiUsage: 0,
        emailUsage: 0,
        limitsResetDate: now,
      },
      select: {
        aiUsage: true,
        emailUsage: true,
        limitsResetDate: true,
      }
    });
    return {
      aiUsage: updatedUser.aiUsage,
      emailUsage: updatedUser.emailUsage,
      limitsResetDate: updatedUser.limitsResetDate,
    };
  }
  
  return {
    aiUsage: user.aiUsage,
    emailUsage: user.emailUsage,
    limitsResetDate: user.limitsResetDate,
  };
}
