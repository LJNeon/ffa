INSERT INTO logs(guild_id, user_id, data, epoch, type)
    VALUES($1, $2, $3, $4, $5)
    RETURNING archive_id
