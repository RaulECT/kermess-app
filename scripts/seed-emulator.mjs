/**
 * Seed script for Firebase emulator.
 * Creates: 1 admin, 2 cashiers, 3 stations (2 simple, 1 menu), 5 test users.
 *
 * Usage: node scripts/seed-emulator.mjs
 * Requires emulators running on default ports.
 */

const FUNCTIONS_URL = 'http://127.0.0.1:5001/kermes-app-39afa/us-central1'

async function call(fn, data) {
  const res = await fetch(`${FUNCTIONS_URL}/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  const json = await res.json()
  if (json.error) {
    if (json.error.message?.includes('Ya existe')) {
      console.log(`  [skip] ${fn}: ${json.error.message}`)
      return null
    }
    throw new Error(`${fn} failed: ${json.error.message}`)
  }
  return json.result
}

async function clearFirestore() {
  const res = await fetch(
    'http://127.0.0.1:8080/emulator/v1/projects/kermes-app-39afa/databases/(default)/documents',
    { method: 'DELETE' }
  )
  if (!res.ok) throw new Error('Failed to clear Firestore')
  console.log('Firestore cleared')
}

async function main() {
  console.log('=== Seeding emulator ===\n')

  // 1. Clear existing data
  await clearFirestore()

  // 2. Create admin
  console.log('Creando admin...')
  const admin = await call('createInitialAdmin', { name: 'Admin Principal', pin: '123456' })
  if (admin) console.log(`  Admin: PIN 123456 → ${admin.adminId}`)

  const ADMIN_PIN = '123456'

  // 3. Create cashiers
  console.log('\nCreando cajeros...')
  const c1 = await call('createOperator', { adminPin: ADMIN_PIN, name: 'Cajero 1', pin: '111111' })
  if (c1) console.log(`  Cajero 1: PIN 111111 → ${c1.operatorId}`)
  const c2 = await call('createOperator', { adminPin: ADMIN_PIN, name: 'Cajero 2', pin: '222222' })
  if (c2) console.log(`  Cajero 2: PIN 222222 → ${c2.operatorId}`)

  // 4. Create stations
  console.log('\nCreando estaciones...')
  const s1 = await call('upsertStation', {
    adminPin: ADMIN_PIN,
    station: {
      name: 'Tacos',
      type: 'simple',
      simplePrice: 3,
      menu: null,
      operatorPin: '3333',
      active: true,
      order: 1,
    },
  })
  if (s1) console.log(`  Estación Tacos (simple, 3 cupones): ${s1.stationId}`)

  const s2 = await call('upsertStation', {
    adminPin: ADMIN_PIN,
    station: {
      name: 'Bebidas',
      type: 'simple',
      simplePrice: 2,
      menu: null,
      operatorPin: '4444',
      active: true,
      order: 2,
    },
  })
  if (s2) console.log(`  Estación Bebidas (simple, 2 cupones): ${s2.stationId}`)

  const s3 = await call('upsertStation', {
    adminPin: ADMIN_PIN,
    station: {
      name: 'Juegos',
      type: 'menu',
      simplePrice: null,
      menu: [
        { id: 'j1', name: 'Brincolín (1 turno)', price: 5, active: true },
        { id: 'j2', name: 'Piñata', price: 8, active: true },
        { id: 'j3', name: 'Pelota', price: 3, active: true },
      ],
      operatorPin: '5555',
      active: true,
      order: 3,
    },
  })
  if (s3) console.log(`  Estación Juegos (menú): ${s3.stationId}`)

  // 5. Set event to live
  console.log('\nConfigurando evento...')
  await call('updateConfig', {
    adminPin: ADMIN_PIN,
    patch: {
      name: 'Kermes 2026',
      couponRate: 1,
      goals: [
        { id: 'g1', name: 'Biblioteca', target: 15000 },
        { id: 'g2', name: 'Laboratorio', target: 20000 },
        { id: 'g3', name: 'Cancha', target: 12000 },
      ],
    },
  })
  console.log('  Evento configurado: Kermes 2026')

  // 6. Create test users with balance
  console.log('\nCreando usuarios de prueba...')
  const users = [
    { name: 'Ana García', phone: '5551234567' },
    { name: 'Carlos López', phone: '5552345678' },
    { name: 'María Martínez', phone: '5553456789' },
    { name: 'José Hernández', phone: '5554567890' },
    { name: 'Lucía Ramírez', phone: '5555678901' },
  ]
  const CASHIER_PIN = '111111'
  for (const u of users) {
    const reg = await call('registerUser', { cashierPin: CASHIER_PIN, name: u.name, phone: u.phone })
    if (reg) {
      const clientTxId = crypto.randomUUID()
      await call('topup', {
        cashierPin: CASHIER_PIN,
        userId: reg.userId,
        pesos: 100,
        paymentMethod: 'cash',
        goalId: 'g1',
        clientTxId,
      })
      console.log(`  ${u.name}: token=${reg.qrToken} (100 cupones)`)
    }
  }

  console.log('\n=== Seed completo ===')
  console.log('\nCredenciales:')
  console.log('  Admin PIN:     123456')
  console.log('  Cajero 1 PIN:  111111')
  console.log('  Cajero 2 PIN:  222222')
  console.log('  Tacos PIN:     3333')
  console.log('  Bebidas PIN:   4444')
  console.log('  Juegos PIN:    5555')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
