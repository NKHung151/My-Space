
    create table comment_likes (
        comment_id bigint not null,
        created_at datetime(6),
        id bigint not null auto_increment,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB;

    create table comments (
        like_count int default 0,
        reply_count int default 0,
        author_id bigint not null,
        created_at datetime(6),
        id bigint not null auto_increment,
        parent_id bigint,
        post_id bigint not null,
        reply_to_comment_id bigint,
        updated_at datetime(6),
        content TEXT not null,
        primary key (id)
    ) engine=InnoDB;

    create table friend_requests (
        created_at datetime(6),
        id bigint not null auto_increment,
        receiver_id bigint not null,
        sender_id bigint not null,
        status varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table friendships (
        created_at datetime(6),
        friend_id bigint not null,
        id bigint not null auto_increment,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB;

    create table media_assets (
        created_at datetime(6),
        id bigint not null auto_increment,
        owner_id bigint not null,
        media_type varchar(255),
        mime_type varchar(255),
        public_id varchar(255) not null,
        url varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table post_likes (
        created_at datetime(6),
        id bigint not null auto_increment,
        post_id bigint not null,
        user_id bigint not null,
        primary key (id)
    ) engine=InnoDB;

    create table posts (
        comment_count int default 0,
        has_video boolean default false,
        like_count int default 0,
        view_count int default 0,
        author_id bigint not null,
        created_at datetime(6),
        id bigint not null auto_increment,
        published_at datetime(6),
        updated_at datetime(6),
        content LONGTEXT,
        cover_image_url varchar(255),
        excerpt TEXT,
        slug varchar(255),
        tag varchar(255),
        title varchar(255) not null,
        unaccented_tag varchar(255),
        unaccented_title varchar(255),
        primary key (id)
    ) engine=InnoDB;

    create table refresh_tokens (
        revoked bit not null,
        expiry_date datetime(6) not null,
        id bigint not null auto_increment,
        user_id bigint not null,
        token varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table roles (
        id integer not null auto_increment,
        name varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    create table users (
        role_id integer,
        reset_otp varchar(6),
        created_at datetime(6),
        id bigint not null auto_increment,
        reset_otp_expiry datetime(6),
        updated_at datetime(6),
        avatar_url varchar(255),
        bio TEXT,
        display_name varchar(255),
        email varchar(255) not null,
        full_name varchar(255),
        password varchar(255),
        status varchar(255),
        unaccented_display_name varchar(255),
        username varchar(255) not null,
        primary key (id)
    ) engine=InnoDB;

    alter table comment_likes 
       add constraint UKgu1pee3567af29uutdfy0fcjd unique (comment_id, user_id);

    alter table friend_requests 
       add constraint UKe5flhq7m0l5t1m248lbbbq07a unique (sender_id, receiver_id);

    alter table friendships 
       add constraint UKjwaac0iw9d1fu58mx7afwf9f4 unique (user_id, friend_id);

    alter table post_likes 
       add constraint UK5l2rj28vw5oj6f7ox746grokg unique (post_id, user_id);

    alter table refresh_tokens 
       add constraint UKghpmfn23vmxfu3spu3lfg4r2d unique (token);

    alter table roles 
       add constraint UKofx66keruapi6vyqpv6f2or37 unique (name);

    alter table users 
       add constraint UK6dotkott2kjsp8vw4d0m25fb7 unique (email);

    alter table users 
       add constraint UKr43af9ap4edm43mmtq01oddj6 unique (username);

    alter table comment_likes 
       add constraint FK3wa5u7bs1p1o9hmavtgdgk1go 
       foreign key (comment_id) 
       references comments (id);

    alter table comment_likes 
       add constraint FK6h3lbneryl5pyb9ykaju7werx 
       foreign key (user_id) 
       references users (id);

    alter table comments 
       add constraint FKn2na60ukhs76ibtpt9burkm27 
       foreign key (author_id) 
       references users (id);

    alter table comments 
       add constraint FKlri30okf66phtcgbe5pok7cc0 
       foreign key (parent_id) 
       references comments (id);

    alter table comments 
       add constraint FKh4c7lvsc298whoyd4w9ta25cr 
       foreign key (post_id) 
       references posts (id);

    alter table comments 
       add constraint FK9cnyv7g9gt5qgsci8uy6sc7d6 
       foreign key (reply_to_comment_id) 
       references comments (id);

    alter table friend_requests 
       add constraint FKtcmqalc5v4qdt1slgcsa544i5 
       foreign key (receiver_id) 
       references users (id);

    alter table friend_requests 
       add constraint FKcchlh48b4347amfvmke793bg7 
       foreign key (sender_id) 
       references users (id);

    alter table friendships 
       add constraint FKt0mh1j446gu5rqba17rnknuil 
       foreign key (friend_id) 
       references users (id);

    alter table friendships 
       add constraint FK4mcscxflf13uk72aupf6uwbgn 
       foreign key (user_id) 
       references users (id);

    alter table media_assets 
       add constraint FKm4winmmonkdrlm57p67ko273e 
       foreign key (owner_id) 
       references users (id);

    alter table post_likes 
       add constraint FKa5wxsgl4doibhbed9gm7ikie2 
       foreign key (post_id) 
       references posts (id);

    alter table post_likes 
       add constraint FKkgau5n0nlewg6o9lr4yibqgxj 
       foreign key (user_id) 
       references users (id);

    alter table posts 
       add constraint FK6xvn0811tkyo3nfjk2xvqx6ns 
       foreign key (author_id) 
       references users (id);

    alter table refresh_tokens 
       add constraint FK1lih5y2npsf8u5o3vhdb9y0os 
       foreign key (user_id) 
       references users (id);

    alter table users 
       add constraint FKp56c1712k691lhsyewcssf40f 
       foreign key (role_id) 
       references roles (id);
