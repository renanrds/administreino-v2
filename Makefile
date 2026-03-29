.PHONY: up down build logs migrate createsuperuser shell-backend shell-frontend

up:
	docker compose up

up-d:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

migrate:
	docker compose exec backend python manage.py migrate

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

shell-backend:
	docker compose exec backend python manage.py shell

shell-frontend:
	docker compose exec frontend sh

restart-backend:
	docker compose restart backend

restart-frontend:
	docker compose restart frontend

clean:
	docker compose down -v --remove-orphans
