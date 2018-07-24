UPDATE attachments
    SET used = true
        WHERE used = false
            AND id = ANY($1)
