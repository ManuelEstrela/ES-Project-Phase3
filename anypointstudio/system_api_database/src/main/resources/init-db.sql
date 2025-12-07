-- Initialize H2 Database Schema
-- This script creates all necessary tables for the system_api_database

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    location_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, location_id)
);

-- Itineraries table
CREATE TABLE IF NOT EXISTS itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Itinerary locations junction table
CREATE TABLE IF NOT EXISTS itinerary_locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    itinerary_id INT NOT NULL,
    location_id INT NOT NULL,
    position INT NOT NULL,
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
);

-- Location images table
CREATE TABLE IF NOT EXISTS location_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing
INSERT INTO users (name, email, password, role) VALUES 
('João Silva', 'joao@example.com', 'password123', 'user'),
('Maria Santos', 'maria@example.com', 'password123', 'user'),
('Admin User', 'admin@example.com', 'admin123', 'admin');

INSERT INTO ratings (location_id, user_id, rating, comment) VALUES
(1, 1, 5, 'Lugar incrível!'),
(1, 2, 4, 'Muito bonito!'),
(2, 1, 5, 'Espetacular!');

INSERT INTO favorites (user_id, location_id) VALUES
(1, 1),
(1, 2),
(2, 1);

INSERT INTO itineraries (user_id, name, start_date, end_date) VALUES
(1, '3 Dias em São Miguel', '2025-12-01', '2025-12-03');

INSERT INTO itinerary_locations (itinerary_id, location_id, position) VALUES
(1, 1, 1),
(1, 2, 2),
(1, 3, 3);

INSERT INTO location_images (location_id, image_url) VALUES
(1, 'https://example.com/sete-cidades.jpg'),
(1, 'https://example.com/sete-cidades-2.jpg'),
(2, 'https://example.com/lagoa-fogo.jpg');