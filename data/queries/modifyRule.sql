UPDATE rules
    SET content = $1, mute_length = $2
        WHERE (guild_id, category, time) = ($3, $4, $5)
