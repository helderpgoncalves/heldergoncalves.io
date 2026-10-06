export default function Pagina() {
  return (
    <main className="papel grid place-items-center px-6">
      <div className="max-w-[34rem]">
        <p className="font-mono text-[0.75rem] tracking-[0.18em] text-suave uppercase">lab.heldergoncalves.io</p>
        <h1 className="mt-5 font-serif text-[clamp(3rem,9vw,6rem)] leading-[0.95] tracking-[-0.03em]">Em preparação.</h1>
        <p className="mt-6 font-leitura text-xl leading-relaxed text-suave">
          Este subdomínio é uma mini-app à parte, servida pelo mesmo processo que a página principal.
        </p>
        <a href="https://heldergoncalves.io" className="mt-8 inline-block underline decoration-linha underline-offset-[6px] hover:decoration-tinta">heldergoncalves.io →</a>
      </div>
    </main>
  );
}
