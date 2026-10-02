# Handoff — Сектор: Последний Рубеж

## О проекте

Игра: **«Сектор: Последний Рубеж»**  
Формат: компактная асинхронная космическая стратегия для Telegram Mini App.

Подход к разработке:

- вайбкодингом;
- маленькими шагами;
- каждый шаг — законченный vertical slice;
- backend-first;
- без лишних абстракций и без большого рефакторинга.

---

## Технологический стек

Frontend:

- React
- TypeScript
- Vite

Backend:

- Python
- FastAPI

Data:

- PostgreSQL
- SQLAlchemy
- Alembic

Tests:

- pytest

Docker:

- Docker Compose для PostgreSQL

---

## Корневая папка проекта

```text
C:\Users\Иван\sektor-last-frontier
Текущий пользователь для ручной проверки
text
telegram_id=1
Основные правила разработки
Следующий ассистент должен соблюдать:

Backend — источник истины

backend считает ресурсы, таймеры, завершение миссий, награды, потери, риск;
frontend не должен рассчитывать игровую логику.
Маленькие шаги

предлагать только один следующий небольшой шаг;
не перепрыгивать в большие системы;
не делать крупный рефакторинг без необходимости.
Полные замены файлов

если меняется код, отдавать полное содержимое файлов;
не куски diff, а целые файлы.
После кода обязательно

команды запуска;
команды тестов;
ручная проверка по шагам.
Сохранять существующую архитектуру

не переносить логику в frontend;
не ломать backend-first подход;
не усложнять доменную модель без явной пользы.
Что уже есть в игре
Планета
Реализовано:

одна планета;
базовые ресурсы;
здания;
исследования;
корабли.
Производство и развитие
Есть:

очередь зданий;
gating исследований через research_center;
корабли:
scout
transport
fighter
Экспедиции
Есть рабочие экспедиции:

backend рассчитывает награды и длительность;
исследования могут влиять на бонусы.
Галактика — текущее состояние
Сектор галактики
Реализован детерминированный сектор:

GET /api/galaxy/sector?telegram_id=1
Разведка систем
Реализованы scout missions:

GET /api/galaxy/scout/current?telegram_id=1
POST /api/galaxy/scout/start?telegram_id=1
Правила:

требуется 1 scout;
scout убирается из флота на время миссии;
после завершения возвращается;
одновременно только одна активная scout mission.
Известные системы
Есть постоянное хранение разведанных систем:

таблица:
galaxy_known_systems
constraint:
uq_galaxy_known_system_planet_target
Поведение:

разведданные сохраняются по:
(planet_id, target_galaxy, target_system)
повторная разведка обновляет запись.
Ресурсные миссии
Реализованы galaxy resource missions:

GET /api/galaxy/resource-mission/current?telegram_id=1
POST /api/galaxy/resource-mission/start?telegram_id=1
Правила:

нужна разведанная система;
нужен 1 transport;
одновременно только одна активная resource mission;
transport убирается на время миссии;
после завершения начисляются ресурсы;
transport может не вернуться в зависимости от риска.
Риск-логика resource missions
Риск определяется на backend по danger из scout report.

Правила:

low danger:
полная награда;
transport возвращается.
medium danger:
потеря 30% груза.
high danger:
либо уничтожение transport;
либо потеря 50% груза.
Результат миссии включает:

danger
danger_level
transport_lost
cargo_loss_percent
Важная обратная совместимость
Старые записи galaxy_resource_missions.result_payload могли не содержать:

danger
danger_level
Из-за этого раньше падал backend 500 на:

GET /api/galaxy/resource-mission/current?telegram_id=1
Исправление уже внесено:

в backend/app/galaxy/service.py есть нормализация старого payload;
helper:
_normalize_resource_result_payload(payload: dict) -> dict
Если следующий ассистент меняет схемы ответа resource mission, нужно:

сохранить обратную совместимость, или
явно добавить migration/data-fix.
Важные frontend-нюансы
На экране галактики уже был исправлен race condition при завершении scout mission:

сначала обновляется scout state;
потом galaxy sector.
Также:

есть защита от повторного fetch по таймеру;
вместо сырого Failed to fetch добавлена дружелюбная обработка.
Следующий ассистент не должен ломать эту последовательность.

Важные файлы
Backend:

backend/app/galaxy/models.py
backend/app/galaxy/schemas.py
backend/app/galaxy/repository.py
backend/app/galaxy/service.py
backend/app/galaxy/router.py
Tests:

backend/tests/test_galaxy_scout_service.py
backend/tests/test_galaxy_resource_mission_service.py
Frontend:

frontend/src/galaxy/GalaxyPanel.tsx
frontend/src/galaxy/GalaxyPanel.css
Важные таблицы / индексы / сущности
galaxy_known_systems
galaxy_resource_missions
uq_galaxy_known_system_planet_target
ix_galaxy_resource_mission_one_active_per_planet
Команды запуска
PostgreSQL
powershell
cd C:\Users\Иван\sektor-last-frontier
docker compose up -d
Backend
powershell
cd C:\Users\Иван\sektor-last-frontier\backend
python -m uvicorn app.main:app --reload
Frontend
powershell
cd C:\Users\Иван\sektor-last-frontier\frontend
npm run dev
Tests
powershell
cd C:\Users\Иван\sektor-last-frontier\backend
pytest
Alembic
powershell
cd C:\Users\Иван\sektor-last-frontier\backend
python -m alembic revision --autogenerate -m "message"
python -m alembic upgrade head
Известный практический нюанс с Alembic
Ранее пользователь столкнулся с ситуацией, когда команда:

powershell
python -m alembic revision --autogenerate -m "create galaxy resource missions"
визуально "зависала", а затем завершалась через KeyboardInterrupt.

Причина была связана с подключением к PostgreSQL при неготовой БД/контейнере.

Если Alembic снова "висит", сначала проверить:

что Docker-контейнер PostgreSQL поднят;
что база доступна;
что backend использует корректные env/connection settings.
Последний подтвержденный рабочий функционал
Пользователь подтвердил, что сейчас работает:

сектор галактики;
разведка систем;
повторная разведка;
сохран��ние известных систем;
resource missions;
risk outcomes;
backward compatibility старых mission payload.
Что делать следующим
Лучший следующий шаг сейчас:

сделать danger/risk более наглядным на карте галактики после разведки.
Почему это хороший следующий шаг:

он маленький;
не требует ломать архитектуру;
улучшает UX;
помогает вручную проверять risk-ветки;
усиливает текущий galaxy gameplay loop.
Примеры подходящих следующих slice:

danger badge / цветовая маркировка на карточке разведанной системы;
отдельный риск-блок перед запуском resource mission;
более явное отображение danger level в UI карты.
Что не надо делать без явного запроса
не делать большой рефакторинг;
не строить новую сложную боевую систему;
не переносить вычисления риска на frontend;
не добавлять много новых сущностей ради “красоты”;
не ломать совместимость уже сохраненных mission payload.

## Дополнительный UI-контекст по риску
Во frontend галактики добавлена явная визуализация риска:
- badge риска на разведанных системах;
- цветовая маркировка danger level;
- текстовый прогноз перед запуском resource mission;
- визуально различимый блок результата миссии.

Важно:
- это только отображение;
- backend по-прежнему является единственным источником истины для risk outcome.
## Важный актуальный контракт galaxy API
Текущий galaxy API использует:
- `finishes_at` и `remaining_seconds` для active missions;
- `danger_level` как integer;
- `scout_report` внутри `GalaxySystemItem`;
- `has_home_planet` и `is_scouted` вместо более ранних frontend-предположений.

Frontend countdown не должен самостоятельно вычислять оставшееся время из datetime, если backend уже отдает `remaining_seconds`.
Backend считает, frontend отображает.
## Последний UI-срез по галактике
Карточка разведанной системы стала информативнее:
- кроме richness/danger/risk теперь показывается полноценный `Отчет разведки`;
- frontend использует `description`, `discovered_signals`, `completed_at` из `scout_report`;
- дата отображается на клиенте через локальное форматирование.

Backend для этого шага не менялся.
## Последний шаг
Добавлен отдельный UI-блок `Последний отчет разведки`.

Зачем:
- развести понятия `scout_report` выбранной системы и `last_report` как глобально последнего завершенного отчета;
- снизить путаницу в интерфейсе;
- сохранить историю последнего действия игрока, даже если выбрана другая система.

Backend не менялся, используются уже существующие поля `GET /api/galaxy/scout/current`.
## Последний шаг
Добавлен UX-срез для активных галактических миссий:
- на карте видно, в какую систему сейчас летит разведка или транспорт;
- в карточке выбранной целевой системы показывается локальный статус с таймером;
- backend не менялся, логика строится поверх уже существующих `active_mission` ответов.
## Последний шаг
Найден и исправлен рассинхрон galaxy schemas:
- `schemas.py` был переведен на новые имена (`...Schema` / `...CurrentResponseSchema`),
- но `router.py` и `service.py` продолжали использовать старые имена.

Решение:
- вернуть в `schemas.py` прежние имена моделей, которые уже используются в коде;
- оставить новую datetime-сериализацию через `field_serializer`.

Это был минимальный безопасный фикс без переписывания business logic.
```
