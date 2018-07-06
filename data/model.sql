-- Setup queries
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;
COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';

SET default_tablespace = '';
SET default_with_oids = false;

-- Table creation queries
CREATE TABLE public.ages (
    guild_id varchar(18) PRIMARY KEY,
    member int NOT NULL
);
ALTER TABLE public.ages OWNER TO ffa;

CREATE TABLE public.channels (
    guild_id varchar(18) PRIMARY KEY,
    archive_id varchar(18),
    ignored_ids varchar(18)[] DEFAULT '{}'::varchar[] NOT NULL,
    log_id varchar(18),
    rules_id varchar(18)
);
ALTER TABLE public.channels OWNER TO ffa;

CREATE TABLE public.chat (
    guild_id varchar(18) PRIMARY KEY,
    decay real NOT NULL,
    delay int NOT NULL,
    reward real NOT NULL
);
ALTER TABLE public.chat OWNER TO ffa;

CREATE TABLE public.logs (
    guild_id varchar(18) NOT NULL,
    case_number int NOT NULL,
    data jsonb,
    epoch int NOT NULL,
    type int2 NOT NULL,
    user_id varchar(18) NOT NULL,
    PRIMARY KEY (guild_id, case_number)
);
ALTER TABLE public.logs OWNER TO ffa;

CREATE TABLE public.rep (
    guild_id varchar(18) PRIMARY KEY,
    decrease real NOT NULL,
    increase real NOT NULL
);
ALTER TABLE public.rep OWNER TO ffa;

CREATE TABLE public.roles (
    guild_id varchar(18) PRIMARY KEY,
    mod_id varchar(18),
    muted_id varchar(18)
);
ALTER TABLE public.roles OWNER TO ffa;

CREATE TABLE public.rules (
    guild_id varchar(18) NOT NULL,
    content varchar(512) NOT NULL,
    category varchar(32) NOT NULL,
    epoch int NOT NULL,
    mute_length int
);
CREATE INDEX rules_id_idx ON public.rules USING btree (guild_id);
ALTER TABLE public.rules OWNER TO ffa;

CREATE TABLE public.senate (
    guild_id varchar(18) PRIMARY KEY,
    auto_mute boolean NOT NULL,
    case_count int DEFAULT 0 NOT NULL,
    max_actions int2 NOT NULL,
    mute_length int NOT NULL
);
ALTER TABLE public.senate OWNER TO ffa;

CREATE TABLE public.spam (
    guild_id varchar(18) PRIMARY KEY,
    duration int NOT NULL,
    msg_limit int2 NOT NULL,
    rep_penalty real NOT NULL
);
ALTER TABLE public.spam OWNER TO ffa;

CREATE TABLE public.top (
    guild_id varchar(18) PRIMARY KEY,
    clear int2 NOT NULL,
    mod int2 NOT NULL
);
ALTER TABLE public.top OWNER TO ffa;

CREATE TABLE public.users (
    guild_id varchar(18) NOT NULL,
    user_id varchar(18) NOT NULL,
    in_guild boolean DEFAULT true NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    reputation real DEFAULT 0 NOT NULL,
    PRIMARY KEY(guild_id, user_id)
);
ALTER TABLE public.users OWNER TO ffa;
