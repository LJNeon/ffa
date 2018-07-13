INSERT INTO messages(id, author_id, channel_id, guild_id, epoch)
    VALUES($1, $2, $3, $4, $5)
ON CONFLICT (id)
    DO NOTHING
