SELECT data
    FROM logs
        WHERE type = 'ban_sign'
            AND (data->>'for')::int = $1
