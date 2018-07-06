SELECT epoch, data
    FROM logs
        WHERE epoch > $1
            AND (type = 0 OR type = 2)
            AND user_id = $2
    ORDER BY epoch DESC LIMIT 1
