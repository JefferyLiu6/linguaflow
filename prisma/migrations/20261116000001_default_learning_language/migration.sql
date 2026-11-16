-- Preserve existing preferences; new settings default to English.
ALTER TABLE "UserSettings" ALTER COLUMN "language" SET DEFAULT 'en';
