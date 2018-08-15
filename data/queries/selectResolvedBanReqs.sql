SELECT *
    FROM logs
        WHERE guild_id = $1
            AND type = 'ban_request'
            AND data->>'reached_court' IS NOT NULL
            AND (data->>'resolved')::bool = false
