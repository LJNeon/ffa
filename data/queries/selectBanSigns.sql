SELECT user_id
    FROM logs
        WHERE type = 'ban_sign'
            AND (data->'log_id')::int = $1
