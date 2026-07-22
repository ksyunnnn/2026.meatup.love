// Seed the running Firestore emulator for the 繋がりレース E2E (issue #11).
// Writes partner guests (a normal, a public staff special, a hidden special)
// and the control doc, bypassing rules via the rules-unit-testing admin path.
// Usage: node test/e2e/seed.mjs             → seed the game fixtures
//        node test/e2e/seed.mjs admin <uid>  → also mark <uid> as an admin
//        node test/e2e/seed.mjs me <uid> [名前] → register <uid> as an approved
//          guest, so the logged-in account can see the participant screens
//          (/mypage の Meat & Greet カード, /game).
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const env = await initializeTestEnvironment({
  projectId: 'demo-meatup',
  firestore: { host: '127.0.0.1', port: 8080 },
})

const [, , cmd, arg, arg2] = process.argv

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()
  const att = (name, no) => ({
    authName: name,
    name,
    status: 'approved',
    edition: '2026',
    ticketNo: no,
    createdAt: serverTimestamp(),
  })
  const share = (name, no, role, exp) => ({ name, ticketNo: no, edition: '2026', role, expectations: exp })

  if (cmd === 'admin' && arg) {
    await setDoc(doc(db, 'admins', arg), {})
    return
  }

  // Register the caller's own uid as an approved guest so the participant-facing
  // screens are reachable while previewing (/mypage card → /game).
  if (cmd === 'me' && arg) {
    const myName = arg2 || 'こばしゅん'
    await setDoc(doc(db, 'attendees', arg), {
      ...att(myName, 'MU-2026-MEAT'),
      job: 'エンジニア',
      expectations: ['meat', 'connect'],
      contactMethod: 'LINE',
      contactValue: 'preview',
      paid: true,
      approvedAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'shares', arg), share(myName, 'MU-2026-MEAT', 'エンジニア', ['meat', 'connect']))
    return
  }

  await setDoc(doc(db, 'attendees/uB'), att('ボブ', 'MU-2026-BBBB'))
  await setDoc(doc(db, 'shares/uB'), share('ボブ', 'MU-2026-BBBB', 'エンジニア', ['meat', 'drink']))

  await setDoc(doc(db, 'attendees/uS'), att('スタッフ里', 'MU-2026-SSSS'))
  await setDoc(doc(db, 'shares/uS'), share('スタッフ里', 'MU-2026-SSSS', '運営', ['connect']))
  await setDoc(doc(db, 'specials/uS'), { bonusPoints: 5, public: true, name: 'スタッフ里', edition: '2026' })

  await setDoc(doc(db, 'attendees/uH'), att('隠れ花', 'MU-2026-HHHH'))
  await setDoc(doc(db, 'shares/uH'), share('隠れ花', 'MU-2026-HHHH', 'クリエイティブ', ['play']))
  await setDoc(doc(db, 'specials/uH'), { bonusPoints: 8, public: false, name: '隠れ花', edition: '2026' })

  // public staff list (only public specials — hidden ones never listed)
  await setDoc(doc(db, 'staff/2026'), { uids: ['uS'], edition: '2026' })

  await setDoc(doc(db, 'control/2026'), {
    game: 'open',
    ranking: 'shown',
    reveal: 0,
    edition: '2026',
    updatedAt: serverTimestamp(),
  })
})

await env.cleanup()
console.log(
  cmd === 'admin'
    ? `seeded admin ${arg}`
    : cmd === 'me'
      ? `seeded approved guest ${arg}`
      : 'seeded game fixtures',
)
