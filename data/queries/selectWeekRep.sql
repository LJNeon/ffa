SELECT data
    FROM archives
        WHERE guild_id = $1
            AND user_id = $2
            AND type = '{0}'
            AND epoch > $3
