-- Add GIN indexes for message search and labels
CREATE INDEX "messages_body_fts_idx"
ON "messages"
USING GIN (to_tsvector('simple', "body"));

CREATE INDEX "messages_labels_idx"
ON "messages"
USING GIN ("labels");
