SELECT data, log_id
    FROM logs
        WHERE data IS NOT NULL
            AND data->'senate_id' IS NOT NULL
            AND (data->'senate_id')::text = $1
            AND data->'evidence' IS NOT NULL
