-- Add view_count tracking to presentations
ALTER TABLE presentations ADD COLUMN view_count INTEGER NOT NULL DEFAULT 0;
