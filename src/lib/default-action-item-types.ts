/**
 * Default action item types for the system
 * These are created for new users to give them a starting point
 */

export const DEFAULT_ACTION_ITEM_TYPES = [
  {
    name: 'Follow-up Call',
    description: 'Schedule and make follow-up calls with prospects or customers',
    prompt: 'Extract action items related to scheduling or making follow-up calls, phone conversations, check-ins, or any mentions of calling back. Look for phrases like "I will call you", "let\'s schedule a call", "follow up next week", or specific times mentioned for calls.',
    enabled: true,
    color: '#3B82F6', // Blue
    icon: 'Phone'
  },
  {
    name: 'Send Documentation',
    description: 'Send proposals, contracts, brochures, or other documents',
    prompt: 'Identify action items involving sending documents, materials, contracts, proposals, brochures, case studies, or any written materials. Look for commitments to "send over", "email you", "provide documentation", or "share materials".',
    enabled: true,
    color: '#10B981', // Green
    icon: 'FileText'
  },
  {
    name: 'Product Demo',
    description: 'Schedule or conduct product demonstrations',
    prompt: 'Extract action items related to product demonstrations, software trials, live demos, walkthroughs, or presentations. Look for mentions of "show you", "demo", "walkthrough", "trial", "presentation", or "see it in action".',
    enabled: true,
    color: '#8B5CF6', // Purple
    icon: 'Monitor'
  },
  {
    name: 'Pricing Discussion',
    description: 'Provide pricing information or prepare quotes',
    prompt: 'Identify action items involving pricing discussions, quote preparation, cost analysis, budget review, or financial information sharing. Look for mentions of "get you pricing", "prepare a quote", "discuss costs", "budget information", or "pricing details".',
    enabled: true,
    color: '#F59E0B', // Amber
    icon: 'DollarSign'
  },
  {
    name: 'Internal Meeting',
    description: 'Schedule internal team meetings or consultations',
    prompt: 'Extract action items about internal meetings, team consultations, stakeholder discussions, or decision-making meetings. Look for phrases like "discuss with team", "internal meeting", "check with management", "consult colleagues", or "team review".',
    enabled: true,
    color: '#EF4444', // Red
    icon: 'Users'
  },
  {
    name: 'Research & Analysis',
    description: 'Conduct research or analysis for the customer',
    prompt: 'Identify action items involving research, analysis, investigation, or information gathering. Look for commitments to "look into", "research", "analyze", "investigate", "find out", "check on", or "gather information".',
    enabled: true,
    color: '#06B6D4', // Cyan
    icon: 'Search'
  }
] as const;
