SELECT *
    FROM messages
        WHERE (guild_id, author_id, earned_rep) = ($1, $2, true)
    ORDER BY time DESC LIMIT {0}
