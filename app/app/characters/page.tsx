import Link from "next/link";
import { AppBottomNav } from "../../_components/AppBottomNav";

export default function CharactersPage() {
  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <p className="text-sm font-semibold tracking-[0.24em] text-[#7DD3FC]">
            CHARACTERS
          </p>
          <h1 className="mt-2 text-3xl font-black">キャラクター</h1>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            あなたが生み出したキャラクターたちが、ここに並びます。
          </p>
        </header>

        <div className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#BEF264]/10 text-2xl">
            ◇
          </div>

          <h2 className="mt-5 text-xl font-black">
            まだキャラクターがいません
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
            最初のひとりに、姿と名前を贈りましょう。
          </p>

          <Link
            href="/app/characters/new"
            className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
          >
            キャラクターを作成する
          </Link>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}