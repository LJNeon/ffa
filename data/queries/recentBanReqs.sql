SELECT *
    FROM logs
        WHERE type = 'ban_request'
            AND (data->>'resolved')::bool = true
        ORDER BY time DESC LIMIT 10
