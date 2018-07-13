INSERT INTO attachments(id, name, epoch, file, hash)
    VALUES($1, $2, $3, $4, $5)
ON CONFLICT (id)
    DO NOTHING
