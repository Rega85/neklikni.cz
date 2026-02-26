-- Idempotency table for Stripe webhook events
-- Prevents double-processing when Stripe retries a delivery

CREATE TABLE IF NOT EXISTS processed_events (
  event_id    text        PRIMARY KEY,
  processed_at timestamptz DEFAULT now()
);

-- Index není potřeba (PRIMARY KEY je B-tree index)
-- Automatické mazání starých záznamů po 90 dnech (volitelné, šetří místo)
CREATE INDEX IF NOT EXISTS processed_events_processed_at_idx
  ON processed_events (processed_at);
