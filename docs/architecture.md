# Архитектура

## Стек

- Frontend: React, TypeScript, Vite.
- Backend: Python, FastAPI.
- Database: PostgreSQL.
- Migrations: Alembic.
- Telegram integration: aiogram.

## Принцип

Backend является источником истины для состояния игры.
Frontend отображает состояние и отправляет команды.

## Слои backend

- `models.py` — модели базы данных.
- `schemas.py` — входные и выходные данные API.
- `repository.py` — работа с базой данных.
- `service.py` — игровые правила.
- `router.py` — HTTP-маршруты.

## Текущий этап

Создан базовый frontend и health-check backend.