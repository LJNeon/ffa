SELECT epoch, data
    FROM logs
        WHERE epoch > $1
            AND (type = 'mute' OR type = 'automute')
            AND user_id = $2
    ORDER BY epoch DESC LIMIT 1
