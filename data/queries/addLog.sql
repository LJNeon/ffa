INSERT INTO logs(guild_id, data, type)
    VALUES($1, $2, $3)
    RETURNING log_id
