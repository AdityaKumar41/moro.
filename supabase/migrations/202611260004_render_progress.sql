alter table jobs add column completed_rows int not null default 0;
alter table jobs add column preview_path text;
