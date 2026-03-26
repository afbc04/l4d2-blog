# Deploy

### Install

    git clone git@github.com:afbc04/l4d2-blog.git

    cd l4d2-blog/

### Configurate app

1.     touch .env

2. Write these variables in **.env** file

```.env
JWT_SECRET=
JWT_SECRET_REGISTRATION_TOKEN=
MONGO_USER=
MONGO_PASS=
MONGO_DB=
```

Example:

```.env
JWT_SECRET=jwtsecret
JWT_SECRET_REGISTRATION_TOKEN=jwtsecretrt
MONGO_USER=admin
MONGO_PASS=password
MONGO_DB=database
```

# Start local development environment

### Install - Docker Compose

    docker compose up --build    # If it's your first time installing

    docker compose up            # If you already installed docker

#### Application URL

Application will be running at:

    http://localhost:3000

# Documentation

# References:
