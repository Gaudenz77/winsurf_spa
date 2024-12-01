-- First create the categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#808080',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Now alter the tasks table

-- 1. First, drop existing foreign key constraints if any
ALTER TABLE tasks DROP FOREIGN KEY IF EXISTS tasks_ibfk_1;

-- 2. Rename user_id to created_by
ALTER TABLE tasks CHANGE COLUMN user_id created_by INT NOT NULL;

-- 3. Add new columns
ALTER TABLE tasks
    ADD COLUMN status ENUM('pending', 'in_progress', 'completed', 'archived') DEFAULT 'pending' AFTER description,
    ADD COLUMN category_id INT AFTER priority,
    ADD COLUMN due_date DATETIME AFTER category_id,
    ADD COLUMN assigned_to INT AFTER created_by,
    ADD COLUMN reminder_date DATETIME AFTER updated_at;

-- 4. Modify existing columns
ALTER TABLE tasks MODIFY COLUMN priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium';

-- 5. Drop the completed column (since we now use status)
ALTER TABLE tasks DROP COLUMN completed;

-- 6. Add foreign key constraints
ALTER TABLE tasks
    ADD CONSTRAINT fk_tasks_created_by FOREIGN KEY (created_by) REFERENCES users(id),
    ADD CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id),
    ADD CONSTRAINT fk_tasks_category FOREIGN KEY (category_id) REFERENCES categories(id);

-- 7. Update existing tasks to have a proper status
UPDATE tasks SET status = 'completed' WHERE completed = 1;
UPDATE tasks SET status = 'pending' WHERE completed = 0;
