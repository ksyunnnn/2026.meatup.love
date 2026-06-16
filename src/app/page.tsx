import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.hero}>
      <div className={styles.meat}>🍖</div>

      <h1 className={styles.wordmark}>
        meat<span className={styles.up}>up</span>
      </h1>
      <span className={styles.year}>2026</span>

      <p className={styles.tagline}>お肉でつながる、あの会。</p>
      <p className={styles.note}>日時・場所は調整中。続報を待て🔥</p>

      <div className={styles.cta}>
        <Link className="btn btn--primary btn--block" href="/invite">
          招待された方はこちら →
        </Link>
        <Link className="btn btn--block" href="/ticket">
          チケットを見る
        </Link>
      </div>

      <p className={styles.foot}>歴代 meatup：2018 / 2019 summer …</p>
    </main>
  );
}
