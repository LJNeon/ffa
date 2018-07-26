SELECT data
    FROM logs
        WHERE type = 'ban_vote'
            AND (data->>'log_id')::int = $1
