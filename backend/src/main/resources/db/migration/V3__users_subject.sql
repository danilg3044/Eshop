-- Accounts moved to cloud/auth-server. A shop user is now linked to its account by the token's "sub" claim;
-- the password and the Google/Facebook id are no longer stored here.
ALTER TABLE users ADD subject NVARCHAR(64) NULL;
GO

-- Unique, but several legacy rows may still be NULL (filtered index)
CREATE UNIQUE INDEX uq_users_subject ON users(subject) WHERE subject IS NOT NULL;
GO

ALTER TABLE users DROP COLUMN password_hash, provider_id;
GO
