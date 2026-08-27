import { zodTextFormat } from 'openai/helpers/zod';
import { env } from '../config/env.js';
import { openaiClient } from '../lib/ai/client.js';
import { createFallbackAnalysis } from '../lib/ai/fallback.js';
import { rtiAnalysisSchema } from '../schemas/rti.js';
import type { RTIAnalysis } from '../types/rti.js';

const ANALYSIS_INSTRUCTIONS = `You assist Indian citizens in expressing an information need for a Right to Information workflow.
Analyse the citizen's description and identify the general issue, requested government information or records, jurisdiction, and whether one clarification question is needed.
Use central or state only when the citizen's text makes that clear; otherwise use unknown.
Prefer records, status, dates, file movement, orders, notes, responsible designations, and documented reasons.
Do not provide legal advice, invent facts or authorities, or draft an RTI application.`;

export type RTIAnalysisResult = {
  data: RTIAnalysis;
  meta: {
    source: 'ai' | 'fallback';
    degraded: boolean;
  };
};

export async function analyseCitizenProblem(problem: string): Promise<RTIAnalysisResult> {
  if (!openaiClient || !env.OPENAI_MODEL) {
    return fallbackResult(problem);
  }

  try {
    const response = await openaiClient.responses.parse({
      model: env.OPENAI_MODEL,
      instructions: ANALYSIS_INSTRUCTIONS,
      input: problem,
      text: {
        format: zodTextFormat(rtiAnalysisSchema, 'rti_analysis')
      }
    });

    if (!response.output_parsed) {
      throw new Error('RTI analysis output was incomplete');
    }

    return {
      data: rtiAnalysisSchema.parse(response.output_parsed),
      meta: { source: 'ai', degraded: false }
    };
  } catch {
    console.warn('RTI analysis provider failed; using fallback.');
    return fallbackResult(problem);
  }
}

function fallbackResult(problem: string): RTIAnalysisResult {
  return {
    data: createFallbackAnalysis(problem),
    meta: { source: 'fallback', degraded: true }
  };
}
