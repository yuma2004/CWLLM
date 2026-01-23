-- CreateIndex
CREATE INDEX "messages_labels_idx" ON "messages" USING GIN ("labels");
