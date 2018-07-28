SELECT data
    FROM logs
        WHERE guild_id = $1
            AND type = 'ban_request'
            AND (data->'resolved')::bool = false
