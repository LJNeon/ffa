SELECT time, data
    FROM logs
        WHERE time > $1
            AND (type = 'mute' OR type = 'automute')
            AND user_id = $2
    ORDER BY time DESC LIMIT 1
