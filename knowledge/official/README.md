# Verified RTI corpus

This directory contains only manually curated documents downloaded from official Government of India sources. `manifest.json` records provenance and SHA-256 hashes. The setup command rejects changed files, non-`gov.in` source URLs, and an existing vector store containing files without `source_type=official` provenance.

Provisioning is an explicit administrative operation; backend startup never downloads or uploads corpus files.

```bash
npm run knowledge:setup
```

Set `OPENAI_API_KEY` first. Set `OPENAI_RTI_VECTOR_STORE_ID` to add only missing manifest documents to an existing verified store, or leave it empty to create a new store. Copy the printed vector store ID into the backend environment after successful indexing.
