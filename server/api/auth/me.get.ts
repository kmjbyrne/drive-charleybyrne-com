import { getUserFromRequest } from '~~/server/app/auth'

export default defineEventHandler(async (event) => {
  const user = await getUserFromRequest(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  return {
    sub: user.sub,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    tid: user.tid
  }
})
