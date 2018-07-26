SELECT *
    FROM logs
        WHERE type = 'ban_request'
            AND data->>'offender' = $1
            AND (data->>'resolved')::bool = false
