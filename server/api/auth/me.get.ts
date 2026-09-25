export default defineEventHandler((event) => {
  const authenticated = isAuthenticated(event)
  return {
    authenticated
  }
})
