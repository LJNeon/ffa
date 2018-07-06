CREATE TABLE public.ages (
    guild_id varchar(18) PRIMARY KEY,
    ban_request int NOT NULL DEFAULT 172800,
    member int NOT NULL DEFAULT 172800
);
ALTER TABLE public.ages OWNER TO {0};

CREATE TYPE archivetype AS ENUM('rep', 'unrep');
CREATE TABLE archives (
    archive_id serial,
    guild_id varchar(18) NOT NULL,
    data jsonb,
    epoch int NOT NULL,
    type archivetype NOT NULL,
    user_id varchar(18) NOT NULL
);
ALTER TABLE public.archives OWNER TO {0};

CREATE TABLE public.channels (
    guild_id varchar(18) PRIMARY KEY,
    archive_id varchar(18),
    ignored_ids varchar(18)[] DEFAULT '{}'::varchar[] NOT NULL,
    log_id varchar(18),
    rules_id varchar(18)
);
ALTER TABLE public.channels OWNER TO {0};

CREATE TABLE public.chat (
    guild_id varchar(18) PRIMARY KEY,
    decay real NOT NULL DEFAULT 0.99,
    delay int NOT NULL DEFAULT 30,
    reward real NOT NULL DEFAULT 0.025
);
ALTER TABLE public.chat OWNER TO {0};

CREATE TABLE public.info (
    version int NOT NULL
);
ALTER TABLE public.info OWNER TO {0};

CREATE TYPE logtype AS ENUM ('mute', 'unmute', 'automute', 'autounmute', 'clear');
CREATE TABLE public.logs (
    guild_id varchar(18) NOT NULL,
    case_number int NOT NULL,
    data jsonb,
    epoch int NOT NULL,
    type logtype NOT NULL,
    user_id varchar(18) NOT NULL,
    PRIMARY KEY (guild_id, case_number)
);
ALTER TABLE public.logs OWNER TO {0};

CREATE TABLE public.rep (
    guild_id varchar(18) PRIMARY KEY,
    decrease real NOT NULL DEFAULT 1,
    increase real NOT NULL DEFAULT 1
);
ALTER TABLE public.rep OWNER TO {0};

CREATE TABLE public.roles (
    guild_id varchar(18) PRIMARY KEY,
    court_id varchar(18),
    mod_id varchar(18),
    muted_id varchar(18)
);
ALTER TABLE public.roles OWNER TO {0};

CREATE TABLE public.rules (
    guild_id varchar(18) NOT NULL,
    content varchar(512) NOT NULL,
    category varchar(32) NOT NULL,
    epoch int NOT NULL,
    mute_length int
);
CREATE INDEX rules_id_idx ON public.rules USING btree (guild_id);
ALTER TABLE public.rules OWNER TO {0};

CREATE TABLE public.senate (
    guild_id varchar(18) PRIMARY KEY,
    auto_mute boolean NOT NULL DEFAULT true,
    ban_signed smallint NOT NULL DEFAULT 7,
    case_count int NOT NULL DEFAULT 0,
    max_actions smallint NOT NULL DEFAULT 15,
    mute_length int NOT NULL DEFAULT 21600
);
ALTER TABLE public.senate OWNER TO {0};

CREATE TABLE public.spam (
    guild_id varchar(18) PRIMARY KEY,
    duration int NOT NULL DEFAULT 4,
    msg_limit smallint NOT NULL DEFAULT 5,
    rep_penalty real NOT NULL DEFAULT 2
);
ALTER TABLE public.spam OWNER TO {0};

CREATE TABLE public.top (
    guild_id varchar(18) PRIMARY KEY,
    clear smallint NOT NULL DEFAULT 10,
    court smallint NOT NULL DEFAULT 5,
    mod smallint NOT NULL DEFAULT 20
);
ALTER TABLE public.top OWNER TO {0};

CREATE TABLE public.users (
    guild_id varchar(18) NOT NULL,
    user_id varchar(18) NOT NULL,
    in_guild boolean DEFAULT true NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    reputation real DEFAULT 0 NOT NULL,
    PRIMARY KEY(guild_id, user_id)
);
ALTER TABLE public.users OWNER TO {0};
