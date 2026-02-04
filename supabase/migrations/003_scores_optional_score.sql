-- Make score optional for game logs (user can record win/loss/draw without a numeric score)
ALTER TABLE scores
  ALTER COLUMN score DROP NOT NULL;
