/**
 * MI-Dojo - Motivational Interviewing Training Platform
 * 
 * A comprehensive platform for practicing motivational interviewing skills
 * with AI-generated personas, real-time feedback, and org-aware rubric scoring.
 */

// Removed devLocalRetrieverRef import
import { gemini20Flash, googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';
// Removed retriever imports

// Removed retriever definitions

const ai = genkit({
  plugins: [googleAI()],
  model: gemini20Flash,
});

// Export the configured ai instance
export { ai };

async function readPromptFile(filePath: string): Promise<string> {
  const fs = require('fs').promises;
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    throw new Error(`Error reading prompt file ${filePath}: ${err}`);
  }
}

// ===== PRESET PERSONAS =====
const presetPersonas = {
  mat: {
    persona_id: 'mat_workplace',
    base_characteristics: {
      condition: 'Workplace dynamics',
      stage_of_change: 'contemplation',
      key_resistances: ['Prefers autonomy', 'Skeptical of coaching', 'Concerned about judgment'],
      communication_style: 'Direct but thoughtful, sometimes defensive',
    },
    scenario_context: {
      life_circumstances: 'Team leader with tight deadlines',
      support_system: 'Has a mentor but avoids vulnerability',
      stress_factors: ['Performance pressure', 'Managing conflict', 'Fear of stagnation'],
    },
    change_dynamics: {
      readiness_level: 'High',
      ambivalence_areas: ['Work/life balance', 'Judging self-worth'],
      change_talk_patterns: {
        commitment: 7,
        desire: 6,
        ability: 5,
        need: 6,
        reasons: 7,
        taking_steps: 6,
      },
    },
    org_values_alignment: {
      foundations: ['Growth', 'Trust', 'Responsibility'],
      technical_domains: ['Empower decisions', 'Explore ambivalence', 'Summarize change talk']
    },
  },
  saira: {
    persona_id: 'saira_health',
    base_characteristics: {
      condition: 'Chronic illness',
      stage_of_change: 'preparation',
      key_resistances: ['Fear of pain', 'Conflicting medical advice'],
      communication_style: 'Emotionally expressive, uses metaphors, concerned about trust',
    },
    scenario_context: {
      life_circumstances: 'Managing a long-term autoimmune condition',
      support_system: 'Family is involved but inconsistent',
      stress_factors: ['Physical pain', 'Loss of independence'],
    },
    change_dynamics: {
      readiness_level: 'High desire, mixed ability',
      ambivalence_areas: ['Medication vs lifestyle', 'External support'],
      change_talk_patterns: {
        commitment: 5,
        desire: 7,
        ability: 4,
        need: 8,
        reasons: 6,
        taking_steps: 4,
      },
    },
    org_values_alignment: {
      foundations: ['Kindness', 'Honesty', 'Dignity'],
      technical_domains: ['Affirm strengths', 'Reflect emotion', 'Empathic presence']
    },
  },
  ogi: {
    persona_id: 'ogi_lifestyle',
    base_characteristics: {
      condition: 'Lifestyle habits',
      stage_of_change: 'action',
      key_resistances: ['Social pressure', 'Temptation at work events'],
      communication_style: 'Friendly, sometimes tangential, keen on self-improvement',
    },
    scenario_context: {
      life_circumstances: 'Recently started new job and gym routine',
      support_system: 'Peers supportive, family skeptical',
      stress_factors: ['New routine fatigue', 'Perfectionism'],
    },
    change_dynamics: {
      readiness_level: 'High',
      ambivalence_areas: ['Work/life balance', 'Judging self-worth'],
      change_talk_patterns: {
        commitment: 7,
        desire: 6,
        ability: 5,
        need: 6,
        reasons: 7,
        taking_steps: 6,
      },
    },
    org_values_alignment: {
      foundations: ['Respect', 'Courage', 'Collaboration'],
      technical_domains: ['Active listening', 'Support autonomy', 'Evoke change talk']
    },
  },
};

// ===== SCHEMAS =====

const PersonaInputSchema = z.object({
  scenario_type: z.enum(['chronic_illness', 'addiction', 'lifestyle_change', 'mental_health', 'preventive_care']),
  change_readiness: z.enum(['pre_contemplation', 'contemplation', 'preparation', 'action', 'maintenance']),
  additional_context: z.string().optional(),
});

const PersonaOutputSchema = z.object({
  persona_id: z.string(),
  base_characteristics: z.object({
    condition: z.string(),
    stage_of_change: z.string(),
    key_resistances: z.array(z.string()),
    communication_style: z.string(),
  }),
  scenario_context: z.object({
    life_circumstances: z.string(),
    support_system: z.string(),
    stress_factors: z.array(z.string()),
  }),
  change_dynamics: z.object({
    readiness_level: z.string(),
    ambivalence_areas: z.array(z.string()),
    change_talk_patterns: z.object({
      commitment: z.coerce.number(),
      desire: z.coerce.number(),
      ability: z.coerce.number(),
      need: z.coerce.number(),
      reasons: z.coerce.number(),
      taking_steps: z.coerce.number(),
    }),
  }),
  org_values_alignment: z.object({
    foundations: z.array(z.string()),
    technical_domains: z.array(z.string()),
  }),
});

const MessageSchema = z.object({
  role: z.enum(['user', 'persona']),
  content: z.string(),
});

const ChatInputSchema = z.object({
  persona: PersonaOutputSchema,
  message: z.string(),
  conversation_history: z.array(MessageSchema).optional(),
});

const CoachingInputSchema = z.object({
  user_message: z.string(),
  conversation_history: z.array(MessageSchema),
  persona: PersonaOutputSchema,
});

const CoachingOutputSchema = z.object({
  has_coaching: z.boolean(),
  coaching_message: z.string().optional(),
  mi_technique_used: z.string().optional(),
  missed_opportunity: z.string().optional(),
});

const SessionFeedbackInputSchema = z.object({
  conversation: z.array(MessageSchema),
  persona: PersonaOutputSchema,
});

const MITIScoreSchema = z.object({
  global_scores: z.object({
    cultivating_change_talk: z.number().min(1).max(5),
    softening_sustain_talk: z.number().min(1).max(5),
    partnership: z.number().min(1).max(5),
    empathy: z.number().min(1).max(5),
  }),
  behavior_counts: z.object({
    giving_information: z.number().min(0),
    persuade: z.number().min(0),
    persuade_with_permission: z.number().min(0),
    questions: z.number().min(0),
    simple_reflections: z.number().min(0),
    complex_reflections: z.number().min(0),
    affirm: z.number().min(0),
    seeking_collaboration: z.number().min(0),
    emphasizing_autonomy: z.number().min(0),
    confront: z.number().min(0)
  }),
  derived_metrics: z.object({
    technical_global: z.number().min(1).max(5),
    relational_global: z.number().min(1).max(5),
    percent_complex_reflections: z.number().min(0).max(100),
    reflection_to_question_ratio: z.number().min(0),
    total_mi_adherent: z.number().min(0),
    total_mi_non_adherent: z.number().min(0)
  }),
  competency_assessment: z.object({
    relational: z.enum(["Below Fair", "Fair", "Good"]),
    technical: z.enum(["Below Fair", "Fair", "Good"]),
    percent_complex_reflections: z.enum(["Below Fair", "Fair", "Good"]),
    reflection_to_question_ratio: z.enum(["Below Fair", "Fair", "Good"])
  }),
  strengths: z.array(z.string()),
  areas_for_improvement: z.array(z.string()),
  examples: z.object({
    good_examples: z.array(z.string()),
    missed_opportunities: z.array(z.string())
  })
});

const ValuesScoringInputSchema = z.object({
  conversation: z.array(MessageSchema),
  persona: PersonaOutputSchema,
  org: z.string(),
});

const ValuesScoringOutputSchema = z.object({
  // Modified scores and ratings to have explicit properties based on fallback context
  scores: z.object({
    Respect: z.number().min(1).max(5).optional(),
    Integrity: z.number().min(1).max(5).optional(),
    Empathy: z.number().min(1).max(5).optional(),
    Support: z.number().min(1).max(5).optional(),
  }),
  ratings: z.object({
    Respect: z.enum(["Below Fair", "Fair", "Good"]).optional(),
    Integrity: z.enum(["Below Fair", "Fair", "Good"]).optional(),
    Empathy: z.enum(["Below Fair", "Fair", "Good"]).optional(),
    Support: z.enum(["Below Fair", "Fair", "Good"]).optional(),
  }),
  strengths: z.array(z.string()),
  areas_for_improvement: z.array(z.string()),
  recommendations: z.array(z.string()),
});

// ===== FLOWS =====

export const miCoachingFlow = ai.defineFlow({
  name: "miCoachingFlow",
  inputSchema: CoachingInputSchema,
  outputSchema: CoachingOutputSchema,
}, async (input) => {
  const coachingPrompt = await readPromptFile('./prompts/mi-coaching.prompt');

  const filledPrompt = coachingPrompt 
    .replace('{{personaBlock}}', JSON.stringify(input.persona, null, 2))
    .replace('{{historyBlock}}', input.conversation_history.map(msg =>
      `${msg.role.toUpperCase()}: ${msg.content}`).join('\n'))
    .replace('{{user_message}}', input.user_message);

  const result = await ai.generate({
    prompt: filledPrompt,
    output: {
      schema: CoachingOutputSchema,
      format: 'json'
    },
  });

  return result.output || {
    has_coaching: false,
    coaching_message: "",
    mi_technique_used: "",
    missed_opportunity: ""
  };
});

export const getPresetPersonaFlow = ai.defineFlow({
  name: 'getPresetPersonaFlow',
  inputSchema: z.object({ name: z.enum(['mat', 'saira', 'ogi']) }),
  outputSchema: PersonaOutputSchema,
}, async (input) => {
  const persona = presetPersonas[input.name];
  if (!persona) throw new Error(`Invalid preset: ${input.name}`);
  return persona;
});

// ===== FLOWS =====

// 1. Persona Generation Flow
// 1. Persona Generation Flow
export const generatePersonaFlow = ai.defineFlow({
  name: "generatePersonaFlow",
  inputSchema: PersonaInputSchema,
  outputSchema: PersonaOutputSchema,
}, async (input) => {
  const result = await ai.generate({
    prompt: `Create an authentic patient persona for Motivational Interviewing practice
with scenario: ${input.scenario_type} and readiness stage: ${input.change_readiness}.
${input.additional_context || ''}

Be creative but realistic. Include distinct communication style.
Return structured JSON matching the schema. Be sure to include an 'org_values_alignment' object listing 2-3 relevant foundation values (e.g. Respect, Kindness) and technical domains (e.g. Evoke change talk, Support autonomy).`,
    output: {
      schema: PersonaOutputSchema,
      format: 'json'
    },
  });
  
  // Create a complete default object that matches PersonaOutputSchema
  const defaultPersona = {
    persona_id: `${input.scenario_type}_${input.change_readiness}_default`,
    base_characteristics: {
      condition: input.scenario_type,
      stage_of_change: input.change_readiness,
      key_resistances: ['Default resistance'],
      communication_style: 'Neutral',
    },
    scenario_context: {
      life_circumstances: 'Default life circumstances',
      support_system: 'Default support system',
      stress_factors: ['Default stress factor'],
    },
    change_dynamics: {
      readiness_level: 'Moderate',
      ambivalence_areas: ['Default ambivalence area'],
      change_talk_patterns: {
        commitment: 5,
        desire: 5,
        ability: 5,
        need: 5,
        reasons: 5,
        taking_steps: 5,
      },
    },
    org_values_alignment: {
      foundations: ['Respect', 'Integrity'],
      technical_domains: ['Active listening', 'Open questioning'],
    },
  };
  
  // Merge the result with the default, ensuring all required fields exist
  return {
    ...defaultPersona,
    ...result.output,
    // Ensure nested objects are properly merged
    base_characteristics: {
      ...defaultPersona.base_characteristics,
      ...result.output?.base_characteristics
    },
    scenario_context: {
      ...defaultPersona.scenario_context,
      ...result.output?.scenario_context
    },
    change_dynamics: {
      ...defaultPersona.change_dynamics,
      change_talk_patterns: {
        ...defaultPersona.change_dynamics.change_talk_patterns,
        ...result.output?.change_dynamics?.change_talk_patterns
      },
      ...result.output?.change_dynamics
    },
    org_values_alignment: {
      ...defaultPersona.org_values_alignment,
      ...result.output?.org_values_alignment
    }
  };
});

export const unifiedPersonaChatFlow = ai.defineFlow({
  name: 'unifiedPersonaChatFlow',
  inputSchema: ChatInputSchema,
  streamSchema: z.object({ text: z.string() }),
  outputSchema: z.string(),
}, async (input, { sendChunk }) => {
  const prompt = `You are roleplaying as a patient with these traits:
${JSON.stringify(input.persona, null, 2)}

Conversation so far:
${input.conversation_history?.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n') || ''}

User's latest message: ${input.message}`;

  const { response, stream } = await ai.generateStream({ prompt });
  for await (const chunk of stream) {
    sendChunk({ text: chunk.text });
  }
  return (await response).text;
});

export const sessionFeedbackFlow = ai.defineFlow({
  name: 'sessionFeedbackFlow',
  inputSchema: SessionFeedbackInputSchema,
  outputSchema: MITIScoreSchema,
}, async (input): Promise<z.infer<typeof MITIScoreSchema>> => { // Add explicit return type
  // Removed retriever query and try...catch. Using fallback directly.
  const mitiContext = 'The remote MITI rubric database is not active. Reverting to local interpretation of MI spirit and technique based on MITI 4.2.1 principles.';
 
  const prompt = `Evaluate this session using MITI scoring system.

REFERENCE RUBRIC:
${mitiContext}

PERSONA:
${JSON.stringify(input.persona, null, 2)}

CONVERSATION:
${input.conversation.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}`;

  // Define fallback object with explicit type
  const fallbackMITIScore: z.infer<typeof MITIScoreSchema> = {
    global_scores: { cultivating_change_talk: 3, softening_sustain_talk: 3, partnership: 3, empathy: 3 },
    behavior_counts: { giving_information: 0, persuade: 0, persuade_with_permission: 0, questions: 0, simple_reflections: 0, complex_reflections: 0, affirm: 0, seeking_collaboration: 0, emphasizing_autonomy: 0, confront: 0 },
    derived_metrics: { technical_global: 3, relational_global: 3, percent_complex_reflections: 0, reflection_to_question_ratio: 0, total_mi_adherent: 0, total_mi_non_adherent: 0 },
    competency_assessment: {
      relational: "Below Fair",
      technical: "Fair",
      percent_complex_reflections: "Below Fair",
      reflection_to_question_ratio: "Below Fair"
    },
    strengths: ["Not enough conversation to evaluate"],
    areas_for_improvement: ["Not enough conversation to evaluate"],
    examples: { good_examples: [], missed_opportunities: [] }
  };

  try {
    const result = await ai.generate({
      prompt,
      output: { schema: MITIScoreSchema, format: 'json' },
    });

    if (result.output) {
      // Assuming ai.generate guarantees schema conformance when schema is provided
      return result.output;
    } else {
       // Handle case where output is unexpectedly null/undefined
       console.warn("Feedback generation returned no output but no error.");
       return fallbackMITIScore;
    }
  } catch (error) {
    console.error("Error in feedback generation:", error);
    // Return the fallback object in case of error
    return fallbackMITIScore;
  }
  // This part should now be unreachable
});

export const valuesScoringFlow = ai.defineFlow({
  name: "valuesScoringFlow",
  inputSchema: ValuesScoringInputSchema,
  outputSchema: ValuesScoringOutputSchema,
}, async (input) => {
  // Removed retriever query and try...catch. Using fallback directly.
  const rubricContext = 'The remote database is not active, reverting to local. Please evaluate using general values of Respect, Integrity, Empathy, and Support.';

  const result = await ai.generate({
    prompt: `Evaluate this session using the following org rubric:

${rubricContext}

CONVERSATION:
${input.conversation.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

PERSONA:
${JSON.stringify(input.persona, null, 2)}

Return structured JSON.`,
    output: { schema: ValuesScoringOutputSchema, format: 'json' },
  });
  
  return result.output ?? {
    scores: {},
    ratings: {},
    strengths: [],
    areas_for_improvement: [],
    recommendations: []
  };
});


export default {
  miCoachingFlow,
  getPresetPersonaFlow,
  generatePersonaFlow,
  unifiedPersonaChatFlow,
  sessionFeedbackFlow,
  valuesScoringFlow
};
