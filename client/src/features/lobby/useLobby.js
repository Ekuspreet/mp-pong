import { useState } from 'react'
import { useServices } from '../../app/services.js'

export default function useLobby(onRoomCreated) {
  const { rooms } = useServices()
  const [format, setFormat] = useState('elimination')
  const [modifiers, setModifiers] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const toggleModifier = (id) =>
    setModifiers((selected) =>
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    )

  async function createRoom() {
    setError('')
    setCreating(true)
    try {
      const room = await rooms.create({ format, modifiers })
      onRoomCreated(room.id)
    } catch (failure) {
      setError(failure.message)
    } finally {
      setCreating(false)
    }
  }
  return {
    format,
    setFormat,
    modifiers,
    toggleModifier,
    error,
    creating,
    createRoom,
  }
}
