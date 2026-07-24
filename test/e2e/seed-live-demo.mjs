// /live（会場スクリーン）の動作確認用に、繋がり入りのにぎやかなデータを
// 稼働中の Firestore emulator に流し込む。既存の seed.mjs はノード3件・繋がり0本で
// グラフが空になるため、確認用に本ファイルを別に用意した（コミット対象外の想定）。
//
// 使い方:
//   node test/e2e/seed-live-demo.mjs                → デモ一式（ゲスト9名＋繋がり網）
//   node test/e2e/seed-live-demo.mjs admin <uid>    → <uid> を運営に（/control・L/R キー用）
//   node test/e2e/seed-live-demo.mjs me <uid> [名前] → ログイン中アカウントを承認済みゲストに
//   node test/e2e/seed-live-demo.mjs link <uidA> <uidB> → 繋がりを1本追加（速報トースト確認用）
//   node test/e2e/seed-live-demo.mjs control <patch-json> → control を部分更新（例 '{"ranking":"mosaic"}'）
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'

const env = await initializeTestEnvironment({
  projectId: 'demo-meatup',
  firestore: { host: '127.0.0.1', port: 8080 },
})

const [, , cmd, arg, arg2] = process.argv

// 交流タイムを 15:00 から 7 分刻みで並べる（/live のリプレイ VTR の時刻表示用）。
const BASE = new Date('2026-07-25T15:00:00+09:00').getTime()
const tsAt = (i) => Timestamp.fromMillis(BASE + i * 7 * 60 * 1000)
const cid = (x, y) => (x < y ? [x, y] : [y, x]).join('__')
const ends = (x, y) => (x < y ? { a: x, b: y } : { a: y, b: x })

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore()

  if (cmd === 'admin' && arg) {
    await setDoc(doc(db, 'admins', arg), {})
    return
  }

  if (cmd === 'me' && arg) {
    const myName = arg2 || 'こばしゅん'
    await setDoc(doc(db, 'attendees', arg), {
      authName: myName, name: myName, status: 'approved', edition: '2026',
      ticketNo: 'MU-2026-MEAT', job: 'エンジニア', expectations: ['meat', 'connect'],
      contactMethod: 'LINE', contactValue: 'preview', paid: true,
      createdAt: serverTimestamp(), approvedAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'shares', arg), {
      name: myName, ticketNo: 'MU-2026-MEAT', edition: '2026',
      role: 'エンジニア', expectations: ['meat', 'connect'],
    })
    return
  }

  if (cmd === 'link' && arg && arg2) {
    await setDoc(doc(db, 'connections', cid(arg, arg2)), {
      ...ends(arg, arg2), by: arg, edition: '2026', createdAt: serverTimestamp(),
    })
    return
  }

  if (cmd === 'control' && arg) {
    await setDoc(doc(db, 'control/2026'),
      { edition: '2026', updatedAt: serverTimestamp(), ...JSON.parse(arg) }, { merge: true })
    return
  }

  // 大人数モード: 会場想定(約50人)でステージを埋め、HUD との被りを実機確認する。
  //   node test/e2e/seed-live-demo.mjs big [人数=48]
  if (cmd === 'big') {
    const N = Number(arg) || 48
    const first = ['はると','ゆい','そうた','めい','あおい','りく','つむぎ','ひなた','ゆうと','さくら',
      'かえで','れん','みお','はな','だいき','あかり','しょう','ののか','たける','りな',
      'こうき','あん','ゆうき','まな','しんじ','えま','たいが','ちひろ','けんと','みなみ']
    const roles = ['エンジニア','デザイナー','営業','学生','マーケター','経営者','クリエイティブ','企画']
    const exp = ['meat', 'drink', 'play', 'connect']
    const uids = []
    for (let i = 0; i < N; i++) {
      const uid = 'g' + String(i).padStart(3, '0')
      uids.push(uid)
      const name = first[i % first.length] + (i >= first.length ? String(Math.floor(i / first.length) + 1) : '')
      await setDoc(doc(db, 'attendees', uid), {
        authName: name, name, status: 'approved', edition: '2026',
        ticketNo: `MU-2026-${uid}`, createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'shares', uid), {
        name, ticketNo: `MU-2026-${uid}`, edition: '2026',
        role: roles[i % roles.length], expectations: [exp[i % 4]],
      })
    }
    // 特別ユーザー（決定した配点を反映）：SR 4人×+3（公表・光る）／SSR 4人×+4（非公表）。
    for (let s = 0; s < 4; s++) {
      await setDoc(doc(db, 'specials', uids[s]), { bonusPoints: 3, public: true, name: `SR運営${s + 1}`, edition: '2026' })
    }
    for (let s = 4; s < 8; s++) {
      await setDoc(doc(db, 'specials', uids[s]), { bonusPoints: 4, public: false, name: `隠れ${s - 3}`, edition: '2026' })
    }
    await setDoc(doc(db, 'staff/2026'), { uids: [uids[0], uids[1], uids[2], uids[3]], edition: '2026' })
    // 繋がり: 各人が直後の数名と繋がる網（重複はIDで自然に排除）。
    let t = 0
    const made = new Set()
    for (let i = 0; i < N; i++) {
      const k = 2 + (i % 4) // 2〜5本
      for (let j = 1; j <= k; j++) {
        const y = uids[(i + j * 3) % N]
        const x = uids[i]
        if (x === y) continue
        const id = cid(x, y)
        if (made.has(id)) continue
        made.add(id)
        await setDoc(doc(db, 'connections', id), { ...ends(x, y), by: x, edition: '2026', createdAt: tsAt(t++) })
      }
    }
    await setDoc(doc(db, 'control/2026'), {
      game: 'open', ranking: 'shown', reveal: 0, replay: 0, edition: '2026', updatedAt: serverTimestamp(),
    })
    return
  }

  // --- デフォルト: デモ一式 ---
  // ゲスト（uid, 表示名, 肩書き）。uS=SR(公表+5) / uH=SSR(非公表+8) / 残りは通常。
  const guests = [
    ['uS', 'スタッフ里', '運営'],
    ['uH', '隠れ花', 'クリエイティブ'],
    ['uB', 'ボブ', 'エンジニア'],
    ['u1', 'みか', 'デザイナー'],
    ['u2', 'けん', '営業'],
    ['u3', 'さくら', '学生'],
    ['u4', 'だいき', 'エンジニア'],
    ['u5', 'ゆい', 'マーケター'],
    ['u6', 'りく', '経営者'],
  ]
  const expOf = ['meat', 'drink', 'play', 'connect']
  for (let i = 0; i < guests.length; i++) {
    const [uid, name, role] = guests[i]
    await setDoc(doc(db, 'attendees', uid), {
      authName: name, name, status: 'approved', edition: '2026',
      ticketNo: `MU-2026-${uid.toUpperCase()}${uid.toUpperCase()}`,
      createdAt: serverTimestamp(),
    })
    await setDoc(doc(db, 'shares', uid), {
      name, ticketNo: `MU-2026-${uid.toUpperCase()}${uid.toUpperCase()}`,
      edition: '2026', role, expectations: [expOf[i % 4]],
    })
  }

  // 特別ユーザー: SR（発光・公表）と SSR（非公表）
  await setDoc(doc(db, 'specials/uS'), { bonusPoints: 5, public: true, name: 'スタッフ里', edition: '2026' })
  await setDoc(doc(db, 'specials/uH'), { bonusPoints: 8, public: false, name: '隠れ花', edition: '2026' })
  await setDoc(doc(db, 'staff/2026'), { uids: ['uS'], edition: '2026' }) // 発光するのは公表SRのみ

  // 繋がり網（by=先にスキャンした側）。時刻をずらしてリプレイの timeline を作る。
  const links = [
    ['uS', 'uB'], ['uS', 'u1'], ['uS', 'u2'], ['uS', 'u3'], // SR に4人（各+5）
    ['uH', 'u1'], ['uH', 'u4'],                             // SSR に2人（各+8）
    ['uB', 'u1'], ['uB', 'u2'], ['u1', 'u2'], ['u2', 'u3'], // 通常どうしの網
    ['u3', 'u4'], ['u4', 'u5'], ['u5', 'u6'], ['u1', 'u6'],
    ['u2', 'u5'], ['u3', 'u6'],
  ]
  for (let i = 0; i < links.length; i++) {
    const [x, y] = links[i]
    await setDoc(doc(db, 'connections', cid(x, y)), {
      ...ends(x, y), by: x, edition: '2026', createdAt: tsAt(i),
    })
  }

  await setDoc(doc(db, 'control/2026'), {
    game: 'open', ranking: 'shown', reveal: 0, replay: 0,
    edition: '2026', updatedAt: serverTimestamp(),
  })
})

await env.cleanup()
console.log(
  cmd === 'admin' ? `seeded admin ${arg}`
    : cmd === 'me' ? `seeded approved guest ${arg}`
    : cmd === 'link' ? `linked ${arg} __ ${arg2}`
    : cmd === 'control' ? `patched control: ${arg}`
    : 'seeded live demo (9 guests, 16 connections, SR uS +5 / SSR uH +8)',
)
