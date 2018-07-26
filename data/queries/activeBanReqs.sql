SELECT *
    FROM logs
        WHERE type = 'ban_request'
            AND (data->>'reached_court')::bool = true
            AND (data->>'resolved')::bool = false
    ORDER BY time ASC
