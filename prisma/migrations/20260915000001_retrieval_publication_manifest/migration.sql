-- Existing rows deliberately remain unversioned until an explicit validated rebuild.
ALTER TABLE retrieval_doc ADD COLUMN "indexVersion" TEXT;
CREATE TABLE retrieval_index_manifest (
    language TEXT PRIMARY KEY,
    fingerprint TEXT NOT NULL,
    generation TEXT NOT NULL,
    "noteCount" INTEGER NOT NULL CHECK ("noteCount" > 0),
    config JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Server-side DB owner/service connection only; no browser-facing policies.
ALTER TABLE retrieval_index_manifest ENABLE ROW LEVEL SECURITY;
