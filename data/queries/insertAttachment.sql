INSERT INTO attachments(id, name, file, hash)
    VALUES($1, $2, decode($3::text, 'hex'), $4)
ON CONFLICT (id)
    DO NOTHING
