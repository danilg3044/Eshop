CREATE TABLE users (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    email               NVARCHAR(255)  NOT NULL,
    password_hash       NVARCHAR(255)  NULL,          -- NULL for Google/Facebook accounts
    role                NVARCHAR(20)   NOT NULL,      -- USER | ADMIN
    provider            NVARCHAR(20)   NOT NULL,      -- LOCAL | GOOGLE | FACEBOOK
    provider_id         NVARCHAR(255)  NULL,
    enabled             BIT            NOT NULL DEFAULT 1,
    created_at          DATETIMEOFFSET(6) NOT NULL,
    -- profile (embedded)
    first_name          NVARCHAR(100)  NULL,
    last_name           NVARCHAR(100)  NULL,
    phone               NVARCHAR(40)   NULL,
    address_line        NVARCHAR(255)  NULL,
    city                NVARCHAR(100)  NULL,
    postal_code         NVARCHAR(20)   NULL,
    country             NVARCHAR(100)  NULL,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE products (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    sku                 NVARCHAR(50)   NOT NULL,
    name                NVARCHAR(200)  NOT NULL,
    description         NVARCHAR(2000) NULL,
    category            NVARCHAR(100)  NOT NULL,
    price               DECIMAL(12,2)  NOT NULL,
    stock               INT            NOT NULL,
    image_url           NVARCHAR(500)  NULL,
    active              BIT            NOT NULL DEFAULT 1,
    created_at          DATETIMEOFFSET(6) NOT NULL,
    CONSTRAINT uq_products_sku UNIQUE (sku),
    CONSTRAINT ck_products_price CHECK (price >= 0),
    CONSTRAINT ck_products_stock CHECK (stock >= 0)
);

CREATE TABLE orders (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id             BIGINT         NOT NULL REFERENCES users(id),
    status              NVARCHAR(20)   NOT NULL,      -- PENDING | PAID | SHIPPED | DELIVERED | CANCELLED
    total               DECIMAL(12,2)  NOT NULL,
    created_at          DATETIMEOFFSET(6) NOT NULL,
    updated_at          DATETIMEOFFSET(6) NOT NULL,
    -- shipping snapshot taken when the order is placed
    ship_name           NVARCHAR(200)  NOT NULL,
    ship_address_line   NVARCHAR(255)  NOT NULL,
    ship_city           NVARCHAR(100)  NOT NULL,
    ship_postal_code    NVARCHAR(20)   NOT NULL,
    ship_country        NVARCHAR(100)  NOT NULL
);
CREATE INDEX ix_orders_user ON orders(user_id);
CREATE INDEX ix_orders_status ON orders(status);

CREATE TABLE order_items (
    id                  BIGINT IDENTITY(1,1) PRIMARY KEY,
    order_id            BIGINT         NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id          BIGINT         NOT NULL REFERENCES products(id),
    product_name        NVARCHAR(200)  NOT NULL,      -- snapshot
    unit_price          DECIMAL(12,2)  NOT NULL,      -- snapshot
    quantity            INT            NOT NULL CHECK (quantity > 0)
);
CREATE INDEX ix_order_items_order ON order_items(order_id);
