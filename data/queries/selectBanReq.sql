SELECT *
    FROM logs
        WHERE type = 'ban_request'
            AND user_id = $1
            AND (data->>'resolved')::bool = false
