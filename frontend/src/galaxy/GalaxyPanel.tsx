import { useEffect, useMemo, useRef, useState } from 'react'
import './GalaxyPanel.css'

type GalaxyScoutReport = {
  target_galaxy: number
  target_system: number
  richness: string
  danger: string
  danger_level: number
  discovered_signals: number
  description: string
  completed_at: string
}

type GalaxyPlanetMarker = {
  name: string
  position: number
  owner_name: string | null
  is_home_planet: boolean
}

type GalaxySystem = {
  galaxy: number
  system: number
  name: string
  distance: number
  richness: string
  danger: string
  danger_level: number
  has_home_planet: boolean
  is_scouted: boolean
  scout_report: GalaxyScoutReport | null
  planets: GalaxyPlanetMarker[]
}

type GalaxySectorResponse = {
  current_galaxy: number
  current_system: number
  current_position: number
  systems: GalaxySystem[]
}

type GalaxyScoutMission = {
  id: number
  target_galaxy: number
  target_system: number
  started_at: string
  finishes_at: string
  remaining_seconds: number
}

type GalaxyScoutCurrentResponse = {
  active_mission: GalaxyScoutMission | null
  last_report: GalaxyScoutReport | null
}

type GalaxyResourceMission = {
  id: number
  target_galaxy: number
  target_system: number
  started_at: string
  finishes_at: string
  remaining_seconds: number
}

type GalaxyResourceMissionResult = {
  target_galaxy: number
  target_system: number
  metal_found: number
  crystal_found: number
  danger: string
  danger_level: number
  transport_lost: boolean
  cargo_loss_percent: number
  description: string
  completed_at: string
}

type GalaxyResourceMissionCurrentResponse = {
  active_mission: GalaxyResourceMission | null
  last_result: GalaxyResourceMissionResult | null
}

type ApiErrorResponse = {
  detail?: string
}

const TELEGRAM_ID = 1

function formatSecondsLeft(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatDateTime(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Дата неизвестна'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getDangerLevelKey(level: number): 'low' | 'medium' | 'high' | 'unknown' {
  if (level <= 1) return 'low'
  if (level === 2) return 'medium'
  if (level >= 3) return 'high'
  return 'unknown'
}

function getDangerBadgeLabel(level: number): string {
  if (level <= 1) return 'Низкий риск'
  if (level === 2) return 'Средний риск'
  if (level >= 3) return 'Высокий риск'
  return 'Риск не определен'
}

function getDangerPreview(level: number): string {
  if (level <= 1) {
    return 'Транспорт должен вернуться, потерь груза не ожидается.'
  }
  if (level === 2) {
    return 'Возможна потеря части груза по итогам миссии.'
  }
  if (level >= 3) {
    return 'Высокий риск: возможна потеря части груза или самого транспорта.'
  }
  return 'Недостаточно данных для прогноза риска.'
}

function getSignalsLabel(signals: number): string {
  if (signals <= 0) return 'Сигналы не обнаружены'
  if (signals === 1) return 'Обнаружен 1 сигнал'
  if (signals < 5) return `Обнаружено ${signals} сигнала`
  return `Обнаружено ${signals} сигналов`
}

function getResultTone(result: GalaxyResourceMissionResult): 'success' | 'warning' | 'danger' {
  if (result.transport_lost) return 'danger'
  if (result.cargo_loss_percent > 0) return 'warning'
  return 'success'
}

function isMissionTarget(
  system: GalaxySystem,
  mission: { target_galaxy: number; target_system: number } | null
): boolean {
  return !!mission && system.galaxy === mission.target_galaxy && system.system === mission.target_system
}

async function readJsonOrThrow<T>(response: Response, fallbackError: string): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''
  const rawText = await response.text()

  if (!contentType.includes('application/json')) {
    if (rawText.trim().startsWith('<!doctype') || rawText.trim().startsWith('<html')) {
      throw new Error(
        'Frontend получил HTML вместо JSON. Проверь, что backend запущен и Vite proxy для /api настроен правильно.'
      )
    }

    throw new Error(fallbackError)
  }

  try {
    return JSON.parse(rawText) as T
  } catch {
    throw new Error(fallbackError)
  }
}

export function GalaxyPanel() {
  const [sector, setSector] = useState<GalaxySectorResponse | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<GalaxySystem | null>(null)

  const [scoutState, setScoutState] = useState<GalaxyScoutCurrentResponse | null>(null)
  const [resourceMissionState, setResourceMissionState] =
    useState<GalaxyResourceMissionCurrentResponse | null>(null)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scoutRefreshInFlightRef = useRef(false)
  const resourceRefreshInFlightRef = useRef(false)

  const activeScoutMission = scoutState?.active_mission ?? null
  const lastScoutReport = scoutState?.last_report ?? null
  const activeResourceMission = resourceMissionState?.active_mission ?? null
  const lastResourceResult = resourceMissionState?.last_result ?? null

  const [scoutSecondsLeft, setScoutSecondsLeft] = useState(0)
  const [resourceSecondsLeft, setResourceSecondsLeft] = useState(0)

  async function fetchSector(preserveSelection = true) {
    const response = await fetch(`/api/galaxy/sector?telegram_id=${TELEGRAM_ID}`)
    const data = await readJsonOrThrow<GalaxySectorResponse>(
      response,
      'Не удалось загрузить сектор галактики'
    )

    if (!response.ok) {
      throw new Error('Не удалось загрузить сектор галактики')
    }

    setSector(data)

    if (!preserveSelection) {
      setSelectedSystem(null)
      return
    }

    setSelectedSystem((current) => {
      if (!current) return null
      return (
        data.systems.find(
          (system) => system.galaxy === current.galaxy && system.system === current.system
        ) ?? null
      )
    })
  }

  async function fetchScoutState() {
    const response = await fetch(`/api/galaxy/scout/current?telegram_id=${TELEGRAM_ID}`)
    const data = await readJsonOrThrow<GalaxyScoutCurrentResponse>(
      response,
      'Не удалось загрузить статус разведки'
    )

    if (!response.ok) {
      throw new Error('Не удалось загрузить статус разведки')
    }

    setScoutState(data)
  }

  async function fetchResourceMissionState() {
    const response = await fetch(
      `/api/galaxy/resource-mission/current?telegram_id=${TELEGRAM_ID}`
    )
    const data = await readJsonOrThrow<GalaxyResourceMissionCurrentResponse>(
      response,
      'Не удалось загрузить статус ресурсной миссии'
    )

    if (!response.ok) {
      throw new Error('Не удалось загрузить статус ресурсной миссии')
    }

    setResourceMissionState(data)
  }

  async function loadAll() {
    setLoading(true)
    setError(null)

    try {
      await Promise.all([fetchSector(), fetchScoutState(), fetchResourceMissionState()])
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось загрузить данные галактики')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (!activeScoutMission) {
      setScoutSecondsLeft(0)
      return
    }

    setScoutSecondsLeft(activeScoutMission.remaining_seconds)
  }, [activeScoutMission?.id, activeScoutMission?.remaining_seconds])

  useEffect(() => {
    if (!activeScoutMission) {
      return
    }

    const interval = window.setInterval(() => {
      setScoutSecondsLeft((prev) => {
        if (prev <= 1) {
          if (!scoutRefreshInFlightRef.current) {
            scoutRefreshInFlightRef.current = true

            ;(async () => {
              try {
                await fetchScoutState()
                await fetchSector()
              } catch {
                setError('Не удалось обновить данные разведки. Попробуйте обновить экран.')
              } finally {
                scoutRefreshInFlightRef.current = false
              }
            })()
          }

          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeScoutMission?.id])

  useEffect(() => {
    if (!activeResourceMission) {
      setResourceSecondsLeft(0)
      return
    }

    setResourceSecondsLeft(activeResourceMission.remaining_seconds)
  }, [activeResourceMission?.id, activeResourceMission?.remaining_seconds])

  useEffect(() => {
    if (!activeResourceMission) {
      return
    }

    const interval = window.setInterval(() => {
      setResourceSecondsLeft((prev) => {
        if (prev <= 1) {
          if (!resourceRefreshInFlightRef.current) {
            resourceRefreshInFlightRef.current = true

            ;(async () => {
              try {
                await fetchResourceMissionState()
              } catch {
                setError(
                  'Не удалось обновить статус ресурсной миссии. Попробуйте обновить экран.'
                )
              } finally {
                resourceRefreshInFlightRef.current = false
              }
            })()
          }

          return 0
        }

        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [activeResourceMission?.id])

  const selectedScoutReport = selectedSystem?.scout_report ?? null

  const homeSystemNumber = sector?.current_system ?? null
  const totalScoutableSystems =
    sector?.systems.filter((system) => system.system !== homeSystemNumber).length ?? 0
  const scoutedSystemsCount =
    sector?.systems.filter((system) => system.system !== homeSystemNumber && system.is_scouted)
      .length ?? 0

  const canStartScout = !!selectedSystem && !selectedSystem.has_home_planet && !activeScoutMission

  const canShowResourceMissionButton =
    !!selectedSystem && !selectedSystem.has_home_planet && !!selectedScoutReport

  const canStartResourceMission = canShowResourceMissionButton && !activeResourceMission

  const scoutButtonLabel = useMemo(() => {
    if (!selectedSystem) return 'Выберите систему'
    if (selectedSystem.has_home_planet) return 'Домашняя система'
    if (activeScoutMission) return 'Разведка уже выполняется'
    if (selectedScoutReport) return 'Разведать снова'
    return 'Отправить разведку'
  }, [selectedSystem, activeScoutMission, selectedScoutReport])

  const selectedMatchesLastResult =
    !!selectedSystem &&
    !!lastResourceResult &&
    selectedSystem.galaxy === lastResourceResult.target_galaxy &&
    selectedSystem.system === lastResourceResult.target_system

  const selectedMatchesLastScoutReport =
    !!selectedSystem &&
    !!lastScoutReport &&
    selectedSystem.galaxy === lastScoutReport.target_galaxy &&
    selectedSystem.system === lastScoutReport.target_system

  const selectedHasIncomingScout =
    !!selectedSystem && isMissionTarget(selectedSystem, activeScoutMission)

  const selectedHasIncomingTransport =
    !!selectedSystem && isMissionTarget(selectedSystem, activeResourceMission)

  async function handleStartScout() {
    if (!selectedSystem) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/galaxy/scout/start?telegram_id=${TELEGRAM_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_galaxy: selectedSystem.galaxy,
          target_system: selectedSystem.system,
        }),
      })

      const data = await readJsonOrThrow<GalaxyScoutCurrentResponse | ApiErrorResponse>(
        response,
        'Не удалось отправить разведку'
      )

      if (!response.ok) {
        throw new Error('detail' in data && data.detail ? data.detail : 'Не удалось отправить разведку')
      }

      setScoutState(data as GalaxyScoutCurrentResponse)
      await fetchSector()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось отправить разведку')
      }
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStartResourceMission() {
    if (!selectedSystem) return

    setActionLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/galaxy/resource-mission/start?telegram_id=${TELEGRAM_ID}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target_galaxy: selectedSystem.galaxy,
            target_system: selectedSystem.system,
          }),
        }
      )

      const data = await readJsonOrThrow<
        GalaxyResourceMissionCurrentResponse | ApiErrorResponse
      >(response, 'Не удалось отправить транспорт')

      if (!response.ok) {
        throw new Error('detail' in data && data.detail ? data.detail : 'Не удалось отправить транспорт')
      }

      setResourceMissionState(data as GalaxyResourceMissionCurrentResponse)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Не удалось отправить транспорт')
      }
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <div className="galaxy-panel">Загрузка галактики...</div>
  }

  return (
    <div className="galaxy-panel">
      <div className="galaxy-panel__header">
        <div>
          <h2 className="galaxy-panel__title">Галактика</h2>
          {sector && (
            <p className="galaxy-panel__subtitle">
              Сектор {sector.current_galaxy}:{sector.current_system} · Разведано{' '}
              {scoutedSystemsCount}/{totalScoutableSystems}
            </p>
          )}
        </div>

        <button className="galaxy-panel__refresh" onClick={() => loadAll()} disabled={loading}>
          Обновить
        </button>
      </div>

      {error && <div className="galaxy-panel__error">{error}</div>}

      <div className="galaxy-panel__content">
        <div className="galaxy-map">
          {sector?.systems.map((system) => {
            const isSelected =
              selectedSystem?.galaxy === system.galaxy &&
              selectedSystem?.system === system.system
            const dangerKey = system.is_scouted ? getDangerLevelKey(system.danger_level) : null
            const hasScoutMission = isMissionTarget(system, activeScoutMission)
            const hasResourceMission = isMissionTarget(system, activeResourceMission)

            return (
              <button
                key={`${system.galaxy}-${system.system}`}
                className={[
                  'galaxy-system',
                  system.has_home_planet ? 'galaxy-system--home' : '',
                  system.is_scouted ? 'galaxy-system--known' : '',
                  isSelected ? 'galaxy-system--selected' : '',
                  dangerKey ? `galaxy-system--danger-${dangerKey}` : '',
                  hasScoutMission ? 'galaxy-system--mission-scout' : '',
                  hasResourceMission ? 'galaxy-system--mission-resource' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setSelectedSystem(system)}
              >
                <div className="galaxy-system__name">
                  {system.galaxy}:{system.system}
                </div>

                {system.has_home_planet && <div className="galaxy-system__tag">Дом</div>}

                {!system.has_home_planet && system.is_scouted && (
                  <div
                    className={[
                      'galaxy-system__danger-badge',
                      `galaxy-system__danger-badge--${getDangerLevelKey(system.danger_level)}`,
                    ].join(' ')}
                  >
                    {getDangerBadgeLabel(system.danger_level)}
                  </div>
                )}

                {(hasScoutMission || hasResourceMission) && (
                  <div className="galaxy-system__mission-tags">
                    {hasScoutMission && (
                      <div className="galaxy-system__mission-tag galaxy-system__mission-tag--scout">
                        Разведка
                      </div>
                    )}
                    {hasResourceMission && (
                      <div className="galaxy-system__mission-tag galaxy-system__mission-tag--resource">
                        Транспорт
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <div className="galaxy-card">
          {!selectedSystem && (
            <div className="galaxy-card__empty">Выберите систему на карте сектора.</div>
          )}

          {selectedSystem && (
            <>
              <div className="galaxy-card__header">
                <div>
                  <h3 className="galaxy-card__title">
                    Система {selectedSystem.galaxy}:{selectedSystem.system}
                  </h3>
                  <p className="galaxy-card__subtitle">
                    {selectedSystem.has_home_planet
                      ? 'Это ваша домашняя система.'
                      : selectedScoutReport
                      ? 'Система разведана.'
                      : 'Система еще не разведана.'}
                  </p>
                </div>
              </div>

              {selectedHasIncomingScout && (
                <div className="galaxy-status-block galaxy-status-block--scout">
                  В систему направлена разведка. До завершения: {formatSecondsLeft(scoutSecondsLeft)}
                </div>
              )}

              {selectedHasIncomingTransport && (
                <div className="galaxy-status-block galaxy-status-block--resource">
                  В систему направлен транспорт. До завершения:{' '}
                  {formatSecondsLeft(resourceSecondsLeft)}
                </div>
              )}

              {selectedSystem.has_home_planet && (
                <div className="galaxy-info-block">
                  Домашняя система. Разведка и ресурсные миссии здесь не требуются.
                </div>
              )}

              {!selectedSystem.has_home_planet && selectedScoutReport && (
                <>
                  <div className="galaxy-report">
                    <div className="galaxy-report__row">
                      <span className="galaxy-report__label">Богатство:</span>
                      <span>{selectedScoutReport.richness}</span>
                    </div>

                    <div className="galaxy-report__row">
                      <span className="galaxy-report__label">Угроза:</span>
                      <span>{selectedScoutReport.danger}</span>
                    </div>

                    <div className="galaxy-report__row">
                      <span className="galaxy-report__label">Риск:</span>
                      <span
                        className={[
                          'galaxy-risk-badge',
                          `galaxy-risk-badge--${getDangerLevelKey(selectedScoutReport.danger_level)}`,
                        ].join(' ')}
                      >
                        {getDangerBadgeLabel(selectedScoutReport.danger_level)}
                      </span>
                    </div>

                    <div
                      className={[
                        'galaxy-risk-preview',
                        `galaxy-risk-preview--${getDangerLevelKey(selectedScoutReport.danger_level)}`,
                      ].join(' ')}
                    >
                      <div className="galaxy-risk-preview__title">Прогноз миссии</div>
                      <div className="galaxy-risk-preview__text">
                        {getDangerPreview(selectedScoutReport.danger_level)}
                      </div>
                    </div>
                  </div>

                  <div className="galaxy-scout-log">
                    <div className="galaxy-scout-log__title">Отчет разведки</div>
                    <div className="galaxy-scout-log__description">
                      {selectedScoutReport.description}
                    </div>

                    <div className="galaxy-scout-log__meta">
                      <div className="galaxy-scout-log__meta-item">
                        <span className="galaxy-scout-log__meta-label">Сигналы</span>
                        <span>{getSignalsLabel(selectedScoutReport.discovered_signals)}</span>
                      </div>

                      <div className="galaxy-scout-log__meta-item">
                        <span className="galaxy-scout-log__meta-label">Последняя разведка</span>
                        <span>{formatDateTime(selectedScoutReport.completed_at)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!selectedSystem.has_home_planet && !selectedScoutReport && (
                <div className="galaxy-info-block">
                  Сначала отправьте разведку, чтобы узнать богатство системы и уровень риска.
                </div>
              )}

              <div className="galaxy-actions">
                <button
                  className="galaxy-action-button"
                  onClick={handleStartScout}
                  disabled={!canStartScout || actionLoading}
                >
                  {actionLoading ? 'Выполняется...' : scoutButtonLabel}
                </button>

                {canShowResourceMissionButton && (
                  <button
                    className="galaxy-action-button galaxy-action-button--secondary"
                    onClick={handleStartResourceMission}
                    disabled={!canStartResourceMission || actionLoading}
                  >
                    {actionLoading ? 'Выполняется...' : 'Отправить транспорт'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {activeScoutMission && (
        <div className="galaxy-mission-block">
          <h3 className="galaxy-mission-block__title">Активная разведка</h3>
          <p>
            Система {activeScoutMission.target_galaxy}:{activeScoutMission.target_system}
          </p>
          <p>До завершения: {formatSecondsLeft(scoutSecondsLeft)}</p>
        </div>
      )}

      {activeResourceMission && (
        <div className="galaxy-mission-block galaxy-mission-block--resource">
          <h3 className="galaxy-mission-block__title">Активная ресурсная миссия</h3>
          <p>
            Система {activeResourceMission.target_galaxy}:{activeResourceMission.target_system}
          </p>
          <p>До завершения: {formatSecondsLeft(resourceSecondsLeft)}</p>
        </div>
      )}

      {lastScoutReport && (
        <div className="galaxy-result-block galaxy-result-block--scout">
          <h3 className="galaxy-result-block__title">Последний отчет разведки</h3>

          {!selectedMatchesLastScoutReport && selectedSystem && (
            <p className="galaxy-result-block__text">
              Сейчас выбрана система {selectedSystem.galaxy}:{selectedSystem.system}, а этот отчет
              относится к системе {lastScoutReport.target_galaxy}:{lastScoutReport.target_system}.
            </p>
          )}

          <p className="galaxy-result-block__text">{lastScoutReport.description}</p>

          <div className="galaxy-result-block__grid">
            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Система</span>
              <span>
                {lastScoutReport.target_galaxy}:{lastScoutReport.target_system}
              </span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Богатство</span>
              <span>{lastScoutReport.richness}</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Риск</span>
              <span>{getDangerBadgeLabel(lastScoutReport.danger_level)}</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Сигналы</span>
              <span>{getSignalsLabel(lastScoutReport.discovered_signals)}</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Дата отчета</span>
              <span>{formatDateTime(lastScoutReport.completed_at)}</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Угроза</span>
              <span>{lastScoutReport.danger}</span>
            </div>
          </div>
        </div>
      )}

      {lastResourceResult && (
        <div
          className={[
            'galaxy-result-block',
            `galaxy-result-block--${getResultTone(lastResourceResult)}`,
          ].join(' ')}
        >
          <h3 className="galaxy-result-block__title">Последний отчет ресурсной миссии</h3>

          {!selectedMatchesLastResult && selectedSystem && (
            <p className="galaxy-result-block__text">
              Сейчас выбрана система {selectedSystem.galaxy}:{selectedSystem.system}, а этот отчет
              относится к системе {lastResourceResult.target_galaxy}:{lastResourceResult.target_system}.
            </p>
          )}

          <p className="galaxy-result-block__text">{lastResourceResult.description}</p>

          <div className="galaxy-result-block__grid">
            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Система</span>
              <span>
                {lastResourceResult.target_galaxy}:{lastResourceResult.target_system}
              </span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Металл</span>
              <span>{lastResourceResult.metal_found}</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Кристалл</span>
              <span>{lastResourceResult.crystal_found}</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Риск</span>
              <span>{getDangerBadgeLabel(lastResourceResult.danger_level)}</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Потеря груза</span>
              <span>{lastResourceResult.cargo_loss_percent}%</span>
            </div>

            <div className="galaxy-result-block__item">
              <span className="galaxy-result-block__label">Транспорт</span>
              <span>{lastResourceResult.transport_lost ? 'Потерян' : 'Вернулся'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}