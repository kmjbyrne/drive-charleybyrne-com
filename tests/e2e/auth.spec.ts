/**
 * Unauthenticated access tests.
 *
 * Verifies that all protected routes and API endpoints reject
 * unauthenticated callers and redirect to the login page.
 */

import { test, expect } from '@playwright/test'

test.describe('Redirect to login when unauthenticated', () => {
  test('/ redirects to /auth/login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('/storage redirects to /auth/login', async ({ page }) => {
    await page.goto('/storage')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Login page', () => {
  test('shows sign in button', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })
})

test.describe('API endpoints require authentication', () => {
  test('GET /api/auth/me returns 401', async ({ request }) => {
    const res = await request.get('/api/auth/me')
    expect(res.status()).toBe(401)
  })
})

test.describe('Auth cookie rejection', () => {
  test('invalid accessToken cookie returns 401 on /api/auth/me', async ({ request, context }) => {
    await context.addCookies([
      { name: 'accessToken', value: 'invalid.token.value', domain: 'localhost', path: '/' }
    ])
    const res = await request.get('/api/auth/me')
    expect(res.status()).toBe(401)
  })

  test('expired JWT is rejected', async ({ request, context }) => {
    // A structurally valid but expired JWT (RS512 signed, wrong key)
    const fakeJwt = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0IiwiZXhwIjoxfQ.fake'
    await context.addCookies([
      { name: 'accessToken', value: fakeJwt, domain: 'localhost', path: '/' }
    ])
    const res = await request.get('/api/auth/me')
    expect(res.status()).toBe(401)
  })
})

test.describe('Auth callback validation', () => {
  test('callback without code returns error', async ({ page }) => {
    await page.goto('/auth/callback')
    await expect(page.getByText('No authorization code received')).toBeVisible()
  })

  test('callback with invalid code fails gracefully', async ({ request }) => {
    const res = await request.post('/api/auth/callback', {
      data: { code: 'invalid-code', redirectUri: 'http://localhost:3002/auth/callback' }
    })
    expect(res.status()).not.toBe(200)
  })
})
