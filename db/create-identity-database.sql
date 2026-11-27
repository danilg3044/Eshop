-- One-time setup for the authorization server (cloud/auth-server): its own database for accounts.
-- Flyway creates the tables when the auth server starts.
--   sqlcmd -S localhost -E -C -i db\create-identity-database.sql
IF DB_ID(N'eshop_identity') IS NULL CREATE DATABASE eshop_identity;
GO
