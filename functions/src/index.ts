/**
 * MI-Dojo - Motivational Interviewing Training Platform
 * Firebase Functions implementation
 */

import { onCallGenkit } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { gemini20Flash, googleAI } from "@genkit-ai/googleai";
import { genkit, z } from "genkit";
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";
import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin
initializeApp();

// Enable Firebase telemetry for Genkit
enableFirebaseTelemetry();

// Define secret for API key
const googleAIApiKey = defineSecret("GOOGLE_GENAI_API_KEY");

// Initialize Genkit with Google AI plugin
const ai = genkit({
  plugins: [googleAI()],
  model: gemini20Flash,
});

// ===== SCHEMAS =====

// Schema for persona generation input
const PersonaInputSchema = z.object({
  scenario_type: z.enum([
    "chronic_illness", 
    "addiction", 
    "lifestyle_change", 
    "mental_health", 
    "preventive_care"
  ]),
  change_readiness: z.enum([
    "pre_contemplation", 
    "contemplation", 
    "preparation", 
    "action", 
    "maintenance"
  ]),
  additional_context: z.string().optional(),
  communication_style_prompt: z.string().optional(), // Added field for communication style
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
  role: z.enum(["user", "persona"]),
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

// Define the enum types to ensure consistent values
const CompetencyRating = z.enum(["Below Fair", "Fair", "Good"]);

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
    relational: CompetencyRating,
    technical: CompetencyRating,
    percent_complex_reflections: CompetencyRating,
    reflection_to_question_ratio: CompetencyRating
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
const generatePersonaFlow = ai.defineFlow(
  {
    name: "generatePersonaFlow",
    inputSchema: PersonaInputSchema,
    outputSchema: PersonaOutputSchema,
  },
  async (input) => {
    try {
      // Build the prompt with optional communication style
      const communicationStylePrompt = input.communication_style_prompt 
        ? `\nCommunication style: ${input.communication_style_prompt}`
        : "";

      const result = await ai.generate({
        prompt: `Create an authentic, diverse patient persona for Motivational Interviewing practice
with scenario: ${input.scenario_type} and readiness stage: ${input.change_readiness}.
${input.additional_context || ""}
${communicationStylePrompt}

This persona should have a DISTINCTIVE COMMUNICATION STYLE. Include details such as:
- Do they use short, direct sentences or rambling explanations?
- Do they use technical jargon or simple language?
- Do they express emotion openly or are they reserved?
- Do they have specific speech patterns or verbal tics?
- Do they have characteristic phrases they repeat?
- What's their educational background or vocabulary level?

Be creative but realistic. Keep descriptions concise.
For change_talk_patterns, use numbers 1-10 to indicate frequency.
Key resistances should include 2-4 realistic objections.
Give a unique persona_id combining scenario type and a random element.`,
        output: { 
          schema: PersonaOutputSchema,
          format: "json"
        },
      });
      
      if (result.output) {
        return result.output;
      }
    } catch (error) {
      console.error("Error in generatePersonaFlow:", error);
    }
    
    // Default fallback value
    return {
      persona_id: "default_persona",
      base_characteristics: { 
        condition: "Unknown condition", 
        stage_of_change: "contemplation", 
        key_resistances: ["Difficulty understanding the condition", "Lack of time"], 
        communication_style: "Neutral" 
      },
      scenario_context: { 
        life_circumstances: "Unknown circumstances", 
        support_system: "Has some support from family", 
        stress_factors: ["Work pressure", "Financial concerns"] 
      },
      change_dynamics: {
        readiness_level: "Moderate readiness",
        ambivalence_areas: ["Cost/benefit analysis", "Impact on lifestyle"],
        change_talk_patterns: {
          commitment: 3,
          desire: 5,
          ability: 4,
          need: 6,
          reasons: 5,
          taking_steps: 2
        }
      }
    };
  }
);

// 2. Chat Interface with Personas - Non-streaming version for Firebase Functions
const personaChatFlow = ai.defineFlow(
  {
    name: "personaChatFlow",
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    try {
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

It's CRUCIAL that you embody the specific communication style described above. 
Your personality should clearly shine through in your responses.

${input.conversation_history ? `Previous conversation:\n${input.conversation_history.map(msg => 
  `${msg.role === "user" ? "User" : "You"}: ${msg.content}`).join("\n")}` : ""}

User's message: ${input.message}

Respond in first person as this persona would naturally speak. 
Be authentic to your communication style, readiness level, and ambivalence areas. 
Show appropriate levels of resistance or openness based on your stage of change.
Do not break character or reference that you are an AI.`;

      const result = await ai.generate({ prompt });
      return result.text;
    } catch (error) {
      console.error("Error in personaChatFlow:", error);
      return "I'm sorry, I'm having trouble responding right now.";
    }
  }
);

// 3. Real-time MI Coaching System
const miCoachingFlow = ai.defineFlow(
  {
    name: "miCoachingFlow",
    inputSchema: CoachingInputSchema,
    outputSchema: CoachingOutputSchema,
  },
  async (input) => {
    try {
      const result = await ai.generate({
        prompt: `Analyze this motivational interviewing interaction and provide real-time coaching
for the practitioner (user). The client has these characteristics:

${JSON.stringify(input.persona, null, 2)}

Conversation history:
${input.conversation_history.map(msg => 
  `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")}

User's latest message: "${input.user_message}"

Evaluate whether the user's latest message demonstrates good MI techniques
like OARS (Open questions, Affirmations, Reflections, Summaries), shows empathy,
avoids confrontation, and recognizes change talk.

If you identify an opportunity for improvement, provide a brief coaching tip.
If the user is doing well, indicate that no coaching is needed.`,
        output: { 
          schema: CoachingOutputSchema,
          format: "json"
        },
      });
      
      if (result.output) {
        return result.output;
      }
    } catch (error) {
      console.error("Error in miCoachingFlow:", error);
    }
    
    return {
      has_coaching: false,
      coaching_message: "",
      mi_technique_used: "",
      missed_opportunity: ""
    };
  }
);

// 4. Session Analysis & Feedback System

const sessionFeedbackFlow = ai.defineFlow(
  {
    name: "sessionFeedbackFlow", 
    inputSchema: SessionFeedbackInputSchema,
    outputSchema: MITIScoreSchema,
  },
  async (input) => {
    try {
      const result = await ai.generate({
        prompt: `Analyze this motivational interviewing session using the MITI 4.2.1 coding system.

PERSONA:
${JSON.stringify(input.persona, null, 2)}

CONVERSATION:
${input.conversation.map(msg => 
  `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")}

Follow these exact MITI 4.2.1 coding instructions:
1. Identify the target behavior change being discussed.
2. Provide Global Ratings (1-5 scale) for:
   - Technical Components:
     * Cultivating Change Talk (clinician's efforts to elicit client language in favor of change)
     * Softening Sustain Talk (clinician's efforts to reduce focus on status quo language)
   - Relational Components:
     * Partnership (power sharing and collaboration)
     * Empathy (understanding client's perspective)

3. Count the following behaviors:
   - Giving Information (GI)
   - Persuade
   - Persuade with Permission
   - Questions (Q)
   - Simple Reflections (SR)
   - Complex Reflections (CR)
   - Affirm (AF)
   - Seeking Collaboration (Seek)
   - Emphasizing Autonomy (Emphasize)
   - Confront

4. Calculate:
   - Technical Global = (Cultivating Change Talk + Softening Sustain Talk) / 2
   - Relational Global = (Partnership + Empathy) / 2
   - % Complex Reflections = CR / (SR + CR)
   - Reflection-to-Question Ratio = Total reflections / Total Questions
   - Total MI-Adherent = Seeking Collaboration + Affirm + Emphasizing Autonomy
   - Total MI Non-Adherent = Confront + Persuade

5. Assess competency based on these thresholds:
   - Relational: Fair ≥ 3.5, Good ≥ 4
   - Technical: Fair ≥ 3, Good ≥ 4
   - % Complex Reflections: Fair ≥ 40%, Good ≥ 50%
   - Reflection-to-Question Ratio: Fair ≥ 1:1, Good ≥ 2:1

6. Provide 2-3 strengths and 2-3 areas for improvement with specific examples from the conversation.`,
        output: { 
          schema: MITIScoreSchema,
          format: "json"
        },
      });
      
      if (result.output) {
        return result.output;
      }
    } catch (error) {
      console.error("Error in sessionFeedbackFlow:", error);
    }
    
    // Default fallback value with correct enum values
    return {
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
        relational: "Below Fair" as const,
        technical: "Fair" as const,
        percent_complex_reflections: "Below Fair" as const,
        reflection_to_question_ratio: "Below Fair" as const
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

// ===== EXPORT FIREBASE FUNCTIONS =====

// Common configuration for all functions
const functionConfig = {
  secrets: [googleAIApiKey],
  region: "us-central1",
};

// Export Genkit Flows directly with onCallGenkit
export const generatePersona = onCallGenkit(functionConfig, generatePersonaFlow);
export const personaChat = onCallGenkit(functionConfig, personaChatFlow);
export const miCoaching = onCallGenkit(functionConfig, miCoachingFlow);
export const sessionFeedback = onCallGenkit(functionConfig, sessionFeedbackFlow);