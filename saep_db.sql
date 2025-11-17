-- saep_db.sql
-- Banco: saep_db (SQLite)
PRAGMA foreign_keys = ON;

-- Tabelas
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  role TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  qty INTEGER NOT NULL DEFAULT 0,
  min_qty INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS product_features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  feature TEXT NOT NULL,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('entrada','saida')),
  qty INTEGER NOT NULL,
  date TEXT NOT NULL,
  user_id TEXT,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- População: users (>=3)
INSERT OR IGNORE INTO users (id,name,email,password,role) VALUES
('u_admin','Administrador','admin@saep.com','admin123','admin'),
('u_jose','José Almeida','jose@almox.com','jose123','user'),
('u_maria','Maria Silva','maria@almox.com','maria123','user');

-- População: products (>=3)
INSERT OR IGNORE INTO products (id,name,brand,model,qty,min_qty) VALUES
('p_martelo_16','Martelo de Unha 16 oz MASTER','MASTER','16oz-R',12,3),
('p_chave_fenda_3','Chave de Fenda 3mm Isolada','PROFIX','CF-3I',30,5),
('p_furadeira_500','Furadeira 500W Industrial','FORCE','F500',5,2);

-- População: product_features
INSERT INTO product_features (product_id,feature) VALUES
('p_martelo_16','cabo tubular'),
('p_martelo_16','16 oz'),
('p_martelo_16','perfil reto'),

('p_chave_fenda_3','isolada'),
('p_chave_fenda_3','ponta imantada'),
('p_chave_fenda_3','3mm'),

('p_furadeira_500','500W'),
('p_furadeira_500','220V'),
('p_furadeira_500','peso 3.2kg');

-- População: stock_movements (>=3)
INSERT OR IGNORE INTO stock_movements (id,product_id,type,qty,date,user_id) VALUES
('m1','p_martelo_16','entrada',10,'2025-11-01','u_admin'),
('m2','p_chave_fenda_3','entrada',30,'2025-10-25','u_jose'),
('m3','p_furadeira_500','entrada',5,'2025-09-10','u_maria');

-- índices úteis
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
