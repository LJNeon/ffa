INSERT INTO users(guild_id, user_id, reputation)
    VALUES($1, $2, $3)
ON CONFLICT (guild_id, user_id)
    DO UPDATE
        SET reputation = users.reputation + $3
            WHERE (users.guild_id, users.user_id) = ($1, $2)
RETURNING reputation;
