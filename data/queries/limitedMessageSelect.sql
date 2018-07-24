SELECT author_id, channel_id, guild_id, time
    FROM messages
        WHERE (guild_id, id) = ($1, $2)
