-- Multi-Vendor Commerce Platform Database Schema

-- Users table (vendors + customers)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('vendor', 'customer')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category VARCHAR(100),
    stock INTEGER DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES users(id),
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 2) NOT NULL
);

-- Seed some vendors and products for demo
INSERT INTO users (name, email, password_hash, role) VALUES
('TechMart Store', 'techmart@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendor'),
('Fashion Hub', 'fashionhub@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'vendor'),
('Demo Customer', 'customer@demo.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'customer')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (vendor_id, name, description, price, category, stock, image_url) VALUES
(1, 'Wireless Headphones', 'High quality noise-cancelling wireless headphones', 2999.00, 'Electronics', 50, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'),
(1, 'Mechanical Keyboard', 'RGB Mechanical Gaming Keyboard', 4500.00, 'Electronics', 30, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400'),
(1, 'USB-C Hub', '7-in-1 USB-C Hub for MacBook', 1800.00, 'Electronics', 100, 'https://images.unsplash.com/photo-1625948515291-77b4f9e37b1c?w=400'),
(2, 'Classic White Sneakers', 'Premium leather white sneakers', 3200.00, 'Fashion', 75, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'),
(2, 'Slim Fit Jeans', 'Dark wash slim fit denim jeans', 1500.00, 'Fashion', 120, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400'),
(2, 'Casual Backpack', 'Minimalist canvas backpack 20L', 2100.00, 'Fashion', 60, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400')
ON CONFLICT DO NOTHING;
-- Note: demo password for all seeded users is "password"
