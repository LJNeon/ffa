CREATE TABLE public.ages (
    guild_id varchar(20) PRIMARY KEY,
    ban_req int NOT NULL CHECK (ban_req > 0) DEFAULT 172800,
    member int NOT NULL CHECK (member > 0) DEFAULT 172800
);
ALTER TABLE public.ages OWNER TO {0};

CREATE TABLE public.channels (
    guild_id varchar(20) PRIMARY KEY,
    ignored_ids varchar(20)[] DEFAULT '{}'::varchar[] NOT NULL,
    log_id varchar(20),
    rules_id varchar(20)
);
ALTER TABLE public.channels OWNER TO {0};

CREATE TABLE public.chat (
    guild_id varchar(20) PRIMARY KEY,
    decay real NOT NULL CHECK (decay > 0) DEFAULT 0.99,
    delay int NOT NULL CHECK (delay > 0) DEFAULT 30,
    reward real NOT NULL CHECK (reward > 0) DEFAULT 0.025
);
ALTER TABLE public.chat OWNER TO {0};

CREATE TABLE public.info (
    version int NOT NULL
);
ALTER TABLE public.info OWNER TO {0};

CREATE TYPE logtype AS ENUM ('mute', 'unmute', 'auto_mute', 'auto_unmute',
        'clear', 'member_ban', 'rep', 'unrep', 'ban_request', 'ban_sign',
        'ban_vote', 'resign', 'court_change');
CREATE TABLE public.logs (
    guild_id varchar(20) NOT NULL,
    log_id serial,
    data jsonb,
    epoch int NOT NULL CHECK (epoch > 0),
    type logtype NOT NULL,
    user_id varchar(20) NOT NULL
);
ALTER TABLE public.logs OWNER TO {0};

CREATE TABLE public.messages (
    id varchar(20) NOT NULL,
    author_id varchar(20) NOT NULL,
    content varchar(2000) NOT NULL,
    epoch int NOT NULL CHECK (epoch > 0),
    filenames text[] NOT NULL,
    files bytea[] NOT NULL,
    used bool NOT NULL DEFAULT false
);
ALTER TABLE public.messages OWNER TO {0};

CREATE TABLE public.rep (
    guild_id varchar(20) PRIMARY KEY,
    decrease real NOT NULL CHECK (decrease > 0) DEFAULT 1,
    increase real NOT NULL CHECK (increase > 0) DEFAULT 1,
    rep_reward real NOT NULL CHECK (rep_reward > 0) DEFAULT 0.25
);
ALTER TABLE public.rep OWNER TO {0};

CREATE TABLE public.roles (
    guild_id varchar(20) PRIMARY KEY,
    court_id varchar(20),
    mod_id varchar(20),
    muted_id varchar(20)
);
ALTER TABLE public.roles OWNER TO {0};

CREATE TABLE public.rules (
    guild_id varchar(20) NOT NULL,
    content varchar(512) NOT NULL,
    category varchar(32) NOT NULL,
    epoch int NOT NULL CHECK (epoch > 0),
    mute_length int
);
CREATE INDEX rules_id_idx ON public.rules USING btree (guild_id);
ALTER TABLE public.rules OWNER TO {0};

CREATE TABLE public.senate (
    guild_id varchar(20) PRIMARY KEY,
    auto_mute boolean NOT NULL DEFAULT true,
    ban_sigs smallint NOT NULL CHECK (ban_signed > 0) DEFAULT 7,
    case_count int NOT NULL DEFAULT 0,
    max_actions smallint NOT NULL CHECK (max_actions > 0) DEFAULT 15,
    mute_length int NOT NULL CHECK (mute_length > 0) DEFAULT 21600
);
ALTER TABLE public.senate OWNER TO {0};

CREATE TABLE public.spam (
    guild_id varchar(20) PRIMARY KEY,
    duration int NOT NULL CHECK (duration > 0) DEFAULT 4,
    msg_limit smallint NOT NULL CHECK (msg_limit > 0) DEFAULT 5,
    rep_penalty real NOT NULL CHECK (rep_penalty > 0) DEFAULT 2
);
ALTER TABLE public.spam OWNER TO {0};

CREATE TABLE public.top (
    guild_id varchar(20) PRIMARY KEY,
    clear smallint NOT NULL CHECK (clear > 0) DEFAULT 10,
    court smallint NOT NULL CHECK (court > 0) DEFAULT 5,
    mod smallint NOT NULL CHECK (mod > 0) DEFAULT 20
);
ALTER TABLE public.top OWNER TO {0};

CREATE TABLE public.users (
    guild_id varchar(20) NOT NULL,
    user_id varchar(20) NOT NULL,
    in_guild boolean DEFAULT true NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    reputation real DEFAULT 0 CHECK (reputation >= 0) NOT NULL,
    PRIMARY KEY(guild_id, user_id)
);
ALTER TABLE public.users OWNER TO {0};
