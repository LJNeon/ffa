SELECT *
    FROM logs
        WHERE time > $1
            AND (type = 'mute' OR type = 'auto_mute')
            AND data->>'user_id' = $2
    ORDER BY time DESC LIMIT 1
