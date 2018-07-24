SELECT *
    FROM logs
        WHERE type = 'ban_request'
            AND (data->>'resolved')::bool = false
    ORDER BY time ASC
