UPDATE revisions
    SET content = '<deleted>', attachment_ids = {}
        WHERE author_id = $1
