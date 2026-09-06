// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppRoutes from './AppRoutes.jsx'
import { ServicesProvider } from './services.js'
import { SessionProvider } from '../features/session/SessionProvider.jsx'
import { GameConnectionProvider } from '../features/session/GameConnectionProvider.jsx'
import MatchView from '../features/match/MatchView.jsx'

vi.mock('../features/app-shell/SiteBackground/index.js', () => ({
  SiteBackground: () => null,
}))
vi.mock('../features/match/GameCanvas.jsx', () => ({
  default: () => <canvas aria-label="Polygon Pong arena" />,
}))

beforeEach(() => {
  window.matchMedia = () => ({ matches: true })
})
afterEach(cleanup)

function setup(path = '/lobby', currentUser = { id: 'u1', username: 'Pilot' }) {
  const connection = { send: vi.fn().mockResolvedValue({}), close: vi.fn() }
  const services = {
    session: {
      current: vi.fn().mockResolvedValue(currentUser),
      guest: vi.fn().mockResolvedValue({ id: 'guest', username: 'Guest' }),
      login: vi.fn().mockResolvedValue(currentUser),
      register: vi.fn().mockResolvedValue({ id: 'new', username: 'NewPilot' }),
      logout: vi.fn().mockResolvedValue(null),
    },
    rooms: { create: vi.fn().mockResolvedValue({ id: 'ROOM01' }) },
    history: { list: vi.fn().mockResolvedValue([]) },
    createConnection: vi.fn((onMessage, onStatus) => {
      connection.emit = onMessage
      onStatus('connected')
      return connection
    }),
  }
  const mount = () =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <ServicesProvider value={services}>
          <SessionProvider>
            <GameConnectionProvider>
              <AppRoutes />
            </GameConnectionProvider>
          </SessionProvider>
        </ServicesProvider>
      </MemoryRouter>,
    )
  return { services, connection, mount }
}

describe('UI feature integration', () => {
  it('logs only misses, not successful ball returns', () => {
    const snapshot = {
      matchId: 'm1',
      hostId: 'u1',
      tick: 1,
      stage: 1,
      phase: 'playing',
      phaseEndsAt: null,
      arena: { type: 'duel', sides: [], vertices: [] },
      ball: { position: { x: 0, y: 0 }, velocity: { x: 1, y: 0 }, radius: 6 },
      paddles: [],
      players: [
        {
          id: 'u1',
          username: 'Pilot',
          status: 'active',
          placement: null,
          returns: 0,
          eliminatedAt: null,
          eliminationReason: null,
          disconnectedAt: null,
        },
        {
          id: 'u2',
          username: 'Other',
          status: 'active',
          placement: null,
          returns: 0,
          eliminatedAt: null,
          eliminationReason: null,
          disconnectedAt: null,
        },
      ],
      serverTime: Date.now(),
      winnerId: null,
      startedAt: Date.now(),
      longestRally: 0,
    }

    const { rerender } = render(
      <MatchView
        snapshot={snapshot}
        userId="u1"
        status="connected"
        onLeave={() => {}}
      />,
    )

    rerender(
      <MatchView
        snapshot={{
          ...snapshot,
          tick: 2,
          players: snapshot.players.map((player) =>
            player.id === 'u1'
              ? { ...player, status: 'eliminated', eliminationReason: 'miss' }
              : player,
          ),
        }}
        userId="u1"
        status="connected"
        onLeave={() => {}}
      />,
    )

    expect(screen.getByText(/Pilot missed the ball/i)).toBeTruthy()
    expect(screen.queryByText(/returned the ball/i)).toBeNull()
  })

  it('creates a configured room and handles consecutive room/match events', async () => {
    const { services, connection, mount } = setup()
    mount()
    fireEvent.click(await screen.findByRole('radio', { name: /Stocks/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Vortex/ }))
    fireEvent.click(screen.getByRole('button', { name: /Create room/ }))
    await waitFor(() =>
      expect(services.rooms.create).toHaveBeenCalledWith({
        format: 'stocks',
        modifiers: ['vortex'],
      }),
    )
    await waitFor(() =>
      expect(connection.send).toHaveBeenCalledWith('room.join', {
        roomId: 'ROOM01',
      }),
    )
    act(() =>
      connection.emit({
        type: 'room.snapshot',
        payload: {
          id: 'ROOM01',
          code: 'ROOM01',
          members: [
            { id: 'u1', username: 'Pilot', host: true, ready: true },
            { id: 'u2', username: 'Other', ready: true },
          ],
        },
      }),
    )
    const start = await screen.findByRole('button', { name: 'Start game' })
    expect(start.disabled).toBe(false)
    fireEvent.click(start)
    expect(connection.send).toHaveBeenCalledWith('room.start', {})
    act(() => {
      connection.emit({
        type: 'match.started',
        payload: { matchId: 'm1', players: [], phase: 'countdown' },
      })
      connection.emit({
        type: 'game.snapshot',
        payload: { matchId: 'm1', players: [], phase: 'playing', stage: 2 },
      })
    })
    expect(await screen.findByRole('heading', { name: 'Players' })).toBeTruthy()
    expect(screen.getByText('Phase changed to playing')).toBeTruthy()
  })

  it('validates registration before invoking the authentication service', async () => {
    const { services, mount } = setup('/register', null)
    mount()
    fireEvent.change(screen.getByLabelText('GamerName'), {
      target: { value: 'NewPilot' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'different123' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: /Create account/ }).closest('form'),
    )
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Passwords do not match',
    )
    expect(services.session.register).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'password123' },
    })
    fireEvent.submit(
      screen.getByRole('button', { name: /Create account/ }).closest('form'),
    )
    await waitFor(() =>
      expect(services.session.register).toHaveBeenCalledWith({
        username: 'NewPilot',
        password: 'password123',
      }),
    )
    expect(
      await screen.findByRole('button', { name: /Create room/ }),
    ).toBeTruthy()
  })

  it('renders history failures and closes the connection on logout', async () => {
    const { services, connection, mount } = setup('/history')
    services.history.list.mockRejectedValue(new Error('History unavailable'))
    mount()
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'History unavailable',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(
      await screen.findByRole('button', { name: /Start Game/ }),
    ).toBeTruthy()
    expect(connection.close).toHaveBeenCalledTimes(1)
    expect(services.session.logout).toHaveBeenCalledTimes(1)
  })
})
