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
    example_lines: z.array(z.string()).optional(),
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

// Refined presetPersonas with more natural language and optional example lines
const presetPersonas = {
  mat: {
    persona_id: 'mat_workplace',    base_characteristics: {      condition: 'Workplace dynamics',      stage_of_change: 'contemplation',      key_resistances: [        'Prefers autonomy',        'Skeptical of coaching',        'Concerned about judgment'      ],      communication_style:        'Direct but thoughtful, occasionally defensive. ' +        'Rarely uses a reversed phrase or a subtle spoonerism for emphasis. ' +        'Expressive when challenged, otherwise succinct.',      // Optional example lines to demonstrate a bit of his style      example_lines: [        '“I’ll hear you out, but I’m not promising I’ll change.”',        '“Sometimes you gain by losing, and lose by gaining—though I’m not sure what to do with that.”'      ]    },    scenario_context: {      life_circumstances:        'Team leader with tight deadlines, feels overshadowed as others get promoted first.',      support_system: 'Has a mentor but avoids vulnerability',      stress_factors: [        'Performance pressure',        'Managing conflict',        'Fear of stagnation'      ]    },    change_dynamics: {      readiness_level: 'High',      ambivalence_areas: ['Work/life balance', 'Judging self-worth'],      change_talk_patterns: {        commitment: 7,        desire: 6,        ability: 5,        need: 6,        reasons: 7,        taking_steps: 6      }    },    org_values_alignment: {      foundations: ['Growth', 'Trust', 'Responsibility'],      technical_domains: [        'Empower decisions',        'Explore ambivalence',        'Summarize change talk'      ]    }
    },
    scenario_context: {
      life_circumstances: 'Team leader with tight deadlines, having work stolen by juniors, others getting ahead and promoted whilst he does not',
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
    persona_id: 'saira_health',    base_characteristics: {      condition: 'Chronic absenteeism',      stage_of_change: 'preparation',      key_resistances: [        'Fear of disciplinary action',        'Does not want colleagues to think poorly of her',        'Feels powerless to health concerns'      ],      communication_style:        'Emotionally expressive, sometimes tangential, uses metaphors. ' +        'Generally aims for short, measured sentences but can ramble when anxious. ' +        'Concerned about trust, occasionally references Islamic faith.',      example_lines: [        '“I’m honestly worried people think I’m slacking, but it’s so hard managing my condition.”',        '“It feels like I’m running a marathon in my mind, but my body is stuck at the starting line.”'      ]    },

    scenario_context: {
      life_circumstances: 'Managing a long-term autoimmune condition',
      support_system: 'Family is involved but inconsistent, working from home whilst others in office creates isolation',
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
    persona_id: 'ogi_lifestyle',    base_characteristics: {      condition: 'Lifestyle habits',      stage_of_change: 'action',      key_resistances: [        'Facing urgent financial distress',        'Triggered by idea of income loss or unexpected expenses'      ],      communication_style:        'Direct, sometimes gives short answers that invite follow-up questions. ' +        'Very self-aware and polite, but can appear abrupt if pressed too hard.',      example_lines: [        '“I’m juggling a lot, so I’d rather keep this brief until I see value in going deeper.”',        '“Yeah, I’m aware I need a change—I just don’t know if I can handle it right now.”'      ]    },

    scenario_context: {
      life_circumstances: 'Recently purchased a new property that drastically impacted income',
      support_system: 'aggressive business partners, family skeptical',
      stress_factors: ['his accountant managing cashflow inexpertly', 'Perfectionism trying to understand complex investments'],
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
  tim: {
    persona_id: 'tim_business',
    base_characteristics: {
      condition: 'Business Development & International Expansion',
      stage_of_change: 'preparation', // Considering expansion but needs guidance
      key_resistances: [
        'Uncertainty about navigating global markets',
        'Concern about maintaining company values during growth',
        'Resource constraints (expertise, funding)',
        'Fear of diluting company culture/reputation'
      ],
      communication_style:
        'Warm, supportive, caring, and precise. Articulates vision clearly. ' +
        'Expresses passion for ethical business and making a difference. ' +
        'Open about challenges and uncertainties. Values collaboration and mentorship.',
      example_lines: [ // Derived from the sample conversation (BO's lines)
        '“I\'ve been really excited about the potential of growing internationally. I deeply believe that our human-centered approach has value beyond our current market.”',
        '“It’s crucial to me that our growth remains responsible, fair, and aligned with our core values. It’s not just about getting bigger—it\'s about getting better.”',
        '“Honestly, it\'s the chance to bring our vision of a fairer, ethically-driven AI world to a wider audience.”',
        '“I admit I\'m a little uncertain about how best to proceed.”'
      ]
    },
    scenario_context: {
      life_circumstances:
        'Leading a fledgling healthcare and training company aiming for international growth.',
      support_system: 'Seeking mentorship and strategic partnerships.',
      stress_factors: [
        'Scaling operations responsibly',
        'Navigating international regulations and cultural differences',
        'Securing necessary resources/expertise',
        'Balancing growth with maintaining core values'
      ]
    },
    change_dynamics: {
      readiness_level: 'High desire, moderate ability/confidence',
      ambivalence_areas: [
        'Potential risks vs. rewards of expansion',
        'Speed of growth vs. maintaining quality/values',
        'Need for external expertise vs. maintaining internal control'
      ],
      change_talk_patterns: { // Estimated based on description and conversation
        commitment: 6,
        desire: 9,
        ability: 5,
        need: 7,
        reasons: 8,
        taking_steps: 4 // In preparation/early action
      }
    },
    org_values_alignment: { // Based on the provided core beliefs
      foundations: ['Human-centered', 'Passion', 'Bravery (Change)', 'Responsibility', 'Integrity', 'Fairness'],
      technical_domains: ['Develop Leadership', 'Disruptive Voice', 'Make Business Better'] // Interpreted actions/goals
    },
  }
};


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
  values_alignment_feedback: z.string().optional(),
});

// Schema for session feedback input
const SessionFeedbackInputSchema = z.object({
  conversation: z.array(MessageSchema),
  persona: PersonaOutputSchema,
});

// Define the enum types to ensure consistent values
const CompetencyRating = z.enum(["Below Fair", "Fair", "Good"]);

// Schema for MBA Values Driven Leadership Rubric
const ValuesRubricSchema = z.object({
  summary: z.string(),
  key_moments: z.array(
    z.object({
      value: z.string(),
      description: z.string()
    })
  ),
  suggestions: z.array(z.string()),
  rubric_assessment: z.object({
    fosters_action: z.object({
      level: z.number().min(1).max(4),
      justification: z.string()
    }),
    personal_social_responsibility: z.object({
      level: z.number().min(1).max(4),
      justification: z.string()
    }),
    knowledge_of_self: z.object({
      level: z.number().min(1).max(4),
      justification: z.string()
    })
  })
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
      },
      org_values_alignment: {
        foundations: ["Respect", "Integrity"],
        technical_domains: ["Active listening", "Open questioning"]
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
      const { base_characteristics, scenario_context, change_dynamics } = input.persona;

      const prompt = `
You are roleplaying as a person with the following characteristics:

Condition: ${base_characteristics.condition}
Stage of Change: ${base_characteristics.stage_of_change}
Key Resistances: ${base_characteristics.key_resistances.join(", ")}
Communication Style: ${base_characteristics.communication_style}

${base_characteristics.example_lines 
  ? `Here are some example lines of how you might speak:\n${base_characteristics.example_lines.join("\n")}\n`
  : ""}

Life Circumstances: ${scenario_context.life_circumstances}
Support System: ${scenario_context.support_system}
Stress Factors: ${scenario_context.stress_factors.join(", ")}

Readiness Level: ${change_dynamics.readiness_level}
Ambivalence Areas: ${change_dynamics.ambivalence_areas.join(", ")}

Given your change talk patterns:
- Commitment: ${change_dynamics.change_talk_patterns.commitment}/10
- Desire: ${change_dynamics.change_talk_patterns.desire}/10
- Ability: ${change_dynamics.change_talk_patterns.ability}/10
- Need: ${change_dynamics.change_talk_patterns.need}/10
- Reasons: ${change_dynamics.change_talk_patterns.reasons}/10
- Taking Steps: ${change_dynamics.change_talk_patterns.taking_steps}/10

Your goal is to respond authentically in first person, reflecting these traits.
Keep your style natural and conversational, with occasional hints of your described quirks. 
Do not mention that you are an AI, and avoid special formatting or emojis.

${input.conversation_history
  ? `Previous conversation:\n${input.conversation_history
      .map(
        (msg) => `${msg.role === "user" ? "User" : "You"}: ${msg.content}`
      )
      .join("\n")}`
  : ""}

User's message: ${input.message}
`;

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
      // Inlined prompt content from prompts/mi-coaching.prompt
      const prompt = `Analyze this motivational interviewing interaction using MITI 4.2.1 principles.

Persona:
${JSON.stringify(input.persona, null, 2)}

Conversation so far:
${input.conversation_history.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")}

User's latest message:
"${input.user_message}"

---

Evaluate the user's latest response using the MITI framework. Focus on the following:

**OARS techniques:**
- Open-ended questions
- Affirmations
- Reflections (simple or complex)
- Summaries

**MI spirit:**
- Collaboration
- Evoking change talk
- Autonomy support
- Empathic presence

Avoid behaviors such as:
- Direct persuasion without permission
- Confrontation
- Over-informing

---

Examples of strong MI-aligned responses:
• "How have you been managing this challenge lately?" (Open Question)
• "It sounds like you've really tried hard to get through this." (Affirmation)
• "You're unsure whether change will really help, but you’re also frustrated by the current situation." (Complex Reflection)
• "You’ve said that freedom matters a lot, so whatever happens should feel like your decision." (Autonomy Support)

Examples of MI-discord or missed opportunities:
• "You should really consider changing that, because it's what we expect here" (Persuade, Values as a Club)
• "That doesn’t sound like a good excuse, especially if we value Trust" (Confront, Values as a Club)
• "Let me tell you what the research says about Honesty." (Giving Information without context, Values as an aside)

---

Examples of strong MI-aligned responses and values alignment:
• "How have you been managing this challenge lately, and how does it align with the value of Growth?" (Open Question, Value Inquiry)
• "It sounds like you've really tried hard to get through this, especially in light of your commitment to Trust within your team." (Affirmation, Value Connection)
• "You're unsure whether change will really help, but you’re also frustrated by the current situation, which ties into Responsibility." (Complex Reflection, Value Tie-In)
• "You’ve said that freedom matters a lot, so whatever happens should feel like your decision, and it's great that you’re thinking about how this affects Collaboration." (Autonomy Support, Value Integration)

---

Return a JSON object structured as follows:
{
  "has_coaching": boolean,
  "coaching_message": string (optional),
  "mi_technique_used": string (optional),
  "missed_opportunity": string (optional),
  "rationale": string (optional), // Justify your assessment using MITI criteria
  "values_alignment_feedback": string (optional) // Provide CONCISE feedback (1-2 sentences or bullet points) on how the user's message aligns (or doesn't) with the persona's specific org_values_alignment (foundations and technical_domains). Reference specific values mentioned in the persona. Keep this feedback brief and actionable.
}`;

      const result = await ai.generate({
        prompt: prompt,
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
      missed_opportunity: "",
      values_alignment_feedback: ""
    };
  }
);

// 4. Values Analysis System
const valuesAnalysisFlow = ai.defineFlow(
  {
    name: "valuesAnalysisFlow",
    inputSchema: SessionFeedbackInputSchema, // Reuse the same input schema as sessionFeedback
    outputSchema: ValuesRubricSchema,
  },
  async (input) => {
    try {
      const result = await ai.generate({
        prompt: `Analyze this conversation for values-driven leadership according to the MBA Values Driven Leadership Rubric.

PERSONA:
${JSON.stringify(input.persona, null, 2)}

CONVERSATION:
${input.conversation.map(msg => 
  `${msg.role.toUpperCase()}: ${msg.content}`).join("\n")}

MBA VALUES DRIVEN LEADERSHIP RUBRIC:
{
  "MBA_VALUES_DRIVEN_LEADERSHIP_RUBRIC": [
    {
      "Criteria": "Fosters Action Towards Achievement of Organizational Goals",
      "Levels": {
        "Level 1": "Is not able to exhibit an understanding of the impact of change within and outside the organization and translate it into a coherent action plan",
        "Level 2": "Has limited understanding of and difficulty analyzing the impact of change within and outside the organization and translate into a coherent action plan",
        "Level 3": "Understands and with minor difficulty analyzes the impact of change within and outside the organization and translate it into a coherent action plan",
        "Level 4": "Is able to analyze the impact of change within and outside the organization and translate it into a coherent action plan"
      }
    },
    {
      "Criteria": "Personal and Social Responsibility",
      "Levels": {
        "Level 1": "Identifies basic ethical dimensions of some local or national decisions that have impact on human systems",
        "Level 2": "Explains the ethical, social, and environmental consequences of local and national decisions on human systems",
        "Level 3": "Analyzes the ethical, social, and environmental consequences of human systems and identifies a range of actions informed by one's sense of personal and social responsibility",
        "Level 4": "Takes informed and responsible action to address ethical, social and environmental challenges in human systems and evaluates the local and broader consequences of individual and collective interventions"
      }
    },
    {
      "Criteria": "Knowledge of Self as a Leader",
      "Levels": {
        "Level 1": "Has very limited sense of own leadership capacity and has done very little self-examination related to personal leadership style, vision, and values",
        "Level 2": "Has a beginning sense of own leadership capacity based on some basic examination of personal leadership style, vision, and values",
        "Level 3": "Can articulate some facets of own leadership capacity based on some examination of personal leadership style, vision, and values",
        "Level 4": "Can clearly articulate own leadership capacity based on a thorough examination of personal leadership style, vision, and values"
      }
    }
  ]
}

Analyze the conversation and assess how well the user (coach/interviewer) demonstrates values-driven leadership in their interaction with the persona. Focus on:

1. How the user helps the persona foster action towards organizational goals
2. How the user demonstrates personal and social responsibility
3. How the user shows knowledge of self as a leader

For each criterion in the rubric, assign a level (1-4) and provide a brief justification based on specific examples from the conversation.

Also identify key moments in the conversation where specific values were demonstrated or could have been better emphasized.

Return a JSON object with:
1. A concise summary of the values alignment
2. Key moments with specific values identified
3. Suggestions for improvement
4. Assessment against each rubric criterion with level and justification`,
        output: { 
          schema: ValuesRubricSchema,
          format: "json"
        },
      });
      
      if (result.output) {
        return result.output;
      }
    } catch (error) {
      console.error("Error in valuesAnalysisFlow:", error);
    }
    
    // Default fallback value
    return {
      summary: "Not enough conversation to evaluate values alignment.",
      key_moments: [],
      suggestions: ["Continue the conversation to receive meaningful values analysis."],
      rubric_assessment: {
        fosters_action: {
          level: 1,
          justification: "Insufficient data to evaluate."
        },
        personal_social_responsibility: {
          level: 1,
          justification: "Insufficient data to evaluate."
        },
        knowledge_of_self: {
          level: 1,
          justification: "Insufficient data to evaluate."
        }
      }
    };
  }
);

// 5. Session Analysis & Feedback System (MITI)
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

// Get Preset Persona Flow
const getPresetPersonaFlow = ai.defineFlow(
  {
    name: 'getPresetPersonaFlow',
    inputSchema: z.object({ name: z.enum(['mat', 'saira', 'ogi', 'tim']) }), // Added 'tim'
    outputSchema: PersonaOutputSchema,
  },
  async (input) => {
    const persona = presetPersonas[input.name];
    if (!persona) throw new Error(`Invalid preset: ${input.name}`);
    return persona;
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
export const valuesAnalysis = onCallGenkit(functionConfig, valuesAnalysisFlow); // Export new function
export const getPresetPersona = onCallGenkit(functionConfig, getPresetPersonaFlow);
