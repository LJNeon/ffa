SELECT *
    FROM logs
        WHERE type = 'ban_request'
            AND epoch > $1
            AND user_id = $2
            AND (data->'reached_court' IS NULL
                OR (data->'reached_court')::bool = true)
