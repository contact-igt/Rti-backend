import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';

const documentSchema = z.object({
  filename: z.string().trim().min(1).max(255).refine((value) => !/[\\/]/.test(value)),
  title: z.string().trim().min(1).max(200),
  organization: z.string().trim().min(1).max(200),
  sourceUrl: z.string().url().refine(isOfficialGovernmentUrl),
  jurisdiction: z.enum(['national', 'central', 'state']),
  documentType: z.string().trim().min(1).max(64),
  sha256: z.string().regex(/^[A-Fa-f0-9]{64}$/)
});

const manifestSchema = z.object({
  documents: z.array(documentSchema).min(1).max(20)
});

type ManifestDocument = z.infer<typeof documentSchema>;

async function setup(): Promise<void> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required for RTI knowledge setup.');
  }

  const corpusDirectory = path.resolve(process.cwd(), 'knowledge', 'official');
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(corpusDirectory, 'manifest.json'), 'utf8'))
  );
  await verifyLocalCorpus(corpusDirectory, manifest.documents);

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY, maxRetries: 1, timeout: 30_000 });
  const vectorStore = env.OPENAI_RTI_VECTOR_STORE_ID
    ? await client.vectorStores.retrieve(env.OPENAI_RTI_VECTOR_STORE_ID)
    : await client.vectorStores.create({ name: 'RTI Saathi Verified Official RTI Corpus' });

  const existingHashes = new Set<string>();
  for await (const file of client.vectorStores.files.list(vectorStore.id, { limit: 100 })) {
    if (file.attributes?.source_type !== 'official') {
      throw new Error(
        `Vector store ${vectorStore.id} contains file ${file.id} without verified official provenance.`
      );
    }
    const hash = file.attributes.sha256;
    if (typeof hash === 'string') {
      existingHashes.add(hash.toUpperCase());
    }
  }

  const pending = manifest.documents.filter(
    (document) => !existingHashes.has(document.sha256.toUpperCase())
  );
  const uploaded: Array<{ file_id: string; attributes: Record<string, string> }> = [];
  for (const document of pending) {
    const file = await client.files.create({
      file: createReadStream(path.join(corpusDirectory, document.filename)),
      purpose: 'assistants'
    });
    uploaded.push({ file_id: file.id, attributes: provenanceAttributes(document) });
  }

  if (uploaded.length > 0) {
    const batch = await client.vectorStores.fileBatches.createAndPoll(vectorStore.id, {
      files: uploaded
    });
    if (batch.status !== 'completed' || batch.file_counts.failed > 0) {
      throw new Error(
        `RTI knowledge indexing did not complete successfully (${batch.status}; ${batch.file_counts.failed} failed).`
      );
    }
  }

  console.log(
    JSON.stringify({
      vectorStoreId: vectorStore.id,
      verifiedDocuments: manifest.documents.length,
      newlyIndexedDocuments: uploaded.length,
      status: 'completed'
    })
  );
}

async function verifyLocalCorpus(
  corpusDirectory: string,
  documents: ManifestDocument[]
): Promise<void> {
  for (const document of documents) {
    const content = await readFile(path.join(corpusDirectory, document.filename));
    const actualHash = createHash('sha256').update(content).digest('hex').toUpperCase();
    if (actualHash !== document.sha256.toUpperCase()) {
      throw new Error(`SHA-256 verification failed for ${document.filename}.`);
    }
  }
}

function provenanceAttributes(document: ManifestDocument): Record<string, string> {
  return {
    title: document.title,
    organization: document.organization,
    source_url: document.sourceUrl,
    jurisdiction: document.jurisdiction,
    document_type: document.documentType,
    source_type: 'official',
    sha256: document.sha256.toUpperCase()
  };
}

function isOfficialGovernmentUrl(value: string): boolean {
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname === 'gov.in' || hostname.endsWith('.gov.in');
}

void setup().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'RTI knowledge setup failed.');
  process.exitCode = 1;
});
