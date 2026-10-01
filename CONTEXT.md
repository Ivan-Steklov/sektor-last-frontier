# Контекст проекта

## Проект

Сектор: Последний Рубеж — асинхронная космическая стратегия для Telegram Mini App в духе компактного OGame.

Игрок развивает одну планету, добывает ресурсы, улучшает здания, позже будут исследования, флот, экспедиции, PvE/PvP и сезонный сектор.

## Стек

- Frontend: React + TypeScript + Vite.
- Backend: Python + FastAPI.
- Database: PostgreSQL.
- ORM: SQLAlchemy.
- Migrations: Alembic.
- Docker Compose: PostgreSQL.
- GitHub: удалённый репозиторий.

## Принцип архитектуры

Backend — источник истины.

Frontend только:

- показывает состояние;
- отправляет команды;
- показывает клиентские таймеры.

Все важные действия считаются сервером:

- ресурсы;
- стоимость зданий;
- завершение строительства;
- таймеры;
- списание ресурсов.

## Текущие механики

Реализовано:

- пользователь по `telegram_id`;
- стартовая планета;
- ресурсы:
  - металл;
  - кристалл;
  - энергия;
  - население;
- производство ресурсов по времени;
- склад;
- 7 зданий:
  - metal_mine;
  - crystal_mine;
  - power_plant;
  - warehouse;
  - shipyard;
  - research_center;
  - defense_module;
- уровни зданий;
- стоимость улучшений;
- очередь строительства;
- серверный таймер строительства;
- списание ресурсов при старте улучшения;
- завершение строительства при запросе состояния;
- энергетика:
  - электростанция производит энергию;
  - здания потребляют энергию;
  - при нехватке энергии производство снижается;
- frontend показывает:
  - планету;
  - ресурсы;
  - энергосистему;
  - здания;
  - стоимость;
  - таймер строительства;
  - прогресс-бар;
  - причины блокировки кнопки.
  - синхронизация ресурсов в базу перед важными действиями;
- ресурсы фиксируются на момент завершения строительства перед повышением уровня здания.

## Важные решения
- перед завершением строительства вызывается `sync_resources(..., calculated_at=finishes_at)`, чтобы старая добыча считалась до окончания таймера, а новая добыча — после.

## Backend-структура

Основные модули:

````text
backend/app/
  main.py
  config.py
  db.py
  users/
  planets/
  resources/
  buildings/

  Обычно модуль делится так:

text
models.py
schemas.py
repository.py
service.py
router.py
rules.py
catalog.py
Правила:

models.py — SQLAlchemy-модели.
schemas.py — Pydantic-схемы.
repository.py — запросы к БД.
service.py — бизнес-логика.
router.py — FastAPI endpoints.
rules.py — чистые игровые формулы.
catalog.py — справочники.
Важные API
text
GET /health
GET /health/db

GET /api/planets/home?telegram_id=1

GET /api/resources/current?telegram_id=1

GET /api/buildings/current?telegram_id=1
POST /api/buildings/{building_code}/upgrade?telegram_id=1
Важные решения
Пока используется тестовый telegram_id=1.
Telegram init data ещё не подключён.
У игрока пока одна планета.
Очередь строительства пока одна.
Ресурсы считаются по времени, а не начисляются каждую секунду.
Завершение строительства применяется при запросе состояния зданий.
Worker/Celery пока не используется.
Redis пока не используется.
Alembic запускаем через:
powershell
python -m alembic revision --autogenerate -m "message"
python -m alembic upgrade head
Команды запуска
Backend:

powershell
cd C:\Users\Иван\sektor-last-frontier\backend
python -m uvicorn app.main:app --reload
Frontend:

powershell
cd C:\Users\Иван\sektor-last-frontier\frontend
npm run dev
Database:

powershell
cd C:\Users\Иван\sektor-last-frontier
docker compose up -d
Tests:

powershell
cd C:\Users\Иван\sektor-last-frontier\backend
pytest
Git:

powershell
git status
git add .
git commit -m "message"
git push
Следующие планируемые этапы
Синхронизация ресурсов в базу перед важными действиями.
Улучшение backend-надежности строительства.
Исследования.
Верфь и производство кораблей.
Экспедиции.
PvE-бои с пиратами.
Telegram Mini App авторизация.
r

Потом сохрани:

```powershell
cd C:\Users\Иван\sektor-last-frontier
git add CONTEXT.md
git commit -m "Add project context"
git push
````
