SELECT data
    FROM logs
        WHERE guild_id = $1
            AND data->>'user_id' = $2
            AND type = '{0}'
            AND time > $3
