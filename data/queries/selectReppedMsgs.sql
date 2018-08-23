SELECT 1
    FROM messages
        WHERE guild_id = $1
            AND author_id = $2
            AND earned_rep = true
            AND time > $3
        LIMIT {0}
