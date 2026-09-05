import { createContext, useContext } from 'react'

const ServicesContext = createContext(null)
export const ServicesProvider = ServicesContext.Provider
export function useServices() {
  const services = useContext(ServicesContext)
  if (!services) throw new Error('ServicesProvider is required')
  return services
}
