SELECT author_id, channel_id, guild_id, epoch
    FROM messages
        WHERE (guild_id, id) = ($1, $2)
