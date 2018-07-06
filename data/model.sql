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
    guild_id character varying(18) PRIMARY KEY,
    member integer NOT NULL
);
ALTER TABLE public.ages OWNER TO ffa;

CREATE TABLE public.channels (
    guild_id character varying(18) PRIMARY KEY,
    archive_id character varying(18),
    ignored_ids character varying(18)[] DEFAULT '{}'::character varying[] NOT NULL,
    log_id character varying(18),
    rules_id character varying(18)
);
ALTER TABLE public.channels OWNER TO ffa;

CREATE TABLE public.chat (
    guild_id character varying(18) PRIMARY KEY,
    decay real NOT NULL,
    delay integer NOT NULL,
    reward real NOT NULL
);
ALTER TABLE public.chat OWNER TO ffa;

CREATE TABLE public.logs (
    guild_id character varying(18) NOT NULL,
    case_number integer NOT NULL,
    data jsonb,
    epoch integer NOT NULL,
    type smallint NOT NULL,
    user_id character varying(18) NOT NULL,
    PRIMARY KEY (guild_id, case_number)
);
ALTER TABLE public.logs OWNER TO ffa;

CREATE TABLE public.moderation (
    guild_id character varying(18) PRIMARY KEY,
    auto_mute boolean NOT NULL,
    case_count integer DEFAULT 0 NOT NULL,
    max_actions smallint NOT NULL,
    mute_length integer NOT NULL
);
ALTER TABLE public.moderation OWNER TO ffa;

CREATE TABLE public.rep (
    guild_id character varying(18) PRIMARY KEY,
    decrease real NOT NULL,
    increase real NOT NULL
);
ALTER TABLE public.rep OWNER TO ffa;

CREATE TABLE public.roles (
    guild_id character varying(18) PRIMARY KEY,
    mod_id character varying(18),
    muted_id character varying(18)
);
ALTER TABLE public.roles OWNER TO ffa;

CREATE TABLE public.rules (
    guild_id character varying(18) NOT NULL,
    content character varying(512) NOT NULL,
    category character varying(32) NOT NULL,
    epoch integer NOT NULL,
    mute_length integer
);
CREATE INDEX rules_id_idx ON public.rules USING btree (guild_id);
ALTER TABLE public.rules OWNER TO ffa;

CREATE TABLE public.spam (
    guild_id character varying(18) PRIMARY KEY,
    duration integer NOT NULL,
    msg_limit smallint NOT NULL,
    mute_length integer NOT NULL,
    rep_penalty real NOT NULL
);
ALTER TABLE public.spam OWNER TO ffa;

CREATE TABLE public.top (
    guild_id character varying(18) PRIMARY KEY,
    clear smallint NOT NULL,
    mod smallint NOT NULL
);
ALTER TABLE public.top OWNER TO ffa;

CREATE TABLE public.users (
    guild_id character varying(18) NOT NULL,
    user_id character varying(18) NOT NULL,
    in_guild boolean DEFAULT true NOT NULL,
    muted boolean DEFAULT false NOT NULL,
    reputation real DEFAULT 0 NOT NULL,
    PRIMARY KEY(guild_id, user_id)
);
ALTER TABLE public.users OWNER TO ffa;
