CREATE TABLE accounts (
    id              BIGINT IDENTITY(1,1) PRIMARY KEY,
    email           NVARCHAR(255)  NOT NULL,
    password_hash   NVARCHAR(255)  NULL,          -- NULL for Google/Facebook accounts
    role            NVARCHAR(20)   NOT NULL,      -- USER | ADMIN
    provider        NVARCHAR(20)   NOT NULL,      -- LOCAL | GOOGLE | FACEBOOK
    provider_id     NVARCHAR(255)  NULL,          -- the user's id at Google/Facebook
    first_name      NVARCHAR(100)  NULL,
    last_name       NVARCHAR(100)  NULL,
    enabled         BIT            NOT NULL DEFAULT 1,
    created_at      DATETIMEOFFSET(6) NOT NULL,
    CONSTRAINT uq_accounts_email UNIQUE (email)
);

-- One account per Google/Facebook identity (filtered: LOCAL accounts have no provider_id)
CREATE UNIQUE INDEX uq_accounts_provider ON accounts(provider, provider_id) WHERE provider_id IS NOT NULL;
