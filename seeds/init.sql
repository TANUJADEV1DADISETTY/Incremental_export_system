-- Initialize Schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS watermarks (
    id SERIAL PRIMARY KEY,
    consumer_id VARCHAR(255) NOT NULL UNIQUE,
    last_exported_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Recommended Index for Incremental/Delta queries
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at);

-- Idempotent generation of 100,000+ users
DO $$
DECLARE
    user_count INT;
    i INT;
    batch_size INT := 10000;
    current_time TIMESTAMP WITH TIME ZONE := NOW();
    rnd_created TIMESTAMP WITH TIME ZONE;
    rnd_updated TIMESTAMP WITH TIME ZONE;
    is_del BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    
    IF user_count < 100000 THEN
        RAISE NOTICE 'Seeding the database. This might take a few moments...';
        
        -- Insert roughly 100,000 users in batches
        FOR j IN 1..(100000/batch_size) LOOP
            BEGIN
                -- using INSERT syntax for bulk, but since we need random values per row easily, use generate_series
                INSERT INTO users (name, email, created_at, updated_at, is_deleted)
                SELECT 
                    'User ' || seq_num,
                    'user_' || seq_num || '_' || EXTRACT(EPOCH FROM NOW()) || '@example.com',
                    NOW() - (random() * interval '7 days'), -- created sometime in the last 7 days
                    NULL, -- Temp
                    FALSE
                FROM generate_series((j-1)*batch_size + 1, j*batch_size) as seq_num;
            EXCEPTION WHEN OTHERS THEN
                -- catch unique constraint violations or others if ran concurrently
            END;
        END LOOP;
        
        -- Update the updated_at to be >= created_at
        UPDATE users SET updated_at = created_at + (random() * (NOW() - created_at));
        
        -- Mark at least 1% (~1000) users as soft-deleted
        -- We will select random IDs and update them
        UPDATE users SET is_deleted = TRUE, updated_at = NOW() 
        WHERE id IN (
            SELECT id FROM users ORDER BY random() LIMIT 1500
        );

        RAISE NOTICE 'Database seeding completed successfully.';
    ELSE
        RAISE NOTICE 'Database already seeded with % users.', user_count;
    END IF;
END $$;
