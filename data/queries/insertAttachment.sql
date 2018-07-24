INSERT INTO attachments(id, name, file, hash)
    VALUES($1, $2, decode($4::text, 'hex'), $5)
ON CONFLICT (id)
    DO NOTHING
