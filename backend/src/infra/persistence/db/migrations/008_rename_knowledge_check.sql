DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'knowledge_check'
  ) THEN
    ALTER TABLE messages RENAME COLUMN knowledge_check TO response_grounding;
  END IF;
END $$;
