SELECT *
    FROM logs
        WHERE guild_id = $1
            AND type = 'ban_request'
            AND time < $2
            AND data->>'reached_court' IS NULL
