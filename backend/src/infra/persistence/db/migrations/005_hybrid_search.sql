ALTER TABLE chunks ADD COLUMN IF NOT EXISTS ts_content tsvector;

UPDATE chunks SET ts_content = to_tsvector('simple', content) WHERE ts_content IS NULL;

CREATE OR REPLACE FUNCTION chunks_ts_content_trigger() RETURNS trigger AS $$
BEGIN
  NEW.ts_content := to_tsvector('simple', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS chunks_ts_content_update ON chunks;
CREATE TRIGGER chunks_ts_content_update
  BEFORE INSERT OR UPDATE OF content ON chunks
  FOR EACH ROW EXECUTE FUNCTION chunks_ts_content_trigger();

CREATE INDEX IF NOT EXISTS chunks_ts_content_idx ON chunks USING GIN(ts_content);
