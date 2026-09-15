import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import {
  generateText,
  stepCountIs,
} from 'ai';

import type {
  AssistantResponse,
  ChatRequest,
  MapAction,
  RemoteMapLayerId,
  SourceReference,
} from '../shared/contracts.js';

import {
  buildSystemPrompt,
} from '../server/ai/prompt.js';

import {
  resolveModel,
} from '../server/ai/provider.js';

import {
  createHazardWeaveTools,
} from '../server/ai/tools/index.js';

import {
  allowMethods,
} from '../server/http.js';


/* ============================================================
 * Request validation
 * ============================================================ */

function parseBody(
  body: unknown,
): ChatRequest {

  const value =
    typeof body === 'string'
      ? JSON.parse(body)
      : body;


  if (
    !value ||
    typeof value !== 'object' ||
    !('question' in value)
  ) {
    throw new Error(
      'A question is required.',
    );
  }


  const request =
    value as ChatRequest;


  /* ----------------------------------------------------------
   * Question validation
   * ---------------------------------------------------------- */

  if (
    !request.question?.trim()
  ) {
    throw new Error(
      'A non-empty question is required.',
    );
  }


  if (
    request.question.length > 4000
  ) {
    throw new Error(
      'The question is too long.',
    );
  }


  /* ----------------------------------------------------------
   * RAG validation
   *
   * The browser normally sends Top 3–5 passages.
   * These limits prevent somebody from manually POSTing a
   * huge knowledge payload to /api/chat and wasting resources.
   * ---------------------------------------------------------- */

  if (
    request.rag !== undefined
  ) {

    if (
      !Array.isArray(
        request.rag,
      )
    ) {
      throw new Error(
        'Retrieved knowledge must be an array.',
      );
    }


    if (
      request.rag.length > 6
    ) {
      throw new Error(
        'Too many retrieved knowledge passages.',
      );
    }


    let totalRagCharacters = 0;


    for (
      const item of request.rag
    ) {

      if (
        !item ||
        typeof item !== 'object'
      ) {
        throw new Error(
          'Invalid retrieved knowledge passage.',
        );
      }


      if (
        typeof item.id !== 'string' ||
        typeof item.docId !== 'string' ||
        typeof item.title !== 'string' ||
        typeof item.agency !== 'string' ||
        typeof item.text !== 'string'
      ) {
        throw new Error(
          'Invalid retrieved knowledge passage.',
        );
      }


      if (
        item.text.length > 5000
      ) {
        throw new Error(
          'Retrieved knowledge passage is too long.',
        );
      }


      totalRagCharacters +=
        item.text.length;
    }


    if (
      totalRagCharacters > 25000
    ) {
      throw new Error(
        'Retrieved knowledge payload is too large.',
      );
    }
  }


  return request;
}


/* ============================================================
 * Source utilities
 * ============================================================ */

function dedupeSources(
  sources: SourceReference[],
): SourceReference[] {

  const seen =
    new Set<string>();


  return sources.filter(
    (source) => {

      const key =
        `${source.name}|` +
        `${source.validTime}|` +
        `${source.modelVersion ?? ''}`;


      if (
        seen.has(key)
      ) {
        return false;
      }


      seen.add(key);

      return true;
    },
  );
}


/* ============================================================
 * Error sanitization
 * ============================================================ */

function safeMessage(
  error: unknown,
): string {

  const raw =
    error instanceof Error
      ? error.message
      : 'Unknown AI request error.';


  return raw
    .replace(
      /sk-[A-Za-z0-9_-]+/g,
      '[redacted]',
    )
    .replace(
      /AIza[A-Za-z0-9_-]+/g,
      '[redacted]',
    )
    .slice(
      0,
      800,
    );
}


/* ============================================================
 * Determine whether a question normally requires grounding
 * ============================================================ */

function looksDataDependent(
  question: string,
): boolean {

  return /current|now|here|this area|flood|water|gauge|vulnerab|socio|poverty|income|claim|assistance|resource|need|community|risk|expos/i.test(
    question,
  );
}


/* ============================================================
 * API Handler
 * ============================================================ */

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {

  if (
    !allowMethods(
      request,
      response,
      ['POST'],
    )
  ) {
    return;
  }


  try {

    /* --------------------------------------------------------
     * Parse request
     * -------------------------------------------------------- */

    const body =
      parseBody(
        request.body,
      );


    /* --------------------------------------------------------
     * Resolve LLM
     * -------------------------------------------------------- */

    const resolved =
      resolveModel(
        body.ai,
      );


    /* --------------------------------------------------------
     * Create HazardWeave live-data tools
     * -------------------------------------------------------- */

    const runtime =
      createHazardWeaveTools(
        body.context,
      );


    /* --------------------------------------------------------
     * Run LLM
     *
     * RAG passages are injected into the system prompt.
     * Live information still comes from tool calling.
     * -------------------------------------------------------- */

    const result =
      await generateText({

        model:
          resolved.model,

        system:
          buildSystemPrompt(
            body.context,
            body.rag,
          ),

        prompt:
          body.question.trim(),

        tools:
          runtime.tools,

        stopWhen:
          stepCountIs(5),

        maxOutputTokens:
          900,
      });


    /* ========================================================
     * Grounding
     * ======================================================== */

    const evidence =
      runtime.evidence;


    const ragEvidence =
      body.rag ?? [];


    const liveGrounded =
      evidence.length > 0;


    const ragGrounded =
      ragEvidence.length > 0;


    const grounded =
      liveGrounded ||
      ragGrounded;


    /* ========================================================
     * Sources
     * ======================================================== */

    const liveSources =
      evidence.flatMap(
        (item) =>
          item.sources,
      );


    const ragSources:
      SourceReference[] =
      ragEvidence.map(
        (item) => {

          const pageLabel =
            item.page !== undefined &&
            item.page !== null
              ? `Page ${item.page}`
              : 'RAG document';


          return {

            name:
              `${item.agency} · ${item.title}`,

            validTime:
              item.year
                ? `Published ${item.year}`
                : 'Knowledge base',

            modelVersion:
              pageLabel,
          };
        },
      );


    const sources =
      dedupeSources([
        ...liveSources,
        ...ragSources,
      ]);


    /* ========================================================
     * Map actions
     * ======================================================== */

    const mapLayerIds =
      [
        ...new Set(
          evidence.flatMap(
            (item) =>
              item.mapLayers,
          ),
        ),
      ] as RemoteMapLayerId[];


    const mapActions:
      MapAction[] =
      mapLayerIds.map(
        (layerId) => ({
          type:
            'show_layer',

          layerId,
        }),
      );


    if (
      body.context?.mapBounds &&
      mapLayerIds.length > 0
    ) {

      mapActions.push({
        type:
          'fit_bounds',

        bounds:
          body.context.mapBounds,
      });
    }


    /* ========================================================
     * Final answer
     * ======================================================== */

    let answer =
      result.text.trim();


    /*
     * Reject unsupported operational claims only when neither
     * live tools nor RAG documents provide grounding.
     */
    if (
      looksDataDependent(
        body.question,
      ) &&
      !grounded
    ) {

      answer =
        'I could not ground this request in HazardWeave live data or the knowledge base, so I will not infer an operational answer. Try asking about current flood conditions, community vulnerability, FEMA/NFIP assistance, or documented hazard guidance.';

    }

    /*
     * If the model produced no text but live tools did produce
     * evidence, fall back to their summaries.
     */
    else if (
      !answer &&
      evidence.length > 0
    ) {

      answer =
        evidence
          .map(
            (item) =>
              item.summary,
          )
          .join(' ');

    }

    else if (
      !answer
    ) {

      answer =
        'The selected model returned no answer.';
    }


    /* ========================================================
     * Warnings
     * ======================================================== */

    const warnings =
      evidence.flatMap(
        (item) =>
          item.warnings ?? [],
      );


    /* ========================================================
     * Confidence
     *
     * Live data:
     *   High unless live tools provide warnings.
     *
     * Static RAG only:
     *   Moderate because documents may not represent current
     *   operational conditions.
     *
     * No grounding:
     *   Low.
     * ======================================================== */

    const confidence:
      AssistantResponse['confidence'] =
      liveGrounded
        ? warnings.length > 0
          ? 'Moderate'
          : 'High'
        : ragGrounded
          ? 'Moderate'
          : 'Low';


    /* ========================================================
     * Response
     * ======================================================== */

    const payload:
      AssistantResponse = {

      answer,

      confidence,

      mapActions,

      rows: [],

      sources,

      model: {
        provider:
          resolved.provider,

        modelId:
          resolved.modelId,

        label:
          resolved.label,
      },
    };


    response.setHeader(
      'Cache-Control',
      'no-store',
    );


    response
      .status(200)
      .json(payload);

  }

  catch (
    error
  ) {

    const message =
      safeMessage(
        error,
      );


    /*
     * RAG validation errors are user/input errors rather than
     * upstream model failures.
     */
    const isInputError =
      /required|question|model id|api key|map extent|unsupported ai provider|retrieved knowledge|knowledge passage|knowledge payload/i.test(
        message,
      );


    response
      .status(
        isInputError
          ? 400
          : 502,
      )
      .json({
        error:
          message,
      });
  }
}