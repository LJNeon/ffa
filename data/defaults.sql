INSERT INTO ages(guild_id, member)
    VALUES('default', 172800);

INSERT INTO channels(guild_id)
    VALUES('default');

INSERT INTO chat(guild_id, decay, delay, reward)
    VALUES('default', 0.99, 30, 0.025);

INSERT INTO rep(guild_id, decrease, increase)
    VALUES('default', 1, 1);

INSERT INTO roles(guild_id)
    VALUES('default');

INSERT INTO senate(guild_id, auto_mute, max_actions, mute_length)
    VALUES('default', true, 15, 21600);

INSERT INTO spam(guild_id, duration, msg_limit, rep_penalty)
    VALUES('default', 4, 5, 2);

INSERT INTO top(guild_id, clear, mod)
    VALUES('default', 10, 20);
