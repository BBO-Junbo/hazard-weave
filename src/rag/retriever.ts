import MiniSearch from 'minisearch';

import type {
  RetrievedKnowledgeChunk,
} from '../../shared/contracts';


interface KnowledgeManifestDocument {
  id: string;
  title: string;
  agency: string;
  year?: number;
  sourceType?: string;
  topics: string[];
  url?: string;
  file: string;
  chunkCount: number;
  sizeBytes: number;
}


interface KnowledgeManifest {
  version: number;

  stats: {
    documents: number;
    chunks: number;
    failedDocuments: number;
  };

  documents: KnowledgeManifestDocument[];
}


interface RawKnowledgeChunk {
  id: string;
  docId: string;

  title: string;
  agency: string;

  year?: number;
  page?: number | null;

  sourceType?: string;

  topics?: string[];

  url?: string;

  text: string;
}


interface SearchDocument {
  id: string;

  title: string;
  agency: string;

  topicsText: string;

  text: string;
}


interface KnowledgeIndex {
  search: MiniSearch<SearchDocument>;

  chunks: Map<
    string,
    RawKnowledgeChunk
  >;
}


/*
 * Keep one in-memory copy for the browser session.
 *
 * The knowledge base is fetched only the first time
 * RAG is used. Later questions reuse the same index.
 */
let knowledgeIndexPromise:
  Promise<KnowledgeIndex> | null = null;


async function fetchJson<T>(
  path: string,
): Promise<T> {

  const response = await fetch(
    path,
    {
      cache: 'force-cache',
    },
  );

  if (!response.ok) {
    throw new Error(
      `Knowledge base request failed: ${path} returned ${response.status}.`,
    );
  }

  return response.json() as Promise<T>;
}


async function buildKnowledgeIndex():
  Promise<KnowledgeIndex> {

  const manifest =
    await fetchJson<KnowledgeManifest>(
      '/knowledge/manifest.json',
    );


  /*
   * These are static files under /public.
   *
   * They are served as static assets rather than
   * /api routes, so this retrieval does NOT create
   * Vercel Function invocations.
   */
  const documentChunks =
    await Promise.all(
      manifest.documents.map(
        (document) =>
          fetchJson<RawKnowledgeChunk[]>(
            document.file,
          ),
      ),
    );


  const allChunks =
    documentChunks.flat();


  const chunks =
    new Map<
      string,
      RawKnowledgeChunk
    >();


  const searchableDocuments:
    SearchDocument[] =
    allChunks.map(
      (chunk) => {

        chunks.set(
          chunk.id,
          chunk,
        );

        return {
          id: chunk.id,

          title:
            chunk.title,

          agency:
            chunk.agency,

          topicsText:
            (
              chunk.topics ?? []
            ).join(' '),

          text:
            chunk.text,
        };
      },
    );


  const search =
    new MiniSearch<SearchDocument>({
      fields: [
        'title',
        'agency',
        'topicsText',
        'text',
      ],

      storeFields: [
        'id',
      ],

      searchOptions: {
        boost: {
          title: 4,
          topicsText: 3,
          agency: 2,
          text: 1,
        },

        prefix: true,

        fuzzy: 0.15,

        combineWith: 'OR',
      },
    });


  search.addAll(
    searchableDocuments,
  );


  console.info(
    `[HazardWeave RAG] Indexed ${allChunks.length} chunks from ${manifest.documents.length} documents.`,
  );


  return {
    search,
    chunks,
  };
}


async function getKnowledgeIndex():
  Promise<KnowledgeIndex> {

  if (!knowledgeIndexPromise) {
    knowledgeIndexPromise =
      buildKnowledgeIndex();
  }


  try {

    return await knowledgeIndexPromise;

  } catch (error) {

    /*
     * Allow a later request to retry if the initial
     * network request failed.
     */
    knowledgeIndexPromise = null;

    throw error;
  }
}


export async function retrieveKnowledge(
  question: string,
  topK = 5,
): Promise<RetrievedKnowledgeChunk[]> {

  const cleanQuestion =
    question.trim();


  if (!cleanQuestion) {
    return [];
  }


  const {
    search,
    chunks,
  } = await getKnowledgeIndex();


  const results =
    search.search(
      cleanQuestion,
      {
        boost: {
          title: 4,
          topicsText: 3,
          agency: 2,
          text: 1,
        },

        prefix: true,

        fuzzy: 0.15,

        combineWith: 'OR',
      },
    );


  if (
    results.length === 0
  ) {
    return [];
  }


  /*
   * Prevent extremely weak matches from being sent
   * to the LLM.
   */
  const bestScore =
    results[0].score;


  const minimumScore =
    bestScore * 0.30;


  /*
   * Important because the Tennessee plan contains
   * ~999 chunks.
   *
   * Without diversification it could occupy every
   * Top-K result.
   */
  const perDocumentCount =
    new Map<string, number>();


  const selected:
    RetrievedKnowledgeChunk[] = [];


  for (
    const result of results
  ) {

    if (
      result.score <
      minimumScore
    ) {
      break;
    }


    const chunk =
      chunks.get(
        String(result.id),
      );


    if (!chunk) {
      continue;
    }


    const count =
      perDocumentCount.get(
        chunk.docId,
      ) ?? 0;


    /*
     * Maximum two chunks from one source document.
     */
    if (count >= 2) {
      continue;
    }


    perDocumentCount.set(
      chunk.docId,
      count + 1,
    );


    selected.push({
      id: chunk.id,

      docId:
        chunk.docId,

      title:
        chunk.title,

      agency:
        chunk.agency,

      year:
        chunk.year,

      page:
        chunk.page,

      url:
        chunk.url,

      text:
        chunk.text,

      score:
        Number(
          result.score.toFixed(3),
        ),
    });


    if (
      selected.length >= topK
    ) {
      break;
    }
  }


  return selected;
}