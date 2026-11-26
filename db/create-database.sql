-- One-time setup of the EShop database on a local SQL Server.
-- Run as a Windows user who may create databases:
--     sqlcmd -S localhost -E -C -i db\create-database.sql
--
-- Only creates the empty database. Tables and sample products are created by Flyway
-- (backend/src/main/resources/db/migration) the first time the backend starts.

IF DB_ID(N'eshop') IS NULL
BEGIN
    CREATE DATABASE eshop;
    PRINT 'Created database eshop';
END
ELSE
    PRINT 'Database eshop already exists';
GO

-- The backend connects with Windows authentication (integratedSecurity=true) as the user running it,
-- which becomes the database owner here. No SQL login or server-wide setting is needed.
