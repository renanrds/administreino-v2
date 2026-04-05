--
-- PostgreSQL database dump
--

\restrict QbcG7YXgbAm2ZSYf6scoe81eYHOX8QHuVRP2k2MpDqFDkw3OCRZB865YCV7MUX8

-- Dumped from database version 17.9 (Debian 17.9-1.pgdg13+1)
-- Dumped by pg_dump version 17.9 (Debian 17.9-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.workouts_workoutsession DROP CONSTRAINT IF EXISTS workouts_workoutsession_user_id_e7e6fc7d_fk_users_user_id;
ALTER TABLE IF EXISTS ONLY public.workouts_workoutsession DROP CONSTRAINT IF EXISTS workouts_workoutsess_workout_id_20243bd8_fk_workouts_;
ALTER TABLE IF EXISTS ONLY public.workouts_workout DROP CONSTRAINT IF EXISTS workouts_workout_user_id_973b8a96_fk_users_user_id;
ALTER TABLE IF EXISTS ONLY public.workouts_exerciselog DROP CONSTRAINT IF EXISTS workouts_exerciselog_session_id_b5738f9b_fk_workouts_;
ALTER TABLE IF EXISTS ONLY public.workouts_exerciselog DROP CONSTRAINT IF EXISTS workouts_exerciselog_exercise_id_cab840c9_fk_workouts_;
ALTER TABLE IF EXISTS ONLY public.workouts_exercise DROP CONSTRAINT IF EXISTS workouts_exercise_workout_id_24d397ed_fk_workouts_workout_id;
ALTER TABLE IF EXISTS ONLY public.users_user_user_permissions DROP CONSTRAINT IF EXISTS users_user_user_permissions_user_id_20aca447_fk_users_user_id;
ALTER TABLE IF EXISTS ONLY public.users_user_user_permissions DROP CONSTRAINT IF EXISTS users_user_user_perm_permission_id_0b93982e_fk_auth_perm;
ALTER TABLE IF EXISTS ONLY public.users_user_groups DROP CONSTRAINT IF EXISTS users_user_groups_user_id_5f6f5a90_fk_users_user_id;
ALTER TABLE IF EXISTS ONLY public.users_user_groups DROP CONSTRAINT IF EXISTS users_user_groups_group_id_9afc8d0e_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.users_gymlocation DROP CONSTRAINT IF EXISTS users_gymlocation_user_id_03033a65_fk_users_user_id;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_user_id_c564eba6_fk_users_user_id;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_content_type_id_c4bce8eb_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_2f476e4b_fk_django_co;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_b120cbf9_fk_auth_group_id;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissio_permission_id_84c5c92e_fk_auth_perm;
DROP INDEX IF EXISTS public.workouts_workoutsession_workout_id_20243bd8;
DROP INDEX IF EXISTS public.workouts_workoutsession_user_id_e7e6fc7d;
DROP INDEX IF EXISTS public.workouts_workout_user_id_973b8a96;
DROP INDEX IF EXISTS public.workouts_exerciselog_session_id_b5738f9b;
DROP INDEX IF EXISTS public.workouts_exerciselog_exercise_id_cab840c9;
DROP INDEX IF EXISTS public.workouts_exercise_workout_id_24d397ed;
DROP INDEX IF EXISTS public.users_user_username_06e46fe6_like;
DROP INDEX IF EXISTS public.users_user_user_permissions_user_id_20aca447;
DROP INDEX IF EXISTS public.users_user_user_permissions_permission_id_0b93982e;
DROP INDEX IF EXISTS public.users_user_groups_user_id_5f6f5a90;
DROP INDEX IF EXISTS public.users_user_groups_group_id_9afc8d0e;
DROP INDEX IF EXISTS public.users_user_email_243f6e77_like;
DROP INDEX IF EXISTS public.users_gymlocation_user_id_03033a65;
DROP INDEX IF EXISTS public.django_session_session_key_c0390e0f_like;
DROP INDEX IF EXISTS public.django_session_expire_date_a5c62663;
DROP INDEX IF EXISTS public.django_admin_log_user_id_c564eba6;
DROP INDEX IF EXISTS public.django_admin_log_content_type_id_c4bce8eb;
DROP INDEX IF EXISTS public.auth_permission_content_type_id_2f476e4b;
DROP INDEX IF EXISTS public.auth_group_permissions_permission_id_84c5c92e;
DROP INDEX IF EXISTS public.auth_group_permissions_group_id_b120cbf9;
DROP INDEX IF EXISTS public.auth_group_name_a6ea08ec_like;
ALTER TABLE IF EXISTS ONLY public.workouts_workoutsession DROP CONSTRAINT IF EXISTS workouts_workoutsession_pkey;
ALTER TABLE IF EXISTS ONLY public.workouts_workout DROP CONSTRAINT IF EXISTS workouts_workout_pkey;
ALTER TABLE IF EXISTS ONLY public.workouts_exerciselog DROP CONSTRAINT IF EXISTS workouts_exerciselog_session_id_exercise_id_s_4624ea12_uniq;
ALTER TABLE IF EXISTS ONLY public.workouts_exerciselog DROP CONSTRAINT IF EXISTS workouts_exerciselog_pkey;
ALTER TABLE IF EXISTS ONLY public.workouts_exercise DROP CONSTRAINT IF EXISTS workouts_exercise_pkey;
ALTER TABLE IF EXISTS ONLY public.users_user DROP CONSTRAINT IF EXISTS users_user_username_key;
ALTER TABLE IF EXISTS ONLY public.users_user_user_permissions DROP CONSTRAINT IF EXISTS users_user_user_permissions_user_id_permission_id_43338c45_uniq;
ALTER TABLE IF EXISTS ONLY public.users_user_user_permissions DROP CONSTRAINT IF EXISTS users_user_user_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.users_user DROP CONSTRAINT IF EXISTS users_user_pkey;
ALTER TABLE IF EXISTS ONLY public.users_user_groups DROP CONSTRAINT IF EXISTS users_user_groups_user_id_group_id_b88eab82_uniq;
ALTER TABLE IF EXISTS ONLY public.users_user_groups DROP CONSTRAINT IF EXISTS users_user_groups_pkey;
ALTER TABLE IF EXISTS ONLY public.users_user DROP CONSTRAINT IF EXISTS users_user_email_key;
ALTER TABLE IF EXISTS ONLY public.users_gymlocation DROP CONSTRAINT IF EXISTS users_gymlocation_user_id_name_efa4bc43_uniq;
ALTER TABLE IF EXISTS ONLY public.users_gymlocation DROP CONSTRAINT IF EXISTS users_gymlocation_pkey;
ALTER TABLE IF EXISTS ONLY public.django_session DROP CONSTRAINT IF EXISTS django_session_pkey;
ALTER TABLE IF EXISTS ONLY public.django_migrations DROP CONSTRAINT IF EXISTS django_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_pkey;
ALTER TABLE IF EXISTS ONLY public.django_content_type DROP CONSTRAINT IF EXISTS django_content_type_app_label_model_76bd3d3b_uniq;
ALTER TABLE IF EXISTS ONLY public.django_admin_log DROP CONSTRAINT IF EXISTS django_admin_log_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_permission DROP CONSTRAINT IF EXISTS auth_permission_content_type_id_codename_01ab375a_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.auth_group_permissions DROP CONSTRAINT IF EXISTS auth_group_permissions_group_id_permission_id_0cd325b0_uniq;
ALTER TABLE IF EXISTS ONLY public.auth_group DROP CONSTRAINT IF EXISTS auth_group_name_key;
DROP TABLE IF EXISTS public.workouts_workoutsession;
DROP TABLE IF EXISTS public.workouts_workout;
DROP TABLE IF EXISTS public.workouts_exerciselog;
DROP TABLE IF EXISTS public.workouts_exercise;
DROP TABLE IF EXISTS public.users_user_user_permissions;
DROP TABLE IF EXISTS public.users_user_groups;
DROP TABLE IF EXISTS public.users_user;
DROP TABLE IF EXISTS public.users_gymlocation;
DROP TABLE IF EXISTS public.django_session;
DROP TABLE IF EXISTS public.django_migrations;
DROP TABLE IF EXISTS public.django_content_type;
DROP TABLE IF EXISTS public.django_admin_log;
DROP TABLE IF EXISTS public.auth_permission;
DROP TABLE IF EXISTS public.auth_group_permissions;
DROP TABLE IF EXISTS public.auth_group;
SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: auth_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group (
    id integer NOT NULL,
    name character varying(150) NOT NULL
);


--
-- Name: auth_group_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_group_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_group_permissions (
    id bigint NOT NULL,
    group_id integer NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_group_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_group_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: auth_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_permission (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    content_type_id integer NOT NULL,
    codename character varying(100) NOT NULL
);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auth_permission ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.auth_permission_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_admin_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_admin_log (
    id integer NOT NULL,
    action_time timestamp with time zone NOT NULL,
    object_id text,
    object_repr character varying(200) NOT NULL,
    action_flag smallint NOT NULL,
    change_message text NOT NULL,
    content_type_id integer,
    user_id bigint NOT NULL,
    CONSTRAINT django_admin_log_action_flag_check CHECK ((action_flag >= 0))
);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_admin_log ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_admin_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_content_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_content_type (
    id integer NOT NULL,
    app_label character varying(100) NOT NULL,
    model character varying(100) NOT NULL
);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_content_type ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_content_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_migrations (
    id bigint NOT NULL,
    app character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    applied timestamp with time zone NOT NULL
);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.django_migrations ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.django_migrations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: django_session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.django_session (
    session_key character varying(40) NOT NULL,
    session_data text NOT NULL,
    expire_date timestamp with time zone NOT NULL
);


--
-- Name: users_gymlocation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_gymlocation (
    id bigint NOT NULL,
    name character varying(200) NOT NULL,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    is_primary boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id bigint NOT NULL
);


--
-- Name: users_gymlocation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users_gymlocation ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_gymlocation_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_user (
    id bigint NOT NULL,
    password character varying(128) NOT NULL,
    last_login timestamp with time zone,
    is_superuser boolean NOT NULL,
    username character varying(150) NOT NULL,
    first_name character varying(150) NOT NULL,
    last_name character varying(150) NOT NULL,
    is_staff boolean NOT NULL,
    is_active boolean NOT NULL,
    date_joined timestamp with time zone NOT NULL,
    email character varying(254) NOT NULL,
    avatar character varying(100),
    bio text NOT NULL,
    weight numeric(5,2),
    height numeric(5,2),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    wellhub_enabled boolean NOT NULL,
    terms_accepted boolean NOT NULL
);


--
-- Name: users_user_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_user_groups (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    group_id integer NOT NULL
);


--
-- Name: users_user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users_user_groups ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_user_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users_user ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: users_user_user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_user_user_permissions (
    id bigint NOT NULL,
    user_id bigint NOT NULL,
    permission_id integer NOT NULL
);


--
-- Name: users_user_user_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users_user_user_permissions ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.users_user_user_permissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: workouts_exercise; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts_exercise (
    id bigint NOT NULL,
    name character varying(200) NOT NULL,
    muscle_group character varying(20) NOT NULL,
    sets integer NOT NULL,
    reps integer NOT NULL,
    rest_seconds integer NOT NULL,
    weight_kg numeric(6,2),
    notes text NOT NULL,
    "order" integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    workout_id bigint NOT NULL,
    CONSTRAINT workouts_exercise_order_check CHECK (("order" >= 0)),
    CONSTRAINT workouts_exercise_reps_check CHECK ((reps >= 0)),
    CONSTRAINT workouts_exercise_rest_seconds_check CHECK ((rest_seconds >= 0)),
    CONSTRAINT workouts_exercise_sets_check CHECK ((sets >= 0))
);


--
-- Name: workouts_exercise_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.workouts_exercise ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.workouts_exercise_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: workouts_exerciselog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts_exerciselog (
    id bigint NOT NULL,
    set_number integer NOT NULL,
    reps_done integer NOT NULL,
    weight_kg numeric(6,2),
    rest_seconds_taken integer,
    is_completed boolean NOT NULL,
    notes text NOT NULL,
    logged_at timestamp with time zone NOT NULL,
    exercise_id bigint NOT NULL,
    session_id bigint NOT NULL,
    execution_seconds integer,
    exercise_name_snapshot character varying(200) NOT NULL,
    muscle_group_snapshot character varying(20) NOT NULL,
    planned_reps integer,
    planned_rest_seconds integer,
    planned_weight_kg numeric(6,2),
    rpe numeric(4,2),
    volume_kg numeric(10,2) NOT NULL,
    CONSTRAINT workouts_exerciselog_execution_seconds_check CHECK ((execution_seconds >= 0)),
    CONSTRAINT workouts_exerciselog_planned_reps_check CHECK ((planned_reps >= 0)),
    CONSTRAINT workouts_exerciselog_planned_rest_seconds_check CHECK ((planned_rest_seconds >= 0)),
    CONSTRAINT workouts_exerciselog_reps_done_check CHECK ((reps_done >= 0)),
    CONSTRAINT workouts_exerciselog_rest_seconds_taken_check CHECK ((rest_seconds_taken >= 0)),
    CONSTRAINT workouts_exerciselog_set_number_check CHECK ((set_number >= 0))
);


--
-- Name: workouts_exerciselog_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.workouts_exerciselog ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.workouts_exerciselog_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: workouts_workout; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts_workout (
    id bigint NOT NULL,
    name character varying(200) NOT NULL,
    description text NOT NULL,
    workout_type character varying(20) NOT NULL,
    is_active boolean NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    user_id bigint NOT NULL
);


--
-- Name: workouts_workout_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.workouts_workout ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.workouts_workout_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: workouts_workoutsession; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workouts_workoutsession (
    id bigint NOT NULL,
    status character varying(20) NOT NULL,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    total_duration_seconds integer,
    notes text NOT NULL,
    created_at timestamp with time zone NOT NULL,
    user_id bigint NOT NULL,
    workout_id bigint NOT NULL,
    average_rpe numeric(4,2),
    completed_sets_count integer NOT NULL,
    planned_exercises_count integer NOT NULL,
    planned_sets_count integer NOT NULL,
    total_volume_kg numeric(12,2) NOT NULL,
    workout_name_snapshot character varying(200) NOT NULL,
    workout_type_snapshot character varying(20) NOT NULL,
    CONSTRAINT workouts_workoutsession_completed_sets_count_check CHECK ((completed_sets_count >= 0)),
    CONSTRAINT workouts_workoutsession_planned_exercises_count_check CHECK ((planned_exercises_count >= 0)),
    CONSTRAINT workouts_workoutsession_planned_sets_count_check CHECK ((planned_sets_count >= 0)),
    CONSTRAINT workouts_workoutsession_total_duration_seconds_check CHECK ((total_duration_seconds >= 0))
);


--
-- Name: workouts_workoutsession_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.workouts_workoutsession ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.workouts_workoutsession_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Data for Name: auth_group; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group (id, name) FROM stdin;
\.


--
-- Data for Name: auth_group_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_group_permissions (id, group_id, permission_id) FROM stdin;
\.


--
-- Data for Name: auth_permission; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.auth_permission (id, name, content_type_id, codename) FROM stdin;
1	Can add log entry	1	add_logentry
2	Can change log entry	1	change_logentry
3	Can delete log entry	1	delete_logentry
4	Can view log entry	1	view_logentry
5	Can add permission	2	add_permission
6	Can change permission	2	change_permission
7	Can delete permission	2	delete_permission
8	Can view permission	2	view_permission
9	Can add group	3	add_group
10	Can change group	3	change_group
11	Can delete group	3	delete_group
12	Can view group	3	view_group
13	Can add content type	4	add_contenttype
14	Can change content type	4	change_contenttype
15	Can delete content type	4	delete_contenttype
16	Can view content type	4	view_contenttype
17	Can add session	5	add_session
18	Can change session	5	change_session
19	Can delete session	5	delete_session
20	Can view session	5	view_session
21	Can add Usuário	6	add_user
22	Can change Usuário	6	change_user
23	Can delete Usuário	6	delete_user
24	Can view Usuário	6	view_user
25	Can add Treino	7	add_workout
26	Can change Treino	7	change_workout
27	Can delete Treino	7	delete_workout
28	Can view Treino	7	view_workout
29	Can add Exercicio	8	add_exercise
30	Can change Exercicio	8	change_exercise
31	Can delete Exercicio	8	delete_exercise
32	Can view Exercicio	8	view_exercise
33	Can add Sessao de Treino	9	add_workoutsession
34	Can change Sessao de Treino	9	change_workoutsession
35	Can delete Sessao de Treino	9	delete_workoutsession
36	Can view Sessao de Treino	9	view_workoutsession
37	Can add Log de Exercicio	10	add_exerciselog
38	Can change Log de Exercicio	10	change_exerciselog
39	Can delete Log de Exercicio	10	delete_exerciselog
40	Can view Log de Exercicio	10	view_exerciselog
41	Can add Localização de Academia	11	add_gymlocation
42	Can change Localização de Academia	11	change_gymlocation
43	Can delete Localização de Academia	11	delete_gymlocation
44	Can view Localização de Academia	11	view_gymlocation
\.


--
-- Data for Name: django_admin_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_admin_log (id, action_time, object_id, object_repr, action_flag, change_message, content_type_id, user_id) FROM stdin;
1	2026-03-29 22:32:14.711052+00	17	Istefanimatta - Treino ABC Hipertrofia Intermediário - Dia A - 29/03/2026	3		9	1
2	2026-03-29 22:32:14.711089+00	16	renanrds - Treino ABCDE Hipertrofia Iniciante - Dia A - 29/03/2026	3		9	1
3	2026-03-29 22:32:14.711107+00	15	renanrds - Força ABCD - Recuperação Pós-Lesão - Dia B - 29/03/2026	3		9	1
4	2026-03-29 22:32:14.711116+00	14	Karina - Treino ABCD Hipertrofia Iniciante - Dia A - 29/03/2026	3		9	1
5	2026-03-29 22:32:14.711125+00	13	renanrds - Força ABCD - Recuperação Pós-Lesão - Dia A - 29/03/2026	3		9	1
\.


--
-- Data for Name: django_content_type; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_content_type (id, app_label, model) FROM stdin;
1	admin	logentry
2	auth	permission
3	auth	group
4	contenttypes	contenttype
5	sessions	session
6	users	user
7	workouts	workout
8	workouts	exercise
9	workouts	workoutsession
10	workouts	exerciselog
11	users	gymlocation
\.


--
-- Data for Name: django_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_migrations (id, app, name, applied) FROM stdin;
1	contenttypes	0001_initial	2026-03-28 22:45:09.445636+00
2	contenttypes	0002_remove_content_type_name	2026-03-28 22:45:09.453757+00
3	auth	0001_initial	2026-03-28 22:45:09.48194+00
4	auth	0002_alter_permission_name_max_length	2026-03-28 22:45:09.487887+00
5	auth	0003_alter_user_email_max_length	2026-03-28 22:45:09.492543+00
6	auth	0004_alter_user_username_opts	2026-03-28 22:45:09.497452+00
7	auth	0005_alter_user_last_login_null	2026-03-28 22:45:09.503246+00
8	auth	0006_require_contenttypes_0002	2026-03-28 22:45:09.505019+00
9	auth	0007_alter_validators_add_error_messages	2026-03-28 22:45:09.509785+00
10	auth	0008_alter_user_username_max_length	2026-03-28 22:45:09.514451+00
11	auth	0009_alter_user_last_name_max_length	2026-03-28 22:45:09.520051+00
12	auth	0010_alter_group_name_max_length	2026-03-28 22:45:09.524739+00
13	auth	0011_update_proxy_permissions	2026-03-28 22:45:09.52868+00
14	auth	0012_alter_user_first_name_max_length	2026-03-28 22:45:09.532237+00
15	users	0001_initial	2026-03-28 22:45:09.54697+00
16	admin	0001_initial	2026-03-28 22:45:09.558604+00
17	admin	0002_logentry_remove_auto_add	2026-03-28 22:45:09.563511+00
18	admin	0003_logentry_add_action_flag_choices	2026-03-28 22:45:09.569069+00
19	sessions	0001_initial	2026-03-28 22:45:09.57283+00
20	workouts	0001_initial	2026-03-28 22:45:09.608391+00
21	users	0002_user_wellhub_enabled_gymlocation	2026-03-29 02:25:18.584925+00
22	users	0003_user_terms_accepted	2026-03-29 16:41:32.269944+00
23	workouts	0002_add_historical_session_fields	2026-03-29 18:16:23.867092+00
\.


--
-- Data for Name: django_session; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.django_session (session_key, session_data, expire_date) FROM stdin;
cng9cz45uru6khg2ai7y5k0etce43ini	.eJxVjEEOwiAQRe_C2pCBASou3fcMZBhAqoYmpV0Z765NutDtf-_9lwi0rTVsPS9hSuIilDj9bpH4kdsO0p3abZY8t3WZotwVedAuxznl5_Vw_w4q9fqtrS1Q0hCZkLW2cUACOHvntFZgwDNqV9BDyV5Z5wwC-KSVRVNsBsXi_QG_KjZs:1w6wqE:I9eHDZW_KQ36DBSMfu3jEwccKncaYqylUcjdhovGNJ0	2026-04-12 20:34:38.587328+00
\.


--
-- Data for Name: users_gymlocation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_gymlocation (id, name, latitude, longitude, is_primary, created_at, updated_at, user_id) FROM stdin;
16	Minha Academia	-25.501579	-49.174061	t	2026-03-29 21:25:09.294645+00	2026-03-29 21:25:09.553278+00	3
17	Minha Academia	-25.476438	-49.156333	t	2026-03-30 11:48:26.602287+00	2026-03-30 11:48:26.796408+00	4
18	Minha Academia	-25.474100	-49.153600	t	2026-03-30 13:07:22.333736+00	2026-03-30 13:07:22.375675+00	6
19	Minha Academia	-25.476479	-49.156417	t	2026-03-30 21:02:58.017237+00	2026-03-30 21:02:58.089244+00	1
\.


--
-- Data for Name: users_user; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_user (id, password, last_login, is_superuser, username, first_name, last_name, is_staff, is_active, date_joined, email, avatar, bio, weight, height, created_at, updated_at, wellhub_enabled, terms_accepted) FROM stdin;
3	pbkdf2_sha256$1000000$XFw3Upy1of1IPRtBzS2LLY$Xw5jq34wmlwgxpNmB5fcN24HW+JWcfVbhGM8dXlqy/c=	\N	f	Istefanimatta	Istefani	da Matta	f	t	2026-03-29 21:18:46.939965+00	isteh.oliveira@gmail.com			\N	\N	2026-03-29 21:18:47.063169+00	2026-03-29 21:25:46.30525+00	f	t
5	pbkdf2_sha256$1000000$xnN3N9QdKk1KvELPmOcQM3$1Larrm0aEncpgZv8rntMMGxp5TXn8PGMXdeUShxInF0=	\N	f	BiancaIsr	Bianca	Israela	f	t	2026-03-30 11:43:43.557701+00	biancaisraela01@gmal.com			63.00	171.00	2026-03-30 11:43:43.680977+00	2026-03-30 11:45:26.750764+00	f	t
4	pbkdf2_sha256$1000000$4UcEdBwuct77Arienlcedr$Yro9vnRrmd5Tv+TDhUeAiUcrBcmPqyq5PJzW0r69NA0=	\N	f	guiligeskee	Guilherme	Ligeski Saldanha	f	t	2026-03-30 11:40:11.675287+00	guiligeskee@gmail.com			\N	\N	2026-03-30 11:40:11.815229+00	2026-03-30 11:47:55.03586+00	t	t
6	pbkdf2_sha256$1000000$RFi4KpA5BbLYgo1TMutJDs$OoSuNmiyJ7Zgjhfv/97jVmtMAGwIB0Ug8E7GLbvgtvU=	\N	f	Kennidy_M	Kennidy	Maylon	f	t	2026-03-30 12:56:24.840847+00	jhinasharperx@gmail.com			\N	\N	2026-03-30 12:56:24.958548+00	2026-03-30 13:07:02.387389+00	t	t
7	pbkdf2_sha256$1000000$XZvQ6Bbj3fFBKy0s2IZGFx$aEfKJbTM00TOk3ozvHGwbPdv9UoPX0evWYyPklLrH8g=	\N	f	Príncipe	Murilo	Principe	f	t	2026-03-30 14:54:06.018813+00	mu.principe@gmail.com			\N	\N	2026-03-30 14:54:06.140465+00	2026-03-30 14:54:06.14047+00	f	f
2	pbkdf2_sha256$1000000$zqNYAb7Fm3twfrrdDeksH6$pUbSe96WWKmgK4dWb6Ejk3jLds9L1Vpr5WzLk4FJ8MI=	\N	f	Karina	Karina	Goes	f	t	2026-03-28 23:38:58.028563+00	karina.goes.26@hotmail.com			86.00	165.00	2026-03-28 23:38:58.146675+00	2026-03-29 17:49:59.321799+00	t	t
1	pbkdf2_sha256$1000000$OSoLLZTYxt5SK9ZFCGr2Nb$sbQOcS/Y28dLTF3WCcb3A6TLLW1KgrhtP8ASiXw6azw=	2026-03-29 20:34:38.585216+00	t	renanrds	Renan	Silva	t	t	2026-03-28 22:46:15.690477+00	renan_rdasilva@hotmail.com			72.00	165.00	2026-03-28 22:46:15.839484+00	2026-03-29 17:17:25.8364+00	t	t
\.


--
-- Data for Name: users_user_groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_user_groups (id, user_id, group_id) FROM stdin;
\.


--
-- Data for Name: users_user_user_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users_user_user_permissions (id, user_id, permission_id) FROM stdin;
\.


--
-- Data for Name: workouts_exercise; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workouts_exercise (id, name, muscle_group, sets, reps, rest_seconds, weight_kg, notes, "order", created_at, workout_id) FROM stdin;
6	Puxada Alta Aberta	back	3	12	30	\N		0	2026-03-28 23:24:38.788647+00	2
7	Remada Baixa	back	3	12	30	\N		1	2026-03-28 23:24:38.839192+00	2
8	Remada Unilateral	back	3	12	30	\N		2	2026-03-28 23:24:38.904349+00	2
9	Rosca Direta (Barra W)	biceps	3	12	30	\N		3	2026-03-28 23:24:38.94822+00	2
10	Rosca Martelo	biceps	3	12	30	\N		4	2026-03-28 23:24:38.999645+00	2
11	Extensora	legs	4	15	30	\N		0	2026-03-28 23:28:06.094292+00	3
12	Flexora	legs	4	15	30	\N		1	2026-03-28 23:28:06.141999+00	3
13	Leg Press 45º	legs	3	12	30	\N		2	2026-03-28 23:28:06.188377+00	3
14	Cadeira Adutora	legs	3	15	30	\N		3	2026-03-28 23:28:06.232348+00	3
15	Panturrilha Sentado	calves	3	15	30	\N		4	2026-03-28 23:28:06.276476+00	3
16	Elevação Lateral	shoulders	3	15	30	\N		0	2026-03-28 23:31:49.44969+00	4
17	Desenvolvimento	shoulders	3	15	30	\N		1	2026-03-28 23:31:49.506202+00	4
18	Crucifixo Inverso	shoulders	3	12	30	\N		2	2026-03-28 23:31:49.562498+00	4
19	Encolhimento	shoulders	3	15	30	\N		3	2026-03-28 23:31:49.611642+00	4
1	Supino Reto	chest	3	12	30	\N		0	2026-03-28 23:20:54.1812+00	1
2	Supino Inclinado	chest	3	12	30	\N		1	2026-03-28 23:20:54.228428+00	1
3	Voador	chest	3	15	30	\N		2	2026-03-28 23:20:54.331906+00	1
4	Tríceps Pulley (Corda)	triceps	3	12	30	\N		3	2026-03-28 23:20:54.376261+00	1
5	Tríceps Testa	triceps	3	12	30	\N		4	2026-03-28 23:20:54.422721+00	1
20	Supino Reto com Halteres	chest	4	10	90	22.00	Amplitude completa, controlando a descida.	0	2026-03-29 16:44:58.125364+00	5
21	Desenvolvimento Arnold	shoulders	3	12	60	14.00	Giro controlado no final do movimento.	1	2026-03-29 16:44:58.126624+00	5
22	Flexão de Braços	chest	3	15	60	0.00	Manter alinhamento do quadril.	2	2026-03-29 16:44:58.127319+00	5
23	Tríceps na Polia Alta com Corda	triceps	3	12	60	25.00	Isolar o movimento apenas na articulação do cotovelo.	3	2026-03-29 16:44:58.127987+00	5
24	Prancha Frontal	abs	3	1	60	0.00	Segurar a isometria por 60 segundos.	4	2026-03-29 16:44:58.128672+00	5
25	Pallof Press na Polia	abs	3	12	45	15.00	12 repetições para cada lado.	5	2026-03-29 16:44:58.129386+00	5
26	Agachamento Goblet com Halter	legs	4	10	90	26.00	Manter o tronco ereto e o peso próximo ao corpo.	6	2026-03-29 16:44:58.130165+00	5
27	Leg Press 45	legs	3	12	90	120.00	Pés totalmente apoiados na plataforma.	7	2026-03-29 16:44:58.130971+00	5
28	Afundo com Halteres	legs	3	10	60	16.00	10 repetições por perna.	8	2026-03-29 16:44:58.131787+00	5
29	Elevação Pélvica na Máquina	glutes	3	12	60	40.00	Pausa de 1 segundo na contração máxima.	9	2026-03-29 16:44:58.132514+00	5
30	Panturrilha Sentado	calves	4	15	45	35.00	Movimento cadenciado, priorizando a fase excêntrica.	10	2026-03-29 16:44:58.133193+00	5
31	Russian Twist com Anilha	abs	3	20	45	10.00	20 toques totais alternando os lados.	11	2026-03-29 16:44:58.133948+00	5
32	Puxada Alta Frontal	back	4	10	90	50.00	Deprimir as escápulas antes de puxar.	12	2026-03-29 16:44:58.135114+00	5
33	Remada Curvada com Barra	back	3	10	90	45.00	Manter a coluna neutra durante todo o movimento.	13	2026-03-29 16:44:58.1358+00	5
34	Face Pull na Polia	shoulders	3	15	60	20.00	Foco na retração escapular e posterior de ombro.	14	2026-03-29 16:44:58.136511+00	5
35	Rosca Martelo com Halteres	biceps	3	12	60	14.00	Mantém os cotovelos fixos ao lado do corpo.	15	2026-03-29 16:44:58.13729+00	5
36	Farmer's Walk	full_body	3	1	90	24.00	Caminhar 20 metros por série. Carga em cada mão.	16	2026-03-29 16:44:58.138074+00	5
37	Levantamento Terra Romeno (RDL)	legs	4	10	90	50.00	Foco no alongamento dos isquiotibiais, mantendo a barra rente às pernas.	17	2026-03-29 16:44:58.138815+00	5
38	Kettlebell Swing	glutes	4	15	60	20.00	A força vem do quadril, não dos braços.	18	2026-03-29 16:44:58.139556+00	5
39	Remada no Ergômetro (Remo Seco)	cardio	4	1	60	0.00	Tiros de 500 metros em intensidade moderada a alta.	19	2026-03-29 16:44:58.140244+00	5
40	Arremesso de Medicine Ball no Chão (Slams)	full_body	3	12	60	10.00	Usar o corpo todo para aplicar força no arremesso.	20	2026-03-29 16:44:58.140919+00	5
41	Corda Naval	cardio	4	1	60	0.00	Séries de 30 segundos de trabalho contínuo.	21	2026-03-29 16:44:58.141681+00	5
42	Abdominal Infra no Banco	abs	3	15	45	0.00	Controle a descida das pernas.	22	2026-03-29 16:44:58.142395+00	5
43	Barra Fixa (Pull-up)	back	3	8	90	0.00	Foco na amplitude completa e controle escapular	0	2026-03-29 16:57:13.360644+00	6
44	Remada Curvada com Barra	back	4	10	90	40.00	Mantenha o core engajado para estabilizar a coluna	1	2026-03-29 16:57:13.361667+00	6
45	Renegade Row (Remada Prancha)	full_body	3	12	60	14.00	Evite a rotação excessiva do quadril	2	2026-03-29 16:57:13.362032+00	6
46	Rosca Direta com Halteres	biceps	3	12	60	12.00	Execução lenta na fase excêntrica	3	2026-03-29 16:57:13.362359+00	6
47	Kettlebell Swings	full_body	4	15	60	20.00	Potência vinda do quadril, não dos braços	4	2026-03-29 16:57:13.362673+00	6
48	Plancha Abdominal	abs	3	60	45	0.00	Manter alinhamento cervical e lombar	5	2026-03-29 16:57:13.362978+00	6
49	Supino Reto com Halteres	chest	4	10	90	24.00	Maior recrutamento de estabilizadores do que com barra	0	2026-03-29 16:57:13.363594+00	7
50	Desenvolvimento Militar (OHP)	shoulders	3	10	90	30.00	Em pé para maior demanda de core	1	2026-03-29 16:57:13.363896+00	7
51	Paralelas (Dips)	triceps	3	10	60	0.00	Incline levemente o tronco para frente	2	2026-03-29 16:57:13.364194+00	7
52	Arremesso de Medicine Ball no Chão	full_body	3	12	60	8.00	Use todo o corpo para gerar força descendente	3	2026-03-29 16:57:13.364503+00	7
53	Turkish Get-up	full_body	3	5	90	12.00	5 repetições por cada lado, foco total no controle	4	2026-03-29 16:57:13.364926+00	7
54	Flexão de Braços (Push-ups)	chest	3	15	60	0.00	Manter o corpo em uma linha reta	5	2026-03-29 16:57:13.365362+00	7
55	Agachamento Livre (Back Squat)	legs	4	8	120	60.00	Foco na profundidade e controle	0	2026-03-29 16:57:13.366168+00	8
56	Agachamento Búlgaro	legs	3	10	60	12.00	Trabalho unilateral para correção de assimetrias	1	2026-03-29 16:57:13.36667+00	8
57	Box Jumps	full_body	3	8	90	0.00	Aterrissagem silenciosa e suave	2	2026-03-29 16:57:13.3671+00	8
58	Extensora	legs	3	12	60	45.00	Isolamento de quadríceps	3	2026-03-29 16:57:13.367502+00	8
59	Elevação de Panturrilha em Pé	calves	4	15	60	50.00	Pausa de 1s no pico de contração	4	2026-03-29 16:57:13.36769+00	8
60	Abdominal infra (Hanging Leg Raise)	abs	3	12	60	0.00	Evite balançar o corpo	5	2026-03-29 16:57:13.367839+00	8
61	Levantamento Terra (Deadlift)	legs	4	6	120	80.00	Foco na técnica de dobradiça de quadril	0	2026-03-29 16:57:13.368138+00	9
62	Elevação Pélvica (Hip Thrust)	glutes	3	10	90	60.00	Contraia os glúteos no topo por 2 segundos	1	2026-03-29 16:57:13.36828+00	9
63	Farmer's Walk	full_body	3	40	60	24.00	Caminhada de 40 metros mantendo postura ereta	2	2026-03-29 16:57:13.368411+00	9
64	Stiff	legs	3	12	90	40.00	Sinta o alongamento nos isquiotibiais	3	2026-03-29 16:57:13.36854+00	9
65	Burpees	full_body	3	12	60	0.00	Execução explosiva e contínua	4	2026-03-29 16:57:13.368666+00	9
66	Mountain Climbers	cardio	3	30	45	0.00	30 segundos de alta intensidade	5	2026-03-29 16:57:13.368808+00	9
67	Supino reto com barra	chest	5	5	180	80.00	Foco em força, execução controlada	0	2026-03-29 17:11:29.288171+00	11
68	Supino inclinado com halteres	chest	4	6	150	30.00		1	2026-03-29 17:11:29.288809+00	11
69	Chest press máquina	chest	3	8	120	70.00		2	2026-03-29 17:11:29.289178+00	11
70	Crucifixo na máquina	chest	3	10	90	50.00		3	2026-03-29 17:11:29.289522+00	11
71	Tríceps testa com barra	triceps	4	6	120	35.00		4	2026-03-29 17:11:29.289773+00	11
72	Tríceps corda na polia	triceps	3	8	90	40.00		5	2026-03-29 17:11:29.290026+00	11
73	Puxada na frente (barra)	back	5	5	180	80.00		0	2026-03-29 17:11:29.29035+00	12
74	Remada curvada com barra	back	4	6	150	70.00	Manter postura neutra	1	2026-03-29 17:11:29.290483+00	12
75	Remada baixa na máquina	back	3	8	120	65.00		2	2026-03-29 17:11:29.290608+00	12
76	Pulldown unilateral	back	3	10	90	30.00		3	2026-03-29 17:11:29.290725+00	12
77	Rosca direta com barra	biceps	4	6	120	40.00		4	2026-03-29 17:11:29.290839+00	12
78	Rosca alternada com halteres	biceps	3	8	90	16.00		5	2026-03-29 17:11:29.290953+00	12
79	Leg press	legs	5	5	180	180.00	Evitar pressão excessiva no pé lesionado	0	2026-03-29 17:11:29.291203+00	13
80	Cadeira extensora	legs	4	8	120	70.00		1	2026-03-29 17:11:29.29133+00	13
81	Mesa flexora	legs	4	8	120	60.00		2	2026-03-29 17:11:29.291451+00	13
82	Glute bridge com barra	glutes	4	6	120	100.00		3	2026-03-29 17:11:29.291566+00	13
83	Abdução de quadril máquina	glutes	3	10	90	60.00		4	2026-03-29 17:11:29.29168+00	13
84	Panturrilha sentado	calves	3	10	90	50.00	Executar com cautela	5	2026-03-29 17:11:29.291796+00	13
85	Desenvolvimento com barra	shoulders	5	5	180	60.00		0	2026-03-29 17:11:29.292032+00	14
86	Elevação lateral com halteres	shoulders	4	8	90	12.00		1	2026-03-29 17:11:29.292159+00	14
87	Elevação frontal com halteres	shoulders	3	8	90	12.00		2	2026-03-29 17:11:29.292276+00	14
88	Crucifixo invertido máquina	shoulders	3	10	90	45.00		3	2026-03-29 17:11:29.29239+00	14
89	Prancha	abs	3	30	60	0.00	Tempo em segundos	4	2026-03-29 17:11:29.292502+00	14
90	Abdominal na máquina	abs	3	10	60	50.00		5	2026-03-29 17:11:29.292618+00	14
91	Levantamento terra (leve/moderado)	full_body	5	5	180	90.00	Cuidado com apoio do pé	0	2026-03-29 17:11:29.292884+00	15
92	Supino com halteres	chest	4	6	150	32.00		1	2026-03-29 17:11:29.293021+00	15
93	Remada unilateral com halter	back	4	6	120	30.00		2	2026-03-29 17:11:29.293137+00	15
94	Afundo no smith (leve)	legs	3	8	120	40.00	Executar apenas se sem dor	3	2026-03-29 17:11:29.29325+00	15
95	Rosca martelo	biceps	3	8	90	14.00		4	2026-03-29 17:11:29.293365+00	15
96	Tríceps banco	triceps	3	8	90	0.00		5	2026-03-29 17:11:29.293481+00	15
97	Agachamento Livre (Barra)	legs	4	15	45	40.00	Foco em manter o ritmo constante	0	2026-03-29 17:12:25.803697+00	16
98	Leg Press 45	legs	3	20	45	100.00	Amplitude completa	1	2026-03-29 17:12:25.804225+00	16
99	Burpees	cardio	4	15	30	0.00	Execução explosiva	2	2026-03-29 17:12:25.804609+00	16
100	Afundo com Halteres	legs	3	12	45	12.00	12 repetições por perna	3	2026-03-29 17:12:25.804934+00	16
101	Box Jumps (Salto na Caixa)	cardio	3	15	60	0.00	Aterrizagem suave	4	2026-03-29 17:12:25.805236+00	16
102	Cadeira Extensora	legs	3	15	30	35.00	Pico de contração de 1s	5	2026-03-29 17:12:25.805523+00	16
103	Sprint na Esteira	cardio	5	1	45	0.00	30 segundos de sprint máximo por série	6	2026-03-29 17:12:25.805804+00	16
104	Supino Reto com Halteres	chest	4	15	45	18.00	Cadência controlada	0	2026-03-29 17:12:25.806364+00	17
105	Remada Curvada com Barra	back	4	15	45	30.00	Tronco estabilizado	1	2026-03-29 17:12:25.806646+00	17
106	Desenvolvimento com Halteres	shoulders	3	15	45	12.00	Sentado ou em pé	2	2026-03-29 17:12:25.806922+00	17
107	Battle Ropes (Corda Naval)	cardio	4	45	30	0.00	45 segundos de atividade contínua	3	2026-03-29 17:12:25.807196+00	17
108	Puxada Frontal (Pulley)	back	3	15	45	45.00	Foco na depressão escapular	4	2026-03-29 17:12:25.807468+00	17
109	Flexão de Braços	chest	3	20	30	0.00	Máximo de reps até 20	5	2026-03-29 17:12:25.807738+00	17
110	Remo Seco (Ergômetro)	cardio	1	10	0	0.00	10 minutos de intensidade moderada/alta	6	2026-03-29 17:12:25.808007+00	17
111	Levantamento Terra (Deadlift)	full_body	4	10	60	60.00	Foco total na técnica	0	2026-03-29 17:12:25.808548+00	18
112	Thrusters com Halteres	full_body	4	15	45	10.00	Agachamento combinado com press militar	1	2026-03-29 17:12:25.808828+00	18
113	Kettlebell Swings	full_body	4	20	30	16.00	Explosão de quadril	2	2026-03-29 17:12:25.809106+00	18
114	Mountain Climbers	abs	4	40	30	0.00	40 repetições totais rápidas	3	2026-03-29 17:12:25.809376+00	18
115	Assault Bike	cardio	5	1	60	0.00	45 segundos ALL OUT	4	2026-03-29 17:12:25.809645+00	18
116	Prancha Abdominal	abs	3	60	30	0.00	Sustentar por 60 segundos	5	2026-03-29 17:12:25.809909+00	18
117	Pular Corda	cardio	1	5	30	0.00	5 minutos ininterruptos ou com pausas mínimas	6	2026-03-29 17:12:25.810171+00	18
118	Goblet Squat	legs	3	20	30	16.00	Manter o core engajado	0	2026-03-29 17:12:25.810691+00	19
119	Medicine Ball Slams	full_body	4	15	30	8.00	Bater a bola no chão com força máxima	1	2026-03-29 17:12:25.810955+00	19
120	Russian Twists	abs	3	30	30	5.00	Usar anilha ou medicine ball	2	2026-03-29 17:12:25.811219+00	19
121	Step-ups na Caixa	legs	3	20	30	0.00	Alternando as pernas	3	2026-03-29 17:12:25.81148+00	19
122	Elevação de Pernas Suspenso	abs	3	15	45	0.00	Na barra fixa ou paralela	4	2026-03-29 17:12:25.81174+00	19
123	Elíptico (Transport)	cardio	1	15	0	0.00	15 minutos em ritmo moderado constante	5	2026-03-29 17:12:25.812074+00	19
124	Stair Climber (Escada)	cardio	1	10	0	0.00	10 minutos finais para queima máxima	6	2026-03-29 17:12:25.812351+00	19
125	Supino Reto com Barra	chest	3	10	90	40.00	Descer a barra até o peito de forma controlada	0	2026-03-29 17:16:08.016461+00	20
126	Supino Inclinado com Halteres	chest	3	12	60	16.00	Foco na parte superior do peitoral	1	2026-03-29 17:16:08.016749+00	20
127	Crucifixo na Máquina (Peck Deck)	chest	3	12	60	35.00	Manter os cotovelos levemente flexionados	2	2026-03-29 17:16:08.016904+00	20
128	Desenvolvimento com Halteres	shoulders	3	10	60	12.00	Executar sentado com apoio no banco	3	2026-03-29 17:16:08.017039+00	20
129	Elevação Lateral com Halteres	shoulders	3	15	60	6.00	Não ultrapassar a linha dos ombros	4	2026-03-29 17:16:08.017179+00	20
130	Tríceps Pulley (Polia)	triceps	3	12	60	20.00	Manter os cotovelos colados ao corpo	5	2026-03-29 17:16:08.01732+00	20
131	Tríceps Testa com Barra EZ	triceps	3	10	60	15.00	Cuidado com a descida em direção à testa	6	2026-03-29 17:16:08.017442+00	20
132	Puxada Frontal na Polia Alta	back	3	10	90	45.00	Trazer a barra em direção ao peito, não ao pescoço	0	2026-03-29 17:16:08.01769+00	21
133	Remada Baixa Sentada	back	3	12	60	40.00	Manter a coluna ereta e esmagar as escápulas	1	2026-03-29 17:16:08.01781+00	21
134	Remada Unilateral com Halter (Serrote)	back	3	12	60	18.00	Executar um lado de cada vez	2	2026-03-29 17:16:08.017924+00	21
135	Crucifixo Inverso (Halteres ou Máquina)	shoulders	3	15	60	6.00	Foco no deltoide posterior	3	2026-03-29 17:16:08.018037+00	21
136	Rosca Direta com Barra W	biceps	3	10	60	20.00	Evitar o balanço do tronco	4	2026-03-29 17:16:08.018163+00	21
137	Rosca Martelo com Halteres	biceps	3	12	60	10.00	Pegada neutra para focar no braquiorradial	5	2026-03-29 17:16:08.018282+00	21
138	Abdominal Supra (Crunch)	abs	3	20	45	0.00	Contrair bem o abdômen na subida	6	2026-03-29 17:16:08.018398+00	21
139	Agachamento Livre com Barra	legs	4	10	120	40.00	Manter os pés alinhados aos ombros e coluna neutra	0	2026-03-29 17:16:08.018634+00	22
140	Leg Press 45 Graus	legs	3	12	90	80.00	Não estender totalmente os joelhos no topo	1	2026-03-29 17:16:08.018751+00	22
141	Cadeira Extensora	legs	3	15	60	30.00	Pico de contração de 1 segundo no topo	2	2026-03-29 17:16:08.018863+00	22
142	Mesa Flexora	legs	3	12	60	25.00	Foco nos isquiotibiais	3	2026-03-29 17:16:08.018974+00	22
143	Stiff com Halteres	glutes	3	12	60	14.00	Descer os halteres rente às pernas, sentindo o alongamento	4	2026-03-29 17:16:08.019084+00	22
144	Gêmeos em Pé (Máquina)	calves	4	15	45	40.00	Alongar bem na descida e contrair no topo	5	2026-03-29 17:16:08.0192+00	22
145	Prancha Abdominal	abs	3	45	45	0.00	Sustentação por 45 segundos mantendo o core firme	6	2026-03-29 17:16:08.019325+00	22
146	Supino Reto	chest	3	10	90	40.00	Controle o movimento e evite travar os cotovelos	0	2026-03-29 17:49:31.59754+00	23
147	Supino Inclinado com Halteres	chest	3	10	90	14.00	Foco na contração do peitoral superior	1	2026-03-29 17:49:31.598329+00	23
148	Crucifixo na Máquina	chest	3	12	60	30.00	Movimento controlado na volta	2	2026-03-29 17:49:31.598724+00	23
149	Tríceps Pulley	triceps	3	12	60	25.00	Cotovelos fixos ao lado do corpo	3	2026-03-29 17:49:31.59905+00	23
150	Tríceps Francês com Halter	triceps	3	10	60	12.00	Movimento lento e controlado	4	2026-03-29 17:49:31.599351+00	23
151	Mergulho em Banco	triceps	3	12	60	0.00	Use o peso corporal	5	2026-03-29 17:49:31.599643+00	23
152	Puxada Frontal	back	3	10	90	40.00	Puxe até a linha do peito	0	2026-03-29 17:49:31.600199+00	24
153	Remada Curvada com Barra	back	3	10	90	35.00	Coluna neutra durante o movimento	1	2026-03-29 17:49:31.600473+00	24
154	Remada Baixa na Polia	back	3	12	60	35.00	Aproxime as escápulas	2	2026-03-29 17:49:31.600755+00	24
155	Rosca Direta com Barra	biceps	3	10	60	20.00	Evite balançar o corpo	3	2026-03-29 17:49:31.601034+00	24
156	Rosca Alternada com Halteres	biceps	3	12	60	10.00	Controle na descida	4	2026-03-29 17:49:31.601302+00	24
157	Rosca Martelo	biceps	3	12	60	10.00	Foco no antebraço	5	2026-03-29 17:49:31.601566+00	24
158	Agachamento Livre	legs	3	10	90	40.00	Desça até 90 graus	0	2026-03-29 17:49:31.602085+00	25
159	Leg Press 45°	legs	3	12	90	120.00	Pés na largura dos ombros	1	2026-03-29 17:49:31.602349+00	25
160	Cadeira Extensora	legs	3	12	60	40.00	Segure 1 segundo no topo	2	2026-03-29 17:49:31.602615+00	25
161	Mesa Flexora	legs	3	12	60	35.00	Controle total do movimento	3	2026-03-29 17:49:31.602877+00	25
162	Elevação de Quadril	glutes	3	12	60	40.00	Aperte o glúteo no topo	4	2026-03-29 17:49:31.603137+00	25
163	Panturrilha em Pé	calves	4	15	60	40.00	Movimento completo	5	2026-03-29 17:49:31.603404+00	25
164	Desenvolvimento com Halteres	shoulders	3	10	90	12.00	Evite arquear a lombar	0	2026-03-29 17:49:31.603923+00	26
165	Elevação Lateral	shoulders	3	12	60	8.00	Suba até a linha dos ombros	1	2026-03-29 17:49:31.604187+00	26
166	Elevação Frontal	shoulders	3	12	60	8.00	Movimento controlado	2	2026-03-29 17:49:31.604448+00	26
167	Crucifixo Invertido	shoulders	3	12	60	20.00	Foco no deltoide posterior	3	2026-03-29 17:49:31.604715+00	26
168	Abdominal na Máquina	abs	3	15	45	30.00	Contraia bem o abdômen	4	2026-03-29 17:49:31.604976+00	26
169	Prancha	abs	3	30	45	0.00	Segure por 30 segundos	5	2026-03-29 17:49:31.605237+00	26
170	Supino Reto com Barra	chest	4	10	90	40.00	Manter os pés firmes no chão sem transferir carga excessiva para a lateral do pé.	0	2026-03-29 18:04:10.461877+00	27
171	Supino Inclinado com Halteres	chest	3	12	60	18.00	Foco na cadência 2:2.	1	2026-03-29 18:04:10.462467+00	27
172	Peck Deck (Voador)	chest	3	15	60	45.00	Pico de contração de 2 segundos.	2	2026-03-29 18:04:10.462848+00	27
173	Crossover Polia Média	chest	3	12	60	15.00	Evitar base em tesoura muito aberta para não forçar o metatarso.	3	2026-03-29 18:04:10.463218+00	27
174	Tríceps Corda	triceps	4	12	60	20.00	Extensão total dos cotovelos.	4	2026-03-29 18:04:10.463577+00	27
175	Tríceps Testa com Barra W	triceps	3	10	60	10.00	Controlar a descida até a testa.	5	2026-03-29 18:04:10.463957+00	27
176	Tríceps Pulley com Barra Reta	triceps	3	15	60	25.00	Tronco levemente inclinado, mantendo estabilidade.	6	2026-03-29 18:04:10.464294+00	27
177	Puxada Frontal Aberta	back	4	10	90	50.00	Puxar a barra em direção ao peito, não ao pescoço.	0	2026-03-29 18:04:10.464853+00	28
178	Remada Baixa com Triângulo	back	3	12	60	40.00	Manter os joelhos levemente flexionados e calcanhares bem apoiados.	1	2026-03-29 18:04:10.465026+00	28
179	Puxada Alta com Pegada Supinada	back	3	12	60	45.00	Foco na ativação do latíssimo do dorso.	2	2026-03-29 18:04:10.465171+00	28
180	Remada Unilateral com Halter (Serrote)	back	3	10	60	20.00	Apoiar um joelho e mão no banco para poupar o pé lesionado.	3	2026-03-29 18:04:10.465363+00	28
181	Rosca Direta com Barra W	biceps	4	10	60	12.00	Pode ser feito sentado se sentir desconforto ao ficar em pé.	4	2026-03-29 18:04:10.465504+00	28
182	Rosca Alternada com Halteres	biceps	3	12	60	10.00	Giro do punho no topo do movimento.	5	2026-03-29 18:04:10.46564+00	28
183	Rosca Martelo	biceps	3	12	60	10.00	Trabalha braquiorradial e bíceps.	6	2026-03-29 18:04:10.46577+00	28
184	Desenvolvimento com Halteres Sentado	shoulders	4	10	90	14.00	Sentado para garantir estabilidade e zero impacto no pé.	0	2026-03-29 18:04:10.466055+00	29
185	Elevação Lateral com Halteres	shoulders	4	12	60	8.00	Pode ser feito sentado se preferir.	1	2026-03-29 18:04:10.466188+00	29
186	Elevação Frontal com Halteres	shoulders	3	12	60	8.00	Movimento controlado, sem balanço.	2	2026-03-29 18:04:10.466325+00	29
187	Crucifixo Inverso no Peck Deck	shoulders	3	15	60	30.00	Foco no deltoide posterior.	3	2026-03-29 18:04:10.466444+00	29
188	Encolhimento com Halteres	shoulders	3	15	60	24.00	Manter os braços estendidos.	4	2026-03-29 18:04:10.466557+00	29
189	Abdominal Supra (Crunch) no Solo	abs	4	20	45	0.00	Pés apoiados no chão.	5	2026-03-29 18:04:10.466672+00	29
190	Abdominal Infra no Banco	abs	4	15	45	0.00	Evitar movimentos bruscos com as pernas.	6	2026-03-29 18:04:10.466793+00	29
191	Cadeira Extensora	legs	4	12	60	40.00	Exercício de cadeia aberta, seguro para o metatarso.	0	2026-03-29 18:04:10.467786+00	30
192	Leg Press 45°	legs	4	10	90	80.00	IMPORTANTE: Posicionar pés no meio da plataforma, empurrar pelo calcanhar. Não deixar o pé rodar para fora.	1	2026-03-29 18:04:10.467958+00	30
193	Cadeira Flexora	legs	3	12	60	35.00	Apoio acolchoado acima do calcanhar.	2	2026-03-29 18:04:10.468138+00	30
194	Mesa Flexora	legs	3	12	60	25.00	Foco em posterior de coxa.	3	2026-03-29 18:04:10.468281+00	30
195	Cadeira Abdutora	glutes	3	15	60	40.00	Fortalecimento lateral sem carga axial no pé.	4	2026-03-29 18:04:10.468427+00	30
196	Cadeira Adutora	legs	3	15	60	35.00	Estabilidade de quadril.	5	2026-03-29 18:04:10.468733+00	30
197	Panturrilha Sentado	calves	4	15	60	15.00	Mais seguro que em pé para o 5º metatarso. Usar carga moderada e evitar explosão.	6	2026-03-29 18:04:10.469275+00	30
198	Supino Reto com Barra	chest	5	5	180	60.00	Foco em explosão na subida e controle na descida.	0	2026-03-29 18:06:14.949183+00	31
199	Supino Inclinado com Halteres	chest	4	8	120	24.00	Mantenha os pés firmes mas sem pressão excessiva na lateral.	1	2026-03-29 18:06:14.949474+00	31
200	Crucifixo Reto com Halteres	chest	3	10	90	16.00	Alongamento máximo peitoral.	2	2026-03-29 18:06:14.949624+00	31
201	Tríceps Testa com Barra W	triceps	4	8	120	30.00	Mantenha os cotovelos fechados.	3	2026-03-29 18:06:14.949754+00	31
202	Tríceps Corda na Polia	triceps	3	12	90	20.00	Pico de contração no final do movimento.	4	2026-03-29 18:06:14.949877+00	31
203	Remada Curvada com Barra	back	5	5	180	50.00	Use pegada pronada; estabilize bem o core.	0	2026-03-29 18:06:14.950142+00	32
204	Puxada Frontal na Polia Alta	back	4	8	120	55.00	Puxe em direção ao peito, não atrás da nuca.	1	2026-03-29 18:06:14.950266+00	32
205	Remada Baixa com Triângulo	back	3	10	90	50.00	Mantenha a coluna ereta.	2	2026-03-29 18:06:14.950382+00	32
206	Rosca Direta com Barra W	biceps	4	8	120	25.00	Evite o uso de impulso (roubo).	3	2026-03-29 18:06:14.950498+00	32
207	Rosca Martelo com Halteres	biceps	3	10	90	14.00	Excelente para braquial e antebraço.	4	2026-03-29 18:06:14.95061+00	32
208	Desenvolvimento com Barra Sentado	shoulders	5	5	180	40.00	Sentado para proteger o metatarso de pressões de equilíbrio.	0	2026-03-29 18:06:14.95085+00	33
209	Elevação Lateral com Halteres	shoulders	4	10	90	10.00	Mantenha leve flexão nos cotovelos.	1	2026-03-29 18:06:14.950974+00	33
210	Crucifixo Inverso com Halteres	shoulders	3	12	90	8.00	Foco no deltoide posterior.	2	2026-03-29 18:06:14.951093+00	33
211	Abdominal Infra no Banco	abs	4	15	60	0.00	Controle a descida das pernas.	3	2026-03-29 18:06:14.95121+00	33
212	Prancha Abdominal	abs	3	1	60	0.00	Duração de 60 segundos por série; apoie nos antebraços.	4	2026-03-29 18:06:14.951327+00	33
213	Agachamento Livre com Barra	legs	5	5	180	60.00	Distribua o peso no calcanhar; evite pressão na borda externa do pé.	0	2026-03-29 18:06:14.951562+00	34
214	Leg Press 45°	legs	4	8	150	120.00	Posicione os pés de forma estável na plataforma.	1	2026-03-29 18:06:14.951675+00	34
215	Cadeira Extensora	legs	3	12	90	45.00	Cadência controlada.	2	2026-03-29 18:06:14.951788+00	34
216	Mesa Flexora	legs	4	10	90	35.00	Mantenha o quadril colado no banco.	3	2026-03-29 18:06:14.951905+00	34
217	Panturrilha Sentado	calves	4	15	90	30.00	Exercício seguro para o metatarso, pois não exige equilíbrio em pé.	4	2026-03-29 18:06:14.95202+00	34
218	Supino Reto	chest	3	10	90	40.00	Controle na descida e subida	0	2026-03-29 20:41:39.355206+00	35
219	Supino Inclinado com Halteres	chest	3	10	90	14.00	Foco na parte superior do peito	1	2026-03-29 20:41:39.356843+00	35
220	Crucifixo em Máquina	chest	3	12	60	25.00	Movimento controlado	2	2026-03-29 20:41:39.357338+00	35
221	Crossover na Polia	chest	3	12	60	20.00	Contração máxima no final	3	2026-03-29 20:41:39.357587+00	35
222	Tríceps Pulley	triceps	3	12	60	25.00	Cotovelos fixos	4	2026-03-29 20:41:39.357773+00	35
223	Tríceps Testa	triceps	3	10	60	20.00	Evitar abrir os cotovelos	5	2026-03-29 20:41:39.357936+00	35
224	Puxada Frontal	back	3	10	90	40.00	Puxar até o peito	0	2026-03-29 20:41:39.358528+00	36
225	Remada Curvada com Barra	back	3	10	90	35.00	Manter postura neutra	1	2026-03-29 20:41:39.358768+00	36
226	Remada Baixa na Polia	back	3	12	60	35.00	Contração no final	2	2026-03-29 20:41:39.359+00	36
227	Pulldown com Braços Estendidos	back	3	12	60	20.00	Foco no dorsal	3	2026-03-29 20:41:39.359144+00	36
228	Rosca Direta	biceps	3	10	60	20.00	Sem balanço	4	2026-03-29 20:41:39.359297+00	36
229	Rosca Alternada	biceps	3	12	60	10.00	Movimento controlado	5	2026-03-29 20:41:39.359449+00	36
230	Agachamento Livre	legs	3	10	90	40.00	Descer até 90 graus	0	2026-03-29 20:41:39.360544+00	37
231	Leg Press 45°	legs	3	12	90	120.00	Pés alinhados	1	2026-03-29 20:41:39.361151+00	37
232	Cadeira Extensora	legs	3	12	60	40.00	Segurar no topo	2	2026-03-29 20:41:39.36152+00	37
233	Afundo com Halteres	legs	3	10	60	12.00	Alternar pernas	3	2026-03-29 20:41:39.361869+00	37
234	Panturrilha em Pé	calves	4	15	60	50.00	Movimento completo	4	2026-03-29 20:41:39.362338+00	37
235	Desenvolvimento com Halteres	shoulders	3	10	90	12.00	Evitar sobrecarga na lombar	0	2026-03-29 20:41:39.36297+00	38
236	Elevação Lateral	shoulders	3	12	60	8.00	Sem impulso	1	2026-03-29 20:41:39.363466+00	38
237	Elevação Frontal	shoulders	3	12	60	8.00	Alternado	2	2026-03-29 20:41:39.363775+00	38
238	Crucifixo Inverso	shoulders	3	12	60	20.00	Foco no posterior	3	2026-03-29 20:41:39.364074+00	38
239	Abdominal Supra	abs	3	15	45	0.00	Contração máxima	4	2026-03-29 20:41:39.364371+00	38
240	Prancha	abs	3	30	45	0.00	Segundos de execução	5	2026-03-29 20:41:39.364674+00	38
241	Levantamento Terra	legs	3	10	90	50.00	Postura neutra	0	2026-03-29 20:41:39.365195+00	39
242	Mesa Flexora	legs	3	12	60	35.00	Controle total	1	2026-03-29 20:41:39.365353+00	39
243	Stiff com Halteres	legs	3	10	60	20.00	Alongamento posterior	2	2026-03-29 20:41:39.365496+00	39
244	Glúteo na Máquina	glutes	3	12	60	30.00	Contração máxima	3	2026-03-29 20:41:39.365638+00	39
245	Elevação de Quadril	glutes	3	12	60	40.00	Segurar no topo	4	2026-03-29 20:41:39.36579+00	39
246	Panturrilha Sentado	calves	4	15	60	40.00	Amplitude total	5	2026-03-29 20:41:39.36598+00	39
247	Supino Reto	chest	4	8	90	70.00	Controle na descida e explosão na subida	0	2026-03-29 21:23:28.324128+00	40
248	Supino Inclinado com Halteres	chest	3	10	75	24.00	Amplitude completa	1	2026-03-29 21:23:28.324436+00	40
249	Crucifixo na Máquina	chest	3	12	60	50.00	Foco na contração	2	2026-03-29 21:23:28.324601+00	40
250	Desenvolvimento com Halteres	shoulders	3	10	75	20.00	Evitar arquear a lombar	3	2026-03-29 21:23:28.324763+00	40
251	Elevação Lateral	shoulders	3	12	60	10.00	Movimento controlado	4	2026-03-29 21:23:28.324908+00	40
252	Tríceps na Polia	triceps	3	12	60	40.00	Cotovelos fixos	5	2026-03-29 21:23:28.32504+00	40
253	Tríceps Francês com Halter	triceps	3	10	60	18.00	Alongamento total	6	2026-03-29 21:23:28.325165+00	40
254	Puxada Frontal	back	4	8	90	70.00	Puxar até a altura do peito	0	2026-03-29 21:23:28.325415+00	41
255	Remada Curvada com Barra	back	3	8	90	60.00	Manter postura firme	1	2026-03-29 21:23:28.325536+00	41
256	Remada Baixa na Polia	back	3	10	75	55.00	Foco na contração das escápulas	2	2026-03-29 21:23:28.325654+00	41
257	Pulldown com Braço Reto	back	3	12	60	35.00	Alongamento do dorsal	3	2026-03-29 21:23:28.325781+00	41
258	Rosca Direta com Barra	biceps	3	10	60	35.00	Sem balanço do corpo	4	2026-03-29 21:23:28.325903+00	41
259	Rosca Alternada com Halteres	biceps	3	10	60	14.00	Supinar o punho	5	2026-03-29 21:23:28.326114+00	41
260	Rosca Concentrada	biceps	3	12	60	12.00	Execução lenta	6	2026-03-29 21:23:28.326233+00	41
261	Agachamento Livre	legs	4	8	90	80.00	Descer até 90 graus	0	2026-03-29 21:23:28.326498+00	42
262	Leg Press 45°	legs	3	10	90	180.00	Não travar os joelhos	1	2026-03-29 21:23:28.326625+00	42
263	Cadeira Extensora	legs	3	12	60	70.00	Segurar no topo	2	2026-03-29 21:23:28.326745+00	42
264	Mesa Flexora	legs	3	12	60	60.00	Controle total	3	2026-03-29 21:23:28.326862+00	42
265	Afundo com Halteres	glutes	3	10	75	20.00	Passo firme e controlado	4	2026-03-29 21:23:28.326979+00	42
266	Elevação de Panturrilha em Pé	calves	4	15	60	80.00	Pausa no topo	5	2026-03-29 21:23:28.327094+00	42
267	Elevação de Panturrilha Sentado	calves	3	15	60	50.00	Amplitude completa	6	2026-03-29 21:23:28.32721+00	42
268	Abdominal na Máquina	abs	3	15	45	40.00	Contração máxima	7	2026-03-29 21:23:28.327326+00	42
269	Supino Reto com Barra	chest	4	10	90	60.00	Movimento controlado na fase excêntrica	0	2026-03-30 11:46:51.814465+00	43
270	Supino Inclinado com Halteres	chest	3	12	75	24.00	Foco na porção superior do peito	1	2026-03-30 11:46:51.816614+00	43
271	Crucifixo na Polia Baixa	chest	3	15	60	15.00	Manter os cotovelos levemente flexionados	2	2026-03-30 11:46:51.81699+00	43
272	Desenvolvimento com Halteres	shoulders	3	10	90	18.00	Sentado com as costas bem apoiadas	3	2026-03-30 11:46:51.817358+00	43
273	Elevação Lateral	shoulders	4	12	60	10.00	Focar na abdução lateral sem balançar	4	2026-03-30 11:46:51.8177+00	43
274	Tríceps Pulley	triceps	3	12	60	30.00	Extensão máxima do cotovelo	5	2026-03-30 11:46:51.818018+00	43
275	Tríceps Testa	triceps	3	10	60	20.00	Pode ser feito com barra EZ ou halteres	6	2026-03-30 11:46:51.818325+00	43
276	Puxada Frontal	back	4	10	90	55.00	Puxar a barra em direção ao peito	0	2026-03-30 11:46:51.818928+00	44
277	Remada Curvada com Barra	back	4	8	90	50.00	Manter a coluna neutra e abdômen contraído	1	2026-03-30 11:46:51.819225+00	44
278	Remada Baixa	back	3	12	75	45.00	Utilizar o triângulo para pegada neutra	2	2026-03-30 11:46:51.819516+00	44
279	Crucifixo Inverso	shoulders	3	15	60	8.00	Foco no deltoide posterior	3	2026-03-30 11:46:51.819802+00	44
280	Rosca Direta com Barra	biceps	3	10	60	25.00	Evitar o uso de impulsão com o corpo	4	2026-03-30 11:46:51.820086+00	44
281	Rosca Martelo	biceps	3	12	60	12.00	Trabalha o bíceps e braquiorradial	5	2026-03-30 11:46:51.82037+00	44
282	Rosca Inversa	forearms	3	12	45	15.00	Pegada pronada	6	2026-03-30 11:46:51.820655+00	44
283	Agachamento Livre	legs	4	8	120	70.00	Foco na amplitude e técnica	0	2026-03-30 11:46:51.821315+00	45
284	Leg Press 45°	legs	3	12	90	160.00	Não travar os joelhos na extensão	1	2026-03-30 11:46:51.82157+00	45
285	Cadeira Extensora	legs	3	15	60	40.00	Pico de contração de 1 segundo no topo	2	2026-03-30 11:46:51.821809+00	45
286	Stiff	legs	3	10	90	50.00	Foco no alongamento dos posteriores	3	2026-03-30 11:46:51.822042+00	45
287	Mesa Flexora	legs	3	12	60	35.00	Manter o quadril colado ao banco	4	2026-03-30 11:46:51.822364+00	45
288	Gêmeos Sentado	calves	4	15	60	40.00	Movimento lento e cadenciado	5	2026-03-30 11:46:51.822567+00	45
289	Abdominal Infra na Paralela	abs	3	15	60	0.00	Controlar a descida das pernas	6	2026-03-30 11:46:51.822833+00	45
290	Flexão de Braço	chest	4	15	75	0.00	Mãos na largura dos ombros, desça o peito até próximo ao chão	0	2026-03-30 11:52:56.640828+00	46
291	Flexão Fechada	chest	3	12	75	0.00	Mãos próximas, ativa mais a parte interna do peito	1	2026-03-30 11:52:56.64284+00	46
292	Flexão Declinada	chest	3	12	75	0.00	Pés elevados em cadeira ou sofá, foca na parte superior do peito	2	2026-03-30 11:52:56.643037+00	46
293	Elevação Lateral com Garrafa	shoulders	3	15	60	1.00	Use garrafas d'água como carga, cotovelo levemente flexionado	3	2026-03-30 11:52:56.643195+00	46
294	Desenvolvimento com Garrafa	shoulders	3	12	60	1.00	Empurra acima da cabeça, não trave o cotovelo no topo	4	2026-03-30 11:52:56.643346+00	46
295	Tríceps Banco	triceps	4	15	60	0.00	Mãos no banco ou cadeira atrás do corpo, desça até cotovelo em 90 graus	5	2026-03-30 11:52:56.643483+00	46
296	Flexão Diamante	triceps	3	10	75	0.00	Mãos formando triângulo, cotovelos fechados ao longo do corpo	6	2026-03-30 11:52:56.643815+00	46
297	Barra Fixa	back	4	8	90	0.00	Pegada supinada ou pronada, puxe o peito até a barra	0	2026-03-30 11:52:56.644426+00	47
298	Remada com Garrafa	back	4	12	75	2.00	Apoie uma mão e joelho no banco, puxe o cotovelo para trás e para cima	1	2026-03-30 11:52:56.644655+00	47
299	Superman	back	3	15	60	0.00	Deitada de bruços, eleva braços e pernas simultaneamente, segura 2 segundos no topo	2	2026-03-30 11:52:56.64492+00	47
300	Remada Invertida	back	3	12	75	0.00	Sob uma mesa firme, puxe o peito até a superfície	3	2026-03-30 11:52:56.645109+00	47
301	Rosca Direta com Garrafa	biceps	4	12	60	1.00	Cotovelo fixo ao lado do corpo, suba até 90 graus e desça controlado	4	2026-03-30 11:52:56.645267+00	47
302	Rosca Martelo com Garrafa	biceps	3	12	60	1.00	Pegada neutra, polegar apontado para cima durante todo o movimento	5	2026-03-30 11:52:56.645406+00	47
303	Agachamento Livre	legs	4	15	90	0.00	Pés na largura dos ombros, desça até coxa paralela ao chão, joelho não ultrapassa o pé	0	2026-03-30 11:52:56.645675+00	48
304	Agachamento Búlgaro	legs	3	12	75	0.00	Pé traseiro elevado em cadeira, desça até joelho da frente em 90 graus	1	2026-03-30 11:52:56.645813+00	48
305	Avanço	legs	3	12	75	0.00	Passo largo à frente, joelho traseiro quase toca o chão, alterna as pernas	2	2026-03-30 11:52:56.645939+00	48
306	Ponte de Glúteo	glutes	4	20	60	0.00	Deitada, pés no chão, eleva o quadril e aperta o glúteo no topo por 2 segundos	3	2026-03-30 11:52:56.646061+00	48
307	Elevação Pélvica Unilateral	glutes	3	15	60	0.00	Igual ponte mas com uma perna elevada, maior ativação do glúteo	4	2026-03-30 11:52:56.646178+00	48
308	Cadeira Extensora Improvisada	legs	3	15	60	0.00	Sentada na borda de cadeira firme, estende a perna até ficar reta, segura 1 segundo	5	2026-03-30 11:52:56.646295+00	48
309	Panturrilha em Pé	calves	4	20	45	0.00	Em pé, sobe na ponta dos pés lentamente, desce controlado, pode usar degrau para amplitude maior	6	2026-03-30 11:52:56.646411+00	48
310	Abdominal Infra	abs	3	15	60	0.00	Deitada, pernas estendidas, eleva até 90 graus e desce sem tocar o chão	7	2026-03-30 11:52:56.646529+00	48
311	Supino Reto com Barra	chest	4	8	90	70.00	Priorize carga progressiva e execução controlada	0	2026-03-30 13:04:12.202251+00	49
312	Supino Inclinado com Halteres	chest	3	10	75	26.00	Foco na parte superior do peitoral	1	2026-03-30 13:04:12.202552+00	49
313	Crossover na Polia	chest	3	12	60	25.00	Contração máxima no final do movimento	2	2026-03-30 13:04:12.202727+00	49
314	Desenvolvimento com Halteres	shoulders	3	10	75	22.00	Evite compensação com lombar	3	2026-03-30 13:04:12.202873+00	49
315	Elevação Lateral	shoulders	3	12	60	10.00	Controle na descida	4	2026-03-30 13:04:12.203007+00	49
316	Tríceps Corda na Polia	triceps	3	12	60	30.00	Abrir a corda no final	5	2026-03-30 13:04:12.203138+00	49
317	Tríceps Francês com Halter	triceps	3	10	60	18.00	Controle total do movimento	6	2026-03-30 13:04:12.203439+00	49
318	Puxada Frontal na Polia	back	4	8	90	65.00	Foco na largura dorsal	0	2026-03-30 13:04:12.204286+00	50
319	Remada Curvada com Barra	back	4	8	90	70.00	Manter coluna neutra	1	2026-03-30 13:04:12.204618+00	50
320	Remada Unilateral com Halter	back	3	10	75	28.00	Foco na contração	2	2026-03-30 13:04:12.205071+00	50
321	Pulldown na Polia	back	3	12	60	30.00	Isolamento de dorsais	3	2026-03-30 13:04:12.205445+00	50
322	Rosca Direta com Barra	biceps	3	10	60	35.00	Evitar balanço do corpo	4	2026-03-30 13:04:12.205819+00	50
323	Rosca Alternada com Halteres	biceps	3	12	60	14.00	Movimento controlado	5	2026-03-30 13:04:12.206193+00	50
324	Rosca Concentrada	biceps	3	12	60	12.00	Foco total no bíceps	6	2026-03-30 13:04:12.206563+00	50
325	Leg Press 45°	legs	4	10	90	180.00	Amplitude moderada, sem forçar o joelho	0	2026-03-30 13:04:12.207248+00	51
326	Cadeira Extensora	legs	3	12	60	50.00	Movimento controlado, sem travar o joelho	1	2026-03-30 13:04:12.207558+00	51
327	Mesa Flexora	legs	3	12	60	45.00	Foco em posteriores	2	2026-03-30 13:04:12.207854+00	51
328	Stiff com Halteres	glutes	3	10	75	30.00	Pouca flexão de joelho	3	2026-03-30 13:04:12.208147+00	51
329	Glúteo na Polia	glutes	3	12	60	20.00	Foco em glúteos	4	2026-03-30 13:04:12.208434+00	51
330	Elevação de Panturrilha em Pé	calves	4	15	60	60.00	Pausa no topo	5	2026-03-30 13:04:12.208728+00	51
331	Elevação de Panturrilha Sentado	calves	3	15	60	50.00	Controle total	6	2026-03-30 13:04:12.209039+00	51
332	Supino Reto com Barra	chest	4	6	60	\N		0	2026-03-30 14:58:04.352207+00	52
\.


--
-- Data for Name: workouts_exerciselog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workouts_exerciselog (id, set_number, reps_done, weight_kg, rest_seconds_taken, is_completed, notes, logged_at, exercise_id, session_id, execution_seconds, exercise_name_snapshot, muscle_group_snapshot, planned_reps, planned_rest_seconds, planned_weight_kg, rpe, volume_kg) FROM stdin;
78	1	10	60.00	\N	t		2026-03-30 11:47:33.234772+00	269	18	\N	Supino Reto com Barra	chest	10	90	60.00	\N	600.00
79	1	8	70.00	\N	t		2026-03-30 13:04:47.01106+00	311	20	\N	Supino Reto com Barra	chest	8	90	70.00	\N	560.00
80	2	8	70.00	\N	t		2026-03-30 13:05:43.953008+00	311	20	\N	Supino Reto com Barra	chest	8	90	70.00	\N	560.00
81	3	8	70.00	\N	t		2026-03-30 13:05:46.415915+00	311	20	\N	Supino Reto com Barra	chest	8	90	70.00	\N	560.00
82	4	8	70.00	\N	t		2026-03-30 13:05:49.173405+00	311	20	\N	Supino Reto com Barra	chest	8	90	70.00	\N	560.00
83	1	6	\N	\N	t		2026-03-30 14:58:10.62073+00	332	21	\N	Supino Reto com Barra	chest	6	60	\N	\N	0.00
84	2	6	\N	\N	t		2026-03-30 14:58:15.945876+00	332	21	\N	Supino Reto com Barra	chest	6	60	\N	\N	0.00
85	3	6	\N	\N	t		2026-03-30 14:58:17.78201+00	332	21	\N	Supino Reto com Barra	chest	6	60	\N	\N	0.00
86	4	6	\N	\N	t		2026-03-30 14:58:19.256144+00	332	21	\N	Supino Reto com Barra	chest	6	60	\N	\N	0.00
87	1	5	60.00	\N	t		2026-03-30 21:03:36.074402+00	198	22	\N	Supino Reto com Barra	chest	5	180	60.00	\N	300.00
88	2	5	60.00	\N	t		2026-03-30 21:03:37.571688+00	198	22	\N	Supino Reto com Barra	chest	5	180	60.00	\N	300.00
89	3	5	60.00	\N	t		2026-03-30 21:03:38.8402+00	198	22	\N	Supino Reto com Barra	chest	5	180	60.00	\N	300.00
90	1	10	20.00	\N	t		2026-03-30 21:57:43.589712+00	180	24	\N	Remada Unilateral com Halter (Serrote)	back	10	60	20.00	\N	200.00
91	2	10	30.00	\N	t		2026-03-30 22:00:01.318093+00	180	24	\N	Remada Unilateral com Halter (Serrote)	back	10	60	20.00	\N	300.00
92	3	10	30.00	\N	t		2026-03-30 22:01:59.870683+00	180	24	\N	Remada Unilateral com Halter (Serrote)	back	10	60	20.00	\N	300.00
93	1	10	18.00	\N	t		2026-03-30 22:05:36.87582+00	181	24	\N	Rosca Direta com Barra W	biceps	10	60	12.00	\N	180.00
94	2	10	18.00	\N	t		2026-03-30 22:07:28.500876+00	181	24	\N	Rosca Direta com Barra W	biceps	10	60	12.00	\N	180.00
95	3	10	18.00	\N	t		2026-03-30 22:08:57.208666+00	181	24	\N	Rosca Direta com Barra W	biceps	10	60	12.00	\N	180.00
96	4	10	18.00	\N	t		2026-03-30 22:10:33.923326+00	181	24	\N	Rosca Direta com Barra W	biceps	10	60	12.00	\N	180.00
97	1	12	10.00	\N	t		2026-03-30 22:12:37.906371+00	182	24	\N	Rosca Alternada com Halteres	biceps	12	60	10.00	\N	120.00
98	2	12	8.00	\N	t		2026-03-30 22:15:10.390158+00	182	24	\N	Rosca Alternada com Halteres	biceps	12	60	10.00	\N	96.00
99	3	12	8.00	\N	t		2026-03-30 22:17:12.922356+00	182	24	\N	Rosca Alternada com Halteres	biceps	12	60	10.00	\N	96.00
100	1	12	8.00	\N	t		2026-03-30 22:19:01.744222+00	183	24	\N	Rosca Martelo	biceps	12	60	10.00	\N	96.00
101	2	12	8.00	\N	t		2026-03-30 22:21:09.306165+00	183	24	\N	Rosca Martelo	biceps	12	60	10.00	\N	96.00
102	3	12	8.00	\N	t		2026-03-30 22:23:19.882544+00	183	24	\N	Rosca Martelo	biceps	12	60	10.00	\N	96.00
103	1	12	30.00	\N	t		2026-03-30 22:29:04.264224+00	179	24	\N	Puxada Alta com Pegada Supinada	back	12	60	45.00	\N	360.00
104	2	12	30.00	\N	t		2026-03-30 22:30:55.766873+00	179	24	\N	Puxada Alta com Pegada Supinada	back	12	60	45.00	\N	360.00
105	3	12	30.00	\N	t		2026-03-30 22:32:38.858127+00	179	24	\N	Puxada Alta com Pegada Supinada	back	12	60	45.00	\N	360.00
106	1	15	30.00	\N	t		2026-03-30 22:36:31.246596+00	177	24	\N	Puxada Frontal Aberta	back	10	90	50.00	\N	450.00
107	2	10	50.00	\N	t		2026-03-30 22:38:48.856702+00	177	24	\N	Puxada Frontal Aberta	back	10	90	50.00	\N	500.00
108	3	10	50.00	\N	t		2026-03-30 22:40:49.789383+00	177	24	\N	Puxada Frontal Aberta	back	10	90	50.00	\N	500.00
109	4	10	50.00	\N	t		2026-03-30 22:43:00.478599+00	177	24	\N	Puxada Frontal Aberta	back	10	90	50.00	\N	500.00
110	1	12	40.00	\N	t		2026-03-30 22:48:11.302009+00	178	24	\N	Remada Baixa com Triângulo	back	12	60	40.00	\N	480.00
111	2	12	30.00	\N	t		2026-03-30 22:49:57.202148+00	178	24	\N	Remada Baixa com Triângulo	back	12	60	40.00	\N	360.00
112	3	12	30.00	\N	t		2026-03-30 22:51:37.486359+00	178	24	\N	Remada Baixa com Triângulo	back	12	60	40.00	\N	360.00
113	1	10	12.00	\N	t		2026-04-01 21:57:50.440217+00	184	25	\N	Desenvolvimento com Halteres Sentado	shoulders	10	90	14.00	\N	120.00
114	2	10	12.00	\N	t		2026-04-01 22:00:37.621757+00	184	25	\N	Desenvolvimento com Halteres Sentado	shoulders	10	90	14.00	\N	120.00
115	3	10	12.00	\N	t		2026-04-01 22:02:41.159873+00	184	25	\N	Desenvolvimento com Halteres Sentado	shoulders	10	90	14.00	\N	120.00
116	4	10	12.00	\N	t		2026-04-01 22:05:01.959389+00	184	25	\N	Desenvolvimento com Halteres Sentado	shoulders	10	90	14.00	\N	120.00
118	1	12	8.00	\N	t		2026-04-01 22:07:31.671617+00	186	25	\N	Elevação Frontal com Halteres	shoulders	12	60	8.00	\N	96.00
119	2	12	8.00	\N	t		2026-04-01 22:09:17.652558+00	186	25	\N	Elevação Frontal com Halteres	shoulders	12	60	8.00	\N	96.00
120	3	12	8.00	\N	t		2026-04-01 22:10:59.647854+00	186	25	\N	Elevação Frontal com Halteres	shoulders	12	60	8.00	\N	96.00
121	1	12	8.00	\N	t		2026-04-01 22:13:10.196473+00	185	25	\N	Elevação Lateral com Halteres	shoulders	12	60	8.00	\N	96.00
122	2	12	6.00	\N	t		2026-04-01 22:14:59.366704+00	185	25	\N	Elevação Lateral com Halteres	shoulders	12	60	8.00	\N	72.00
123	3	12	6.00	\N	t		2026-04-01 22:16:53.956255+00	185	25	\N	Elevação Lateral com Halteres	shoulders	12	60	8.00	\N	72.00
124	4	12	6.00	\N	t		2026-04-01 22:18:56.935884+00	185	25	\N	Elevação Lateral com Halteres	shoulders	12	60	8.00	\N	72.00
125	1	15	22.00	\N	t		2026-04-01 22:21:16.291378+00	188	25	\N	Encolhimento com Halteres	shoulders	15	60	24.00	\N	330.00
126	2	15	20.00	\N	t		2026-04-01 22:22:52.745899+00	188	25	\N	Encolhimento com Halteres	shoulders	15	60	24.00	\N	300.00
127	3	15	20.00	\N	t		2026-04-01 22:24:44.144287+00	188	25	\N	Encolhimento com Halteres	shoulders	15	60	24.00	\N	300.00
128	1	20	0.00	\N	t		2026-04-01 22:29:40.283645+00	189	25	\N	Abdominal Supra (Crunch) no Solo	abs	20	45	0.00	\N	0.00
129	2	15	0.00	\N	t		2026-04-01 22:31:11.998345+00	189	25	\N	Abdominal Supra (Crunch) no Solo	abs	20	45	0.00	\N	0.00
131	1	12	30.00	\N	t		2026-04-01 22:36:24.944144+00	187	25	\N	Crucifixo Inverso no Peck Deck	shoulders	15	60	30.00	\N	360.00
132	2	12	30.00	\N	t		2026-04-01 22:36:26.554519+00	187	25	\N	Crucifixo Inverso no Peck Deck	shoulders	15	60	30.00	\N	360.00
133	3	12	30.00	\N	t		2026-04-01 22:38:15.060826+00	187	25	\N	Crucifixo Inverso no Peck Deck	shoulders	15	60	30.00	\N	360.00
\.


--
-- Data for Name: workouts_workout; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workouts_workout (id, name, description, workout_type, is_active, created_at, updated_at, user_id) FROM stdin;
5	Treino Funcional ABCD - Administreino	Programa de treinamento funcional intermediário focado em padrões de movimento fundamentais (empurrar, puxar, agachar, dobrar), estabilidade de core e condicionamento.	functional	f	2026-03-29 16:44:58.123671+00	2026-03-29 16:56:15.009681+00	1
19	ABCD Cardio & Metabolic Conditioning - Dia D	Programa ABCD focado em resistência cardiovascular e queima calórica, utilizando circuitos e intervalos curtos. | Foco: Core e Recuperação Ativa (HIIT)	cardio	f	2026-03-29 17:12:25.810431+00	2026-03-29 17:14:33.377074+00	2
18	ABCD Cardio & Metabolic Conditioning - Dia C	Programa ABCD focado em resistência cardiovascular e queima calórica, utilizando circuitos e intervalos curtos. | Foco: Full Body e Potência Metabólica	cardio	f	2026-03-29 17:12:25.808279+00	2026-03-29 17:14:35.560215+00	2
17	ABCD Cardio & Metabolic Conditioning - Dia B	Programa ABCD focado em resistência cardiovascular e queima calórica, utilizando circuitos e intervalos curtos. | Foco: Membros Superiores e Resistência Muscular	cardio	f	2026-03-29 17:12:25.806084+00	2026-03-29 17:14:37.165121+00	2
16	ABCD Cardio & Metabolic Conditioning - Dia A	Programa ABCD focado em resistência cardiovascular e queima calórica, utilizando circuitos e intervalos curtos. | Foco: Membros Inferiores e Cardio de Alta Intensidade	cardio	f	2026-03-29 17:12:25.802946+00	2026-03-29 17:14:38.973086+00	2
10	Nome do Treino ABCD - Dia A	Descrição breve do programa | Foco: Focos musculares do dia A	cardio	f	2026-03-29 17:09:14.368331+00	2026-03-29 17:14:41.292312+00	2
22	Programa ABC Hipertrofia Essencial - Dia C	Treino Push/Pull/Legs focado em hipertrofia para nível iniciante-intermediário, priorizando movimentos compostos e isolamento muscular. | Foco: Pernas e Panturrilhas (Legs)	hypertrophy	f	2026-03-29 17:16:08.018515+00	2026-03-29 17:46:02.286776+00	2
21	Programa ABC Hipertrofia Essencial - Dia B	Treino Push/Pull/Legs focado em hipertrofia para nível iniciante-intermediário, priorizando movimentos compostos e isolamento muscular. | Foco: Costas e Bíceps (Pull)	hypertrophy	f	2026-03-29 17:16:08.017563+00	2026-03-29 17:46:03.927239+00	2
20	Programa ABC Hipertrofia Essencial - Dia A	Treino Push/Pull/Legs focado em hipertrofia para nível iniciante-intermediário, priorizando movimentos compostos e isolamento muscular. | Foco: Peito, Ombros e Tríceps (Push)	hypertrophy	f	2026-03-29 17:16:08.016085+00	2026-03-29 17:46:06.458638+00	2
23	Treino ABCD Hipertrofia Iniciante - Dia A	Programa de treino ABCD para iniciantes com foco em hipertrofia, utilizando equipamentos completos e sessões de aproximadamente 60 minutos. | Foco: Peito e Tríceps	hypertrophy	t	2026-03-29 17:49:31.595054+00	2026-03-29 17:49:31.595064+00	2
24	Treino ABCD Hipertrofia Iniciante - Dia B	Programa de treino ABCD para iniciantes com foco em hipertrofia, utilizando equipamentos completos e sessões de aproximadamente 60 minutos. | Foco: Costas e Bíceps	hypertrophy	t	2026-03-29 17:49:31.599921+00	2026-03-29 17:49:31.599927+00	2
25	Treino ABCD Hipertrofia Iniciante - Dia C	Programa de treino ABCD para iniciantes com foco em hipertrofia, utilizando equipamentos completos e sessões de aproximadamente 60 minutos. | Foco: Pernas e Glúteos	hypertrophy	t	2026-03-29 17:49:31.601825+00	2026-03-29 17:49:31.601831+00	2
26	Treino ABCD Hipertrofia Iniciante - Dia D	Programa de treino ABCD para iniciantes com foco em hipertrofia, utilizando equipamentos completos e sessões de aproximadamente 60 minutos. | Foco: Ombros e Abdômen	hypertrophy	t	2026-03-29 17:49:31.603663+00	2026-03-29 17:49:31.603669+00	2
15	Programa ABCDE Força Estruturada - Dia E	Treino de força para nível intermediário com foco em progressão de carga e segurança para membro inferior | Foco: Full body (força técnica)	strength	f	2026-03-29 17:11:29.292749+00	2026-03-29 18:00:11.311053+00	1
14	Programa ABCDE Força Estruturada - Dia D	Treino de força para nível intermediário com foco em progressão de carga e segurança para membro inferior | Foco: Ombros e core	strength	f	2026-03-29 17:11:29.291914+00	2026-03-29 18:00:13.035624+00	1
13	Programa ABCDE Força Estruturada - Dia C	Treino de força para nível intermediário com foco em progressão de carga e segurança para membro inferior | Foco: Pernas (ênfase segura)	strength	f	2026-03-29 17:11:29.291072+00	2026-03-29 18:00:15.039589+00	1
12	Programa ABCDE Força Estruturada - Dia B	Treino de força para nível intermediário com foco em progressão de carga e segurança para membro inferior | Foco: Costas e bíceps	strength	f	2026-03-29 17:11:29.290202+00	2026-03-29 18:00:16.575444+00	1
11	Programa ABCDE Força Estruturada - Dia A	Treino de força para nível intermediário com foco em progressão de carga e segurança para membro inferior | Foco: Peito e tríceps	strength	f	2026-03-29 17:11:29.287423+00	2026-03-29 18:00:18.081356+00	1
9	ABCD Funcional Pro - Dia D	Programa de treino funcional de 4 dias focado em força composta, estabilidade de core e movimentos multiarticulares para nível intermediário. | Foco: Dominância de Quadril e Condicionamento Metabólico	functional	f	2026-03-29 16:57:13.367985+00	2026-03-29 18:00:19.578337+00	1
8	ABCD Funcional Pro - Dia C	Programa de treino funcional de 4 dias focado em força composta, estabilidade de core e movimentos multiarticulares para nível intermediário. | Foco: Dominância de Joelho e Mobilidade Ativa	functional	f	2026-03-29 16:57:13.365751+00	2026-03-29 18:00:25.659119+00	1
7	ABCD Funcional Pro - Dia B	Programa de treino funcional de 4 dias focado em força composta, estabilidade de core e movimentos multiarticulares para nível intermediário. | Foco: Empurre, Estabilidade de Ombro e Potência	functional	f	2026-03-29 16:57:13.363291+00	2026-03-29 18:00:27.338622+00	1
6	ABCD Funcional Pro - Dia A	Programa de treino funcional de 4 dias focado em força composta, estabilidade de core e movimentos multiarticulares para nível intermediário. | Foco: Tração, Cadeia Posterior e Core Estático	functional	f	2026-03-29 16:57:13.357268+00	2026-03-29 18:00:28.911687+00	1
4	Treino D - Ombros e Trapézio		hypertrophy	f	2026-03-28 23:31:49.377785+00	2026-03-29 18:00:30.956836+00	1
3	Treino C - Pernas		hypertrophy	f	2026-03-28 23:28:06.038161+00	2026-03-29 18:00:34.777379+00	1
2	Treino B - Costas e Bíceps		hypertrophy	f	2026-03-28 23:24:38.733999+00	2026-03-29 18:00:51.882312+00	1
1	Treino A - Peito e Tríceps		hypertrophy	f	2026-03-28 23:20:54.129597+00	2026-03-29 18:00:54.018408+00	1
27	Programa ABCD Hipertrofia e Recuperação Funcional - Dia A	Treino intermediário focado em hipertrofia, com seleção de exercícios que minimizam o impacto e a torção no 5º metatarso, priorizando estabilidade. | Foco: Peito e Tríceps	hypertrophy	t	2026-03-29 18:04:10.461119+00	2026-03-29 18:04:10.46113+00	1
28	Programa ABCD Hipertrofia e Recuperação Funcional - Dia B	Treino intermediário focado em hipertrofia, com seleção de exercícios que minimizam o impacto e a torção no 5º metatarso, priorizando estabilidade. | Foco: Costas e Bíceps	hypertrophy	t	2026-03-29 18:04:10.464603+00	2026-03-29 18:04:10.464607+00	1
29	Programa ABCD Hipertrofia e Recuperação Funcional - Dia C	Treino intermediário focado em hipertrofia, com seleção de exercícios que minimizam o impacto e a torção no 5º metatarso, priorizando estabilidade. | Foco: Ombros e Abdômen	hypertrophy	t	2026-03-29 18:04:10.465905+00	2026-03-29 18:04:10.465908+00	1
30	Programa ABCD Hipertrofia e Recuperação Funcional - Dia D	Treino intermediário focado em hipertrofia, com seleção de exercícios que minimizam o impacto e a torção no 5º metatarso, priorizando estabilidade. | Foco: Pernas e Panturrilhas	hypertrophy	t	2026-03-29 18:04:10.466912+00	2026-03-29 18:04:10.466915+00	1
31	Força ABCD - Recuperação Pós-Lesão - Dia A	Programa focado em força bruta com ênfase em exercícios compostos, adaptado para estabilidade pós-fratura de metatarso. | Foco: Peito e Tríceps	strength	t	2026-03-29 18:06:14.948696+00	2026-03-29 18:06:14.948706+00	1
32	Força ABCD - Recuperação Pós-Lesão - Dia B	Programa focado em força bruta com ênfase em exercícios compostos, adaptado para estabilidade pós-fratura de metatarso. | Foco: Costas e Bíceps	strength	t	2026-03-29 18:06:14.950011+00	2026-03-29 18:06:14.950014+00	1
33	Força ABCD - Recuperação Pós-Lesão - Dia C	Programa focado em força bruta com ênfase em exercícios compostos, adaptado para estabilidade pós-fratura de metatarso. | Foco: Ombros e Abdômen	strength	t	2026-03-29 18:06:14.950724+00	2026-03-29 18:06:14.950726+00	1
34	Força ABCD - Recuperação Pós-Lesão - Dia D	Programa focado em força bruta com ênfase em exercícios compostos, adaptado para estabilidade pós-fratura de metatarso. | Foco: Pernas e Panturrilhas	strength	t	2026-03-29 18:06:14.951444+00	2026-03-29 18:06:14.951447+00	1
35	Treino ABCDE Hipertrofia Iniciante - Dia A	Programa de treino dividido em 5 dias focado em hipertrofia muscular para iniciantes, com exercícios compostos e isolados bem distribuídos. | Foco: Peito e Tríceps	hypertrophy	t	2026-03-29 20:41:39.35282+00	2026-03-29 20:41:39.352828+00	1
36	Treino ABCDE Hipertrofia Iniciante - Dia B	Programa de treino dividido em 5 dias focado em hipertrofia muscular para iniciantes, com exercícios compostos e isolados bem distribuídos. | Foco: Costas e Bíceps	hypertrophy	t	2026-03-29 20:41:39.358114+00	2026-03-29 20:41:39.35812+00	1
37	Treino ABCDE Hipertrofia Iniciante - Dia C	Programa de treino dividido em 5 dias focado em hipertrofia muscular para iniciantes, com exercícios compostos e isolados bem distribuídos. | Foco: Pernas (Quadríceps)	hypertrophy	t	2026-03-29 20:41:39.359793+00	2026-03-29 20:41:39.359804+00	1
38	Treino ABCDE Hipertrofia Iniciante - Dia D	Programa de treino dividido em 5 dias focado em hipertrofia muscular para iniciantes, com exercícios compostos e isolados bem distribuídos. | Foco: Ombros e Abdômen	hypertrophy	t	2026-03-29 20:41:39.36266+00	2026-03-29 20:41:39.362667+00	1
39	Treino ABCDE Hipertrofia Iniciante - Dia E	Programa de treino dividido em 5 dias focado em hipertrofia muscular para iniciantes, com exercícios compostos e isolados bem distribuídos. | Foco: Posterior de Perna e Glúteos	hypertrophy	t	2026-03-29 20:41:39.364995+00	2026-03-29 20:41:39.365+00	1
40	Treino ABC Hipertrofia Intermediário - Dia A	Programa ABC voltado para hipertrofia com divisão equilibrada de membros superiores e inferiores, priorizando exercícios compostos e isolados. | Foco: Peito, Ombros e Tríceps	hypertrophy	t	2026-03-29 21:23:28.323322+00	2026-03-29 21:23:28.32333+00	3
41	Treino ABC Hipertrofia Intermediário - Dia B	Programa ABC voltado para hipertrofia com divisão equilibrada de membros superiores e inferiores, priorizando exercícios compostos e isolados. | Foco: Costas e Bíceps	hypertrophy	t	2026-03-29 21:23:28.325289+00	2026-03-29 21:23:28.325292+00	3
42	Treino ABC Hipertrofia Intermediário - Dia C	Programa ABC voltado para hipertrofia com divisão equilibrada de membros superiores e inferiores, priorizando exercícios compostos e isolados. | Foco: Pernas, Glúteos e Panturrilhas	hypertrophy	t	2026-03-29 21:23:28.326364+00	2026-03-29 21:23:28.326367+00	3
43	Programa ABC Hipertrofia Intermediário - Dia A	Treino balanceado para ganho de massa muscular com foco em grandes grupamentos e isolamento complementar. | Foco: Peito, Ombros e Tríceps	hypertrophy	t	2026-03-30 11:46:51.811668+00	2026-03-30 11:46:51.81168+00	4
44	Programa ABC Hipertrofia Intermediário - Dia B	Treino balanceado para ganho de massa muscular com foco em grandes grupamentos e isolamento complementar. | Foco: Costas, Bíceps e Antebraço	hypertrophy	t	2026-03-30 11:46:51.81863+00	2026-03-30 11:46:51.818637+00	4
45	Programa ABC Hipertrofia Intermediário - Dia C	Treino balanceado para ganho de massa muscular com foco em grandes grupamentos e isolamento complementar. | Foco: Pernas, Panturrilhas e Abdômen	hypertrophy	t	2026-03-30 11:46:51.821017+00	2026-03-30 11:46:51.821023+00	4
46	Treino ABC - Hipertrofia Corpo Livre - Dia A	Programa de hipertrofia em 3 dias com corpo livre e materiais básicos, voltado para nível intermediário com sessões de aproximadamente 60 minutos. | Foco: Peito, Ombro e Tríceps	hypertrophy	t	2026-03-30 11:52:56.640385+00	2026-03-30 11:52:56.640393+00	5
47	Treino ABC - Hipertrofia Corpo Livre - Dia B	Programa de hipertrofia em 3 dias com corpo livre e materiais básicos, voltado para nível intermediário com sessões de aproximadamente 60 minutos. | Foco: Costas e Bíceps	hypertrophy	t	2026-03-30 11:52:56.644002+00	2026-03-30 11:52:56.644011+00	5
48	Treino ABC - Hipertrofia Corpo Livre - Dia C	Programa de hipertrofia em 3 dias com corpo livre e materiais básicos, voltado para nível intermediário com sessões de aproximadamente 60 minutos. | Foco: Pernas e Glúteos	hypertrophy	t	2026-03-30 11:52:56.645539+00	2026-03-30 11:52:56.645542+00	5
49	PPL Hipertrofia Intermediário (Ênfase em Peitoral e Dorsais) - Dia A	Programa Push/Pull/Legs com foco em hipertrofia, priorizando peitoral e dorsais, adaptado para proteção do joelho. | Foco: Peitoral, ombros e tríceps	hypertrophy	t	2026-03-30 13:04:12.201794+00	2026-03-30 13:04:12.201802+00	6
50	PPL Hipertrofia Intermediário (Ênfase em Peitoral e Dorsais) - Dia B	Programa Push/Pull/Legs com foco em hipertrofia, priorizando peitoral e dorsais, adaptado para proteção do joelho. | Foco: Costas e bíceps	hypertrophy	t	2026-03-30 13:04:12.203903+00	2026-03-30 13:04:12.20391+00	6
51	PPL Hipertrofia Intermediário (Ênfase em Peitoral e Dorsais) - Dia C	Programa Push/Pull/Legs com foco em hipertrofia, priorizando peitoral e dorsais, adaptado para proteção do joelho. | Foco: Pernas (adaptado para joelho) e panturrilhas	hypertrophy	t	2026-03-30 13:04:12.206936+00	2026-03-30 13:04:12.206942+00	6
52	Treino de Força		strength	t	2026-03-30 14:58:04.301693+00	2026-03-30 14:58:04.301707+00	7
\.


--
-- Data for Name: workouts_workoutsession; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.workouts_workoutsession (id, status, started_at, finished_at, total_duration_seconds, notes, created_at, user_id, workout_id, average_rpe, completed_sets_count, planned_exercises_count, planned_sets_count, total_volume_kg, workout_name_snapshot, workout_type_snapshot) FROM stdin;
18	completed	2026-03-30 11:47:27.19567+00	2026-03-30 11:47:51.558339+00	24		2026-03-30 11:47:27.195865+00	4	43	\N	1	7	23	600.00	Programa ABC Hipertrofia Intermediário - Dia A	hypertrophy
19	in_progress	2026-03-30 11:53:14.141906+00	\N	\N		2026-03-30 11:53:14.142056+00	5	46	\N	0	7	23	0.00	Treino ABC - Hipertrofia Corpo Livre - Dia A	hypertrophy
20	completed	2026-03-30 13:04:23.009149+00	2026-03-30 13:05:59.710177+00	96		2026-03-30 13:04:23.009248+00	6	49	\N	4	7	22	2240.00	PPL Hipertrofia Intermediário (Ênfase em Peitoral e Dorsais) - Dia A	hypertrophy
21	completed	2026-03-30 14:58:06.114966+00	2026-03-30 14:58:19.262091+00	13		2026-03-30 14:58:06.11507+00	7	52	\N	4	1	4	0.00	Treino de Força	strength
25	completed	2026-04-01 21:54:38.545636+00	2026-04-01 22:38:35.457615+00	2636		2026-04-01 21:54:38.54736+00	1	29	\N	19	7	25	3090.00	Programa ABCD Hipertrofia e Recuperação Funcional - Dia C	hypertrophy
24	completed	2026-03-30 21:53:29.086544+00	2026-03-30 22:51:37.491888+00	3488		2026-03-30 21:53:29.086642+00	1	28	\N	23	7	23	6350.00	Programa ABCD Hipertrofia e Recuperação Funcional - Dia B	hypertrophy
22	completed	2026-03-30 21:03:30.486867+00	2026-03-30 21:03:41.094933+00	10		2026-03-30 21:03:30.487022+00	1	31	\N	3	5	19	900.00	Força ABCD - Recuperação Pós-Lesão - Dia A	strength
23	cancelled	2026-03-30 21:52:53.674851+00	2026-03-30 21:53:15.509102+00	\N		2026-03-30 21:52:53.674959+00	1	32	\N	0	5	19	0.00	Força ABCD - Recuperação Pós-Lesão - Dia B	strength
26	cancelled	2026-04-01 22:05:45.239172+00	2026-04-01 22:05:58.491108+00	\N		2026-04-01 22:05:45.23927+00	2	26	\N	0	6	18	0.00	Treino ABCD Hipertrofia Iniciante - Dia D	hypertrophy
27	cancelled	2026-04-01 22:06:30.751953+00	2026-04-01 22:06:40.060048+00	\N		2026-04-01 22:06:30.752106+00	2	24	\N	0	6	18	0.00	Treino ABCD Hipertrofia Iniciante - Dia B	hypertrophy
\.


--
-- Name: auth_group_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_id_seq', 1, false);


--
-- Name: auth_group_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_group_permissions_id_seq', 1, false);


--
-- Name: auth_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.auth_permission_id_seq', 44, true);


--
-- Name: django_admin_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_admin_log_id_seq', 5, true);


--
-- Name: django_content_type_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_content_type_id_seq', 11, true);


--
-- Name: django_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.django_migrations_id_seq', 23, true);


--
-- Name: users_gymlocation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_gymlocation_id_seq', 19, true);


--
-- Name: users_user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_groups_id_seq', 1, false);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_id_seq', 7, true);


--
-- Name: users_user_user_permissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_user_user_permissions_id_seq', 1, false);


--
-- Name: workouts_exercise_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workouts_exercise_id_seq', 332, true);


--
-- Name: workouts_exerciselog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workouts_exerciselog_id_seq', 133, true);


--
-- Name: workouts_workout_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workouts_workout_id_seq', 52, true);


--
-- Name: workouts_workoutsession_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.workouts_workoutsession_id_seq', 27, true);


--
-- Name: auth_group auth_group_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_name_key UNIQUE (name);


--
-- Name: auth_group_permissions auth_group_permissions_group_id_permission_id_0cd325b0_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_permission_id_0cd325b0_uniq UNIQUE (group_id, permission_id);


--
-- Name: auth_group_permissions auth_group_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_pkey PRIMARY KEY (id);


--
-- Name: auth_group auth_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group
    ADD CONSTRAINT auth_group_pkey PRIMARY KEY (id);


--
-- Name: auth_permission auth_permission_content_type_id_codename_01ab375a_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_codename_01ab375a_uniq UNIQUE (content_type_id, codename);


--
-- Name: auth_permission auth_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_pkey PRIMARY KEY (id);


--
-- Name: django_admin_log django_admin_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_pkey PRIMARY KEY (id);


--
-- Name: django_content_type django_content_type_app_label_model_76bd3d3b_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_app_label_model_76bd3d3b_uniq UNIQUE (app_label, model);


--
-- Name: django_content_type django_content_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_content_type
    ADD CONSTRAINT django_content_type_pkey PRIMARY KEY (id);


--
-- Name: django_migrations django_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_migrations
    ADD CONSTRAINT django_migrations_pkey PRIMARY KEY (id);


--
-- Name: django_session django_session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_session
    ADD CONSTRAINT django_session_pkey PRIMARY KEY (session_key);


--
-- Name: users_gymlocation users_gymlocation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_gymlocation
    ADD CONSTRAINT users_gymlocation_pkey PRIMARY KEY (id);


--
-- Name: users_gymlocation users_gymlocation_user_id_name_efa4bc43_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_gymlocation
    ADD CONSTRAINT users_gymlocation_user_id_name_efa4bc43_uniq UNIQUE (user_id, name);


--
-- Name: users_user users_user_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user
    ADD CONSTRAINT users_user_email_key UNIQUE (email);


--
-- Name: users_user_groups users_user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_groups
    ADD CONSTRAINT users_user_groups_pkey PRIMARY KEY (id);


--
-- Name: users_user_groups users_user_groups_user_id_group_id_b88eab82_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_groups
    ADD CONSTRAINT users_user_groups_user_id_group_id_b88eab82_uniq UNIQUE (user_id, group_id);


--
-- Name: users_user users_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user
    ADD CONSTRAINT users_user_pkey PRIMARY KEY (id);


--
-- Name: users_user_user_permissions users_user_user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_user_permissions
    ADD CONSTRAINT users_user_user_permissions_pkey PRIMARY KEY (id);


--
-- Name: users_user_user_permissions users_user_user_permissions_user_id_permission_id_43338c45_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_user_permissions
    ADD CONSTRAINT users_user_user_permissions_user_id_permission_id_43338c45_uniq UNIQUE (user_id, permission_id);


--
-- Name: users_user users_user_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user
    ADD CONSTRAINT users_user_username_key UNIQUE (username);


--
-- Name: workouts_exercise workouts_exercise_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_exercise
    ADD CONSTRAINT workouts_exercise_pkey PRIMARY KEY (id);


--
-- Name: workouts_exerciselog workouts_exerciselog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_exerciselog
    ADD CONSTRAINT workouts_exerciselog_pkey PRIMARY KEY (id);


--
-- Name: workouts_exerciselog workouts_exerciselog_session_id_exercise_id_s_4624ea12_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_exerciselog
    ADD CONSTRAINT workouts_exerciselog_session_id_exercise_id_s_4624ea12_uniq UNIQUE (session_id, exercise_id, set_number);


--
-- Name: workouts_workout workouts_workout_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_workout
    ADD CONSTRAINT workouts_workout_pkey PRIMARY KEY (id);


--
-- Name: workouts_workoutsession workouts_workoutsession_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_workoutsession
    ADD CONSTRAINT workouts_workoutsession_pkey PRIMARY KEY (id);


--
-- Name: auth_group_name_a6ea08ec_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_name_a6ea08ec_like ON public.auth_group USING btree (name varchar_pattern_ops);


--
-- Name: auth_group_permissions_group_id_b120cbf9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_group_id_b120cbf9 ON public.auth_group_permissions USING btree (group_id);


--
-- Name: auth_group_permissions_permission_id_84c5c92e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_group_permissions_permission_id_84c5c92e ON public.auth_group_permissions USING btree (permission_id);


--
-- Name: auth_permission_content_type_id_2f476e4b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auth_permission_content_type_id_2f476e4b ON public.auth_permission USING btree (content_type_id);


--
-- Name: django_admin_log_content_type_id_c4bce8eb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_content_type_id_c4bce8eb ON public.django_admin_log USING btree (content_type_id);


--
-- Name: django_admin_log_user_id_c564eba6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_admin_log_user_id_c564eba6 ON public.django_admin_log USING btree (user_id);


--
-- Name: django_session_expire_date_a5c62663; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_expire_date_a5c62663 ON public.django_session USING btree (expire_date);


--
-- Name: django_session_session_key_c0390e0f_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX django_session_session_key_c0390e0f_like ON public.django_session USING btree (session_key varchar_pattern_ops);


--
-- Name: users_gymlocation_user_id_03033a65; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_gymlocation_user_id_03033a65 ON public.users_gymlocation USING btree (user_id);


--
-- Name: users_user_email_243f6e77_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_user_email_243f6e77_like ON public.users_user USING btree (email varchar_pattern_ops);


--
-- Name: users_user_groups_group_id_9afc8d0e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_user_groups_group_id_9afc8d0e ON public.users_user_groups USING btree (group_id);


--
-- Name: users_user_groups_user_id_5f6f5a90; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_user_groups_user_id_5f6f5a90 ON public.users_user_groups USING btree (user_id);


--
-- Name: users_user_user_permissions_permission_id_0b93982e; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_user_user_permissions_permission_id_0b93982e ON public.users_user_user_permissions USING btree (permission_id);


--
-- Name: users_user_user_permissions_user_id_20aca447; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_user_user_permissions_user_id_20aca447 ON public.users_user_user_permissions USING btree (user_id);


--
-- Name: users_user_username_06e46fe6_like; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_user_username_06e46fe6_like ON public.users_user USING btree (username varchar_pattern_ops);


--
-- Name: workouts_exercise_workout_id_24d397ed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workouts_exercise_workout_id_24d397ed ON public.workouts_exercise USING btree (workout_id);


--
-- Name: workouts_exerciselog_exercise_id_cab840c9; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workouts_exerciselog_exercise_id_cab840c9 ON public.workouts_exerciselog USING btree (exercise_id);


--
-- Name: workouts_exerciselog_session_id_b5738f9b; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workouts_exerciselog_session_id_b5738f9b ON public.workouts_exerciselog USING btree (session_id);


--
-- Name: workouts_workout_user_id_973b8a96; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workouts_workout_user_id_973b8a96 ON public.workouts_workout USING btree (user_id);


--
-- Name: workouts_workoutsession_user_id_e7e6fc7d; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workouts_workoutsession_user_id_e7e6fc7d ON public.workouts_workoutsession USING btree (user_id);


--
-- Name: workouts_workoutsession_workout_id_20243bd8; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX workouts_workoutsession_workout_id_20243bd8 ON public.workouts_workoutsession USING btree (workout_id);


--
-- Name: auth_group_permissions auth_group_permissio_permission_id_84c5c92e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissio_permission_id_84c5c92e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_group_permissions auth_group_permissions_group_id_b120cbf9_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_group_permissions
    ADD CONSTRAINT auth_group_permissions_group_id_b120cbf9_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: auth_permission auth_permission_content_type_id_2f476e4b_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_permission
    ADD CONSTRAINT auth_permission_content_type_id_2f476e4b_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_content_type_id_c4bce8eb_fk_django_co; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_content_type_id_c4bce8eb_fk_django_co FOREIGN KEY (content_type_id) REFERENCES public.django_content_type(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: django_admin_log django_admin_log_user_id_c564eba6_fk_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.django_admin_log
    ADD CONSTRAINT django_admin_log_user_id_c564eba6_fk_users_user_id FOREIGN KEY (user_id) REFERENCES public.users_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users_gymlocation users_gymlocation_user_id_03033a65_fk_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_gymlocation
    ADD CONSTRAINT users_gymlocation_user_id_03033a65_fk_users_user_id FOREIGN KEY (user_id) REFERENCES public.users_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users_user_groups users_user_groups_group_id_9afc8d0e_fk_auth_group_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_groups
    ADD CONSTRAINT users_user_groups_group_id_9afc8d0e_fk_auth_group_id FOREIGN KEY (group_id) REFERENCES public.auth_group(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users_user_groups users_user_groups_user_id_5f6f5a90_fk_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_groups
    ADD CONSTRAINT users_user_groups_user_id_5f6f5a90_fk_users_user_id FOREIGN KEY (user_id) REFERENCES public.users_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users_user_user_permissions users_user_user_perm_permission_id_0b93982e_fk_auth_perm; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_user_permissions
    ADD CONSTRAINT users_user_user_perm_permission_id_0b93982e_fk_auth_perm FOREIGN KEY (permission_id) REFERENCES public.auth_permission(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: users_user_user_permissions users_user_user_permissions_user_id_20aca447_fk_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_user_user_permissions
    ADD CONSTRAINT users_user_user_permissions_user_id_20aca447_fk_users_user_id FOREIGN KEY (user_id) REFERENCES public.users_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: workouts_exercise workouts_exercise_workout_id_24d397ed_fk_workouts_workout_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_exercise
    ADD CONSTRAINT workouts_exercise_workout_id_24d397ed_fk_workouts_workout_id FOREIGN KEY (workout_id) REFERENCES public.workouts_workout(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: workouts_exerciselog workouts_exerciselog_exercise_id_cab840c9_fk_workouts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_exerciselog
    ADD CONSTRAINT workouts_exerciselog_exercise_id_cab840c9_fk_workouts_ FOREIGN KEY (exercise_id) REFERENCES public.workouts_exercise(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: workouts_exerciselog workouts_exerciselog_session_id_b5738f9b_fk_workouts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_exerciselog
    ADD CONSTRAINT workouts_exerciselog_session_id_b5738f9b_fk_workouts_ FOREIGN KEY (session_id) REFERENCES public.workouts_workoutsession(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: workouts_workout workouts_workout_user_id_973b8a96_fk_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_workout
    ADD CONSTRAINT workouts_workout_user_id_973b8a96_fk_users_user_id FOREIGN KEY (user_id) REFERENCES public.users_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: workouts_workoutsession workouts_workoutsess_workout_id_20243bd8_fk_workouts_; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_workoutsession
    ADD CONSTRAINT workouts_workoutsess_workout_id_20243bd8_fk_workouts_ FOREIGN KEY (workout_id) REFERENCES public.workouts_workout(id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: workouts_workoutsession workouts_workoutsession_user_id_e7e6fc7d_fk_users_user_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workouts_workoutsession
    ADD CONSTRAINT workouts_workoutsession_user_id_e7e6fc7d_fk_users_user_id FOREIGN KEY (user_id) REFERENCES public.users_user(id) DEFERRABLE INITIALLY DEFERRED;


--
-- PostgreSQL database dump complete
--

\unrestrict QbcG7YXgbAm2ZSYf6scoe81eYHOX8QHuVRP2k2MpDqFDkw3OCRZB865YCV7MUX8

