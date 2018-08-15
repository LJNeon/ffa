UPDATE revisions
    SET content = '<deleted>', attachment_ids = '{}'
        WHERE msg_id = ANY($1)
