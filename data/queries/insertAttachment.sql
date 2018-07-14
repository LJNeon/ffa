INSERT INTO attachments(id, name, epoch, file, hash)
    VALUES($1, $2, $3, decode($4::text, 'hex'), $5)
ON CONFLICT (id)
    DO NOTHING
