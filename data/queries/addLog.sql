INSERT INTO logs(guild_id, user_id, data, type)
    VALUES($1, $2, $3, $4)
    RETURNING log_id
