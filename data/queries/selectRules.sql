SELECT category, content, time, mute_length
    FROM rules
        WHERE guild_id = $1
    ORDER BY time ASC
