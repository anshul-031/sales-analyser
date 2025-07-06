// Analysis constants that can be safely imported on client side
// These contain no API keys or server-side environment variables

export const DEFAULT_ANALYSIS_PARAMETERS = {
  'call_objective': {
    id: 'call_objective',
    name: 'Call Objective Assessment',
    description: 'Analyze whether the sales call achieved its intended objective',
    prompt: `Analyze this sales call and evaluate the call objective achievement:
    1. Identify the primary objective of the call (demo, discovery, closing, follow-up, etc.)
    2. Assess whether the objective was achieved (scale 1-10)
    3. Identify what contributed to success or failure
    4. Suggest improvements for better objective achievement
    5. Note any secondary objectives that were addressed
    Provide specific evidence from the conversation to support your assessment.`,
    enabled: true
  },
  'rapport_building': {
    id: 'rapport_building',
    name: 'Rapport & Relationship Building',
    description: 'Evaluate how well rapport was established and maintained',
    prompt: `Assess the rapport and relationship building in this sales call:
    1. Opening rapport establishment techniques used
    2. Personal connection moments and small talk effectiveness
    3. Active listening demonstration and acknowledgment of customer input
    4. Empathy and understanding shown toward customer needs/challenges
    5. Trust-building elements and credibility establishment
    6. Mirroring and matching communication styles
    7. Closing rapport and relationship maintenance
    Provide a rapport score from 1-10 and specific examples of effective rapport-building moments.`,
    enabled: true
  },
  'needs_discovery': {
    id: 'needs_discovery',
    name: 'Needs Discovery & Qualification',
    description: 'Analyze the quality of needs assessment and lead qualification',
    prompt: `Evaluate the needs discovery and qualification process in this call:
    1. Quality and depth of discovery questions asked
    2. Uncovering of pain points, challenges, and current state
    3. Budget and decision-making authority qualification
    4. Timeline and urgency assessment
    5. Current solution/competitor evaluation
    6. Stakeholder identification and buying process understanding
    7. Confirmation and summarization of discovered needs
    Rate the discovery process 1-10 and identify missed opportunities for deeper qualification.`,
    enabled: true
  },
  'presentation_effectiveness': {
    id: 'presentation_effectiveness',
    name: 'Presentation & Demo Effectiveness',
    description: 'Assess how well the solution was presented and demonstrated',
    prompt: `Analyze the presentation and demonstration effectiveness:
    1. Customization of presentation to discovered needs
    2. Clear articulation of value propositions and benefits
    3. Feature-to-benefit translation and relevance
    4. Handling of technical concepts and complexity
    5. Use of stories, case studies, and social proof
    6. Visual aids and demo flow effectiveness
    7. Engagement level and customer participation
    Provide a presentation effectiveness score from 1-10 and suggest specific improvements.`,
    enabled: true
  },
  'objection_handling': {
    id: 'objection_handling',
    name: 'Objection Handling',
    description: 'Evaluate how objections and concerns were addressed',
    prompt: `Assess the objection handling throughout this sales call:
    1. Identification of stated and unstated objections
    2. Listening and acknowledgment before responding
    3. Clarification and understanding of root concerns
    4. Response quality and evidence provided
    5. Confirmation that objections were resolved
    6. Prevention of future objections through proactive addressing
    7. Maintaining positive relationship despite objections
    Rate objection handling 1-10 and provide examples of both strong responses and missed opportunities.`,
    enabled: true
  },
  'closing_techniques': {
    id: 'closing_techniques',
    name: 'Closing & Next Steps',
    description: 'Analyze closing attempts and next step commitments',
    prompt: `Evaluate the closing and next steps in this sales call:
    1. Trial closes and buying signal recognition throughout the call
    2. Final closing technique used and appropriateness
    3. Clear next steps definition and mutual commitment
    4. Timeline establishment and follow-up planning
    5. Decision-making process and stakeholder involvement
    6. Urgency creation and compelling reasons to act
    7. Professional handling of hesitation or delays
    Provide a closing effectiveness score from 1-10 and suggest alternative closing approaches that could have been used.`,
    enabled: true
  },
  'communication_skills': {
    id: 'communication_skills',
    name: 'Communication Skills',
    description: 'Assess overall communication effectiveness and professional presence',
    prompt: `Analyze the communication skills demonstrated in this call:
    1. Clarity and articulation of ideas and concepts
    2. Appropriate pace and tone throughout the conversation
    3. Professional language and industry knowledge
    4. Question asking skills and conversation flow
    5. Active listening and response appropriateness
    6. Confidence and enthusiasm projection
    7. Adaptation to customer communication style
    Rate communication skills 1-10 and provide specific examples of strong communication moments and areas for improvement.`,
    enabled: true
  },
  'product_knowledge': {
    id: 'product_knowledge',
    name: 'Product Knowledge & Expertise',
    description: 'Evaluate demonstration of product knowledge and industry expertise',
    prompt: `Assess the product knowledge and expertise displayed:
    1. Depth of product/service knowledge demonstrated
    2. Understanding of technical specifications and capabilities
    3. Industry knowledge and market awareness
    4. Competitive positioning and differentiation
    5. Integration and implementation expertise
    6. Troubleshooting and problem-solving capability
    7. Confidence in product recommendations and guidance
    Provide a knowledge score from 1-10 and identify areas where additional expertise would have been valuable.`,
    enabled: true
  },
  'customer_engagement': {
    id: 'customer_engagement',
    name: 'Customer Engagement & Participation',
    description: 'Analyze level of customer engagement and interaction quality',
    prompt: `Evaluate customer engagement and participation throughout the call:
    1. Customer participation level and interaction frequency
    2. Quality of customer questions and engagement depth
    3. Customer interest indicators and buying signals
    4. Responsiveness to sales professional's questions
    5. Initiative in driving conversation and sharing information
    6. Emotional engagement and enthusiasm level
    7. Commitment level to next steps and process
    Rate customer engagement 1-10 and identify factors that contributed to or hindered engagement levels.`,
    enabled: true
  },
  'emotional_intelligence': {
    id: 'emotional_intelligence',
    name: 'Emotional Intelligence & Tone Management',
    description: 'Evaluate emotional awareness and tone management throughout the call',
    prompt: `Analyze the emotional intelligence and tone management in this sales call:
    1. Emotional awareness and empathy demonstrated
    2. Tone consistency and appropriateness
    3. Ability to read and respond to customer emotions
    4. Management of difficult or tense moments
    5. Building emotional connection with the customer
    6. Sentiment progression throughout the conversation
    7. Professional composure under pressure
    Provide a score from 1-10 and specific examples of emotional intelligence in action.`,
    enabled: true
  }
};
