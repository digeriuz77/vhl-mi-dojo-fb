/**
 * MI-Dojo - Motivational Interviewing Training Platform
 * 
 * A comprehensive platform for practicing motivational interviewing skills
 * with AI-generated personas and real-time feedback.
 */

import { gemini20Flash, googleAI } from '@genkit-ai/googleai';
import { genkit, z } from 'genkit';

// Initialize Genkit with Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
  model: gemini20Flash,
});

// ===== SCHEMAS =====

// Schema for persona generation input
const PersonaInputSchema = z.object({
  scenario_type: z.enum([
    'chronic_illness', 
    'addiction', 
    'lifestyle_change', 
    'mental_health', 
    'preventive_care'
  ]),
  change_readiness: z.enum([
    'pre_contemplation', 
    'contemplation', 
    'preparation', 
    'action', 
    'maintenance'
  ]),
  additional_context: z.string().optional(),
});

// Schema for the generated persona
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
});

// Schema for chat messages
const MessageSchema = z.object({
  role: z.enum(['user', 'persona']),
  content: z.string(),
});

// Schema for chat input
const ChatInputSchema = z.object({
  persona: PersonaOutputSchema,
  message: z.string(),
  conversation_history: z.array(MessageSchema).optional(),
});

// Schema for coaching input
const CoachingInputSchema = z.object({
  user_message: z.string(),
  conversation_history: z.array(MessageSchema),
  persona: PersonaOutputSchema,
});

// Schema for coaching output
const CoachingOutputSchema = z.object({
  has_coaching: z.boolean(),
  coaching_message: z.string().optional(),
  mi_technique_used: z.string().optional(),
  missed_opportunity: z.string().optional(),
});

// Schema for session feedback input
const SessionFeedbackInputSchema = z.object({
  conversation: z.array(MessageSchema),
  persona: PersonaOutputSchema,
});

// Schema for MITI scores (using MITI 4.2.1 coding system)
const MITIScoreSchema = z.object({
  global_scores: z.object({
    // Technical Components
    cultivating_change_talk: z.number().min(1).max(5),
    softening_sustain_talk: z.number().min(1).max(5),
    // Relational Components
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

// ===== FLOWS =====

// 1. Persona Generation Flow
export const generatePersonaFlow = ai.defineFlow(
  {
    name: "generatePersonaFlow",
    inputSchema: PersonaInputSchema,
    outputSchema: PersonaOutputSchema,
  },
  async (input) => {
    const result = await ai.generate({
      prompt: `Create an authentic patient persona for Motivational Interviewing practice
with scenario: ${input.scenario_type} and readiness stage: ${input.change_readiness}.
${input.additional_context || ''}

Be creative but realistic. Keep descriptions concise.
For change_talk_patterns, use numbers 1-10 to indicate frequency.
Key resistances should include 2-4 realistic objections.
Give a unique persona_id combining scenario type and a random element.`,
      output: { 
        schema: PersonaOutputSchema,
        format: 'json'
      },
    });
    
    return result.output || {
      persona_id: "",
      base_characteristics: { 
        condition: "", 
        stage_of_change: "", 
        key_resistances: [], 
        communication_style: "" 
      },
      scenario_context: { 
        life_circumstances: "", 
        support_system: "", 
        stress_factors: [] 
      },
      change_dynamics: {
        readiness_level: "",
        ambivalence_areas: [],
        change_talk_patterns: {
          commitment: 0,
          desire: 0,
          ability: 0,
          need: 0,
          reasons: 0,
          taking_steps: 0
        }
      }
    };
  }
);

// 2. Chat Interface with Personas
export const streamingPersonaChatFlow = ai.defineFlow(
  {
    name: "streamingPersonaChatFlow",
    inputSchema: ChatInputSchema,
    streamSchema: z.object({
      text: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input, { sendChunk }) => {
    const prompt = `You are roleplaying as a person with the following characteristics:

Condition: ${input.persona.base_characteristics.condition}
Stage of Change: ${input.persona.base_characteristics.stage_of_change}
Key Resistances: ${input.persona.base_characteristics.key_resistances.join(", ")}
Communication Style: ${input.persona.base_characteristics.communication_style}

Life Circumstances: ${input.persona.scenario_context.life_circumstances}
Support System: ${input.persona.scenario_context.support_system}
Stress Factors: ${input.persona.scenario_context.stress_factors.join(", ")}

Readiness Level: ${input.persona.change_dynamics.readiness_level}
Ambivalence Areas: ${input.persona.change_dynamics.ambivalence_areas.join(", ")}

Given your change talk patterns:
- Commitment level: ${input.persona.change_dynamics.change_talk_patterns.commitment}/10
- Desire level: ${input.persona.change_dynamics.change_talk_patterns.desire}/10
- Ability level: ${input.persona.change_dynamics.change_talk_patterns.ability}/10
- Need level: ${input.persona.change_dynamics.change_talk_patterns.need}/10
- Reasons level: ${input.persona.change_dynamics.change_talk_patterns.reasons}/10
- Taking steps level: ${input.persona.change_dynamics.change_talk_patterns.taking_steps}/10

${input.conversation_history ? `Previous conversation:\n${input.conversation_history.map(msg => 
  `${msg.role === 'user' ? 'User' : 'You'}: ${msg.content}`).join('\n')}` : ''}

User's message: ${input.message}

Respond in first person as this persona would naturally speak. 
Be authentic to your communication style, readiness level, and ambivalence areas. 
Show appropriate levels of resistance or openness based on your stage of change.
Do not break character or reference that you are an AI.`;

    const { response, stream } = await ai.generateStream({
      prompt,
    });

    for await (const chunk of stream) {
      sendChunk({ text: chunk.text });
    }

    return (await response).text;
  }
);

// 3. Real-time MI Coaching System
export const miCoachingFlow = ai.defineFlow(
  {
    name: "miCoachingFlow",
    inputSchema: CoachingInputSchema,
    outputSchema: CoachingOutputSchema,
  },
  async (input) => {
    const result = await ai.generate({
      prompt: `Analyze this motivational interviewing interaction and provide real-time coaching
for the practitioner (user). The client has these characteristics:

${JSON.stringify(input.persona, null, 2)}

Conversation history:
${input.conversation_history.map(msg => 
  `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

User's latest message: "${input.user_message}"

Evaluate whether the user's latest message demonstrates good MI techniques
like OARS (Open questions, Affirmations, Reflections, Summaries), shows empathy,
avoids confrontation, and recognizes change talk.

If you identify an opportunity for improvement, provide a brief coaching tip.
If the user is doing well, indicate that no coaching is needed.`,
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
  }
);

// 4. Session Analysis & Feedback System
export const sessionFeedbackFlow = ai.defineFlow(
  {
    name: "sessionFeedbackFlow", 
    inputSchema: SessionFeedbackInputSchema,
    outputSchema: MITIScoreSchema,
  },
  async (input) => {
    const result = await ai.generate({
      prompt: `Analyze this motivational interviewing session and provide detailed MITI-based feedback.

PERSONA:
${JSON.stringify(input.persona, null, 2)}

CONVERSATION:
${input.conversation.map(msg => 
  `${msg.role.toUpperCase()}: ${msg.content}`).join('\n')}

Provide a comprehensive analysis using the Motivational Interviewing Treatment Integrity (MITI) 
coding system. Score global measures on a scale from 1-5, count specific behaviors, 
and calculate derived metrics. Include specific examples from the conversation to support your ratings.

Focus particularly on:
1. Practitioner's ability to evoke change talk
2. Use of reflections vs. questions
3. Empathic understanding
4. Supporting client autonomy
5. Partnership with client

Highlight 2-3 specific strengths and 2-3 areas for improvement.`,
      output: { 
        schema: MITIScoreSchema,
        format: 'json'
      },
    });
    
    return result.output || {
      global_scores: {
        cultivating_change_talk: 3,
        softening_sustain_talk: 3,
        partnership: 3,
        empathy: 3
      },
      behavior_counts: {
        giving_information: 0,
        persuade: 0,
        persuade_with_permission: 0,
        questions: 0,
        simple_reflections: 0,
        complex_reflections: 0,
        affirm: 0,
        seeking_collaboration: 0,
        emphasizing_autonomy: 0,
        confront: 0
      },
      derived_metrics: {
        technical_global: 3,
        relational_global: 3,
        percent_complex_reflections: 0,
        reflection_to_question_ratio: 0,
        total_mi_adherent: 0,
        total_mi_non_adherent: 0
      },
      competency_assessment: {
        relational: "Below Fair",
        technical: "Fair",
        percent_complex_reflections: "Below Fair",
        reflection_to_question_ratio: "Below Fair"
      },
      strengths: ["Not enough conversation to evaluate"],
      areas_for_improvement: ["Not enough conversation to evaluate"],
      examples: {
        good_examples: [],
        missed_opportunities: []
      }
    };
  }
);

// ===== DEMO FUNCTION =====

// Simple demo function to test the flows
export const runDemo = async () => {
  try {
    console.log("===== MI-Dojo: Motivational Interviewing Practice Platform =====\n");
    
    // Step 1: Generate a sample persona
    console.log("Generating persona...");
    const persona = await generatePersonaFlow({
      scenario_type: "addiction",
      change_readiness: "contemplation",
      additional_context: "The person is struggling with alcohol dependency and has a supportive family but stressful job."
    });
    
    console.log("\nGenerated Persona:");
    console.log(JSON.stringify(persona, null, 2));
    
    // Step 2: Sample conversation
    console.log("\n===== Starting Sample Conversation =====");
    
    // Initialize conversation history with the correct type
    const conversationHistory: Array<{ role: "user" | "persona"; content: string }> = [];
    
    // User message 1
    const userMessage1 = "Hello, I'm a counselor here to talk with you today. How are you feeling about your relationship with alcohol?";
    console.log(`\nUser: ${userMessage1}`);
    
    // Persona response 1
    const personaResponse1 = await streamingPersonaChatFlow({
      persona,
      message: userMessage1,
      conversation_history: conversationHistory
    });
    console.log(`\nPersona: ${personaResponse1}`);
    
    // Update conversation history
    conversationHistory.push(
      { role: "user", content: userMessage1 },
      { role: "persona", content: personaResponse1 }
    );
    
    console.log("All flows executed successfully!");
    
    console.log("MITI Scores:");
    console.log(JSON.stringify(feedback, null, 2));
    
    console.log("\n===== Demo Complete =====");
    
  } catch (error) {
    console.error("Error in MI-Dojo demo:", error);
  }
};

// If this file is run directly, run the demo
if (require.main === module) {
  runDemo();
}

// Export all flows for use in other modules and the Genkit CLI
export default {
  generatePersonaFlow,
  streamingPersonaChatFlow,
  miCoachingFlow,
  sessionFeedbackFlow
};