export function TasteEducation() {
  return (
    <section className="bg-paper sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 mb-12 md:mb-16">
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">N°11</span>
              <span className="cap">Taste Education</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              How to read
              <br />
              a <span className="italic font-serif font-light">manicure</span>
              <span className="text-akane">.</span>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5 flex flex-col justify-end">
            <p className="text-rikyu text-[17px] max-w-[420px]">
              A manicure is built from four variables: shape, finish, length, and signal. Configure your detail like a suit.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-px bg-[var(--hair)] border border-hair">
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-toriko p-7">
            <div className="flex items-center justify-between mb-6">
              <span className="cap">01 · Shape</span>
              <span className="font-mono text-[10px] text-rikyu">·SQUOVAL·</span>
            </div>
            <div className="grid grid-cols-2 gap-4 my-4">
              <div className="text-center">
                <svg viewBox="0 0 60 80" className="mx-auto" width="60" height="80">
                  <rect x="6" y="8" width="48" height="64" rx="6" fill="#281A14" />
                </svg>
                <span className="cap mt-2 inline-block">Square</span>
              </div>
              <div className="text-center">
                <svg viewBox="0 0 60 80" className="mx-auto" width="60" height="80">
                  <rect x="6" y="8" width="48" height="64" rx="18" fill="#281A14" />
                </svg>
                <span className="cap mt-2 inline-block">Squoval</span>
              </div>
            </div>
            <p className="text-[13px] text-rikyu mt-4">
              Square feels sharper and more graphic. Squoval feels natural and easier for daily wear.
            </p>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-toriko p-7">
            <div className="flex items-center justify-between mb-6">
              <span className="cap">02 · Finish</span>
              <span className="font-mono text-[10px] text-rikyu">·MATTE·</span>
            </div>
            <div className="flex items-end justify-around my-4 h-[80px]">
              <span className="w-10 h-16" style={{ background: "#281A14" }} />
              <span className="w-10 h-16" style={{ background: "linear-gradient(135deg,#281A14,#656765)" }} />
              <span
                className="w-10 h-16"
                style={{ background: "linear-gradient(135deg,#9EA1A3,#F5F5F5,#9EA1A3)" }}
              />
            </div>
            <div className="grid grid-cols-3 text-center">
              <span className="cap">Matte</span>
              <span className="cap">Gloss</span>
              <span className="cap">Chrome</span>
            </div>
            <p className="text-[13px] text-rikyu mt-4">Matte is quiet. Gloss is polished. Chrome is high-signal.</p>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-toriko p-7">
            <div className="flex items-center justify-between mb-6">
              <span className="cap">03 · Length</span>
              <span className="font-mono text-[10px] text-rikyu">·SHORT·</span>
            </div>
            <div className="flex items-end justify-around my-4 h-[80px]">
              <span
                className="w-7"
                style={{ height: "36px", borderRadius: "8px 8px 12px 12px", background: "#281A14" }}
              />
              <span
                className="w-7"
                style={{ height: "54px", borderRadius: "8px 8px 12px 12px", background: "#281A14" }}
              />
              <span
                className="w-7"
                style={{ height: "74px", borderRadius: "8px 8px 12px 12px", background: "#281A14" }}
              />
            </div>
            <div className="grid grid-cols-3 text-center">
              <span className="cap">Short</span>
              <span className="cap">Medium</span>
              <span className="cap">Long</span>
            </div>
            <p className="text-[13px] text-rikyu mt-4">Short is daily. Medium is styled. Long is editorial.</p>
          </div>
          <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-toriko p-7">
            <div className="flex items-center justify-between mb-6">
              <span className="cap">04 · Color</span>
              <span className="font-mono text-[10px] text-rikyu">·SIGNAL·</span>
            </div>
            <div className="grid grid-cols-4 gap-2 my-4">
              <span className="aspect-square" style={{ background: "#D4AC68" }} title="黄朽葉" />
              <span className="aspect-square" style={{ background: "#9EA1A3" }} title="銀鼠" />
              <span className="aspect-square" style={{ background: "#281A14" }} title="鉄黒" />
              <span className="aspect-square" style={{ background: "#44617B" }} title="紺鼠" />
              <span
                className="aspect-square"
                style={{ background: "linear-gradient(135deg,#9EA1A3,#F5F5F5,#9EA1A3)" }}
                title="銀色"
              />
              <span className="aspect-square" style={{ background: "#E4DDCC" }} title="白茶" />
              <span className="aspect-square" style={{ background: "#913225" }} title="弁柄" />
              <span className="aspect-square" style={{ background: "#B7282E" }} title="茜" />
            </div>
            <p className="text-[13px] text-rikyu mt-4">
              Nude and gray are low signal. Black and navy are structured. Silver and chrome are high signal.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px] uppercase tracking-[0.22em] font-mono text-rikyu">
          <span>· Configure like a suit ·</span>
          <span className="text-center md:text-left">Shape × Finish</span>
          <span className="text-center md:text-left">Length × Signal</span>
          <span className="text-right">— Nippon Palette · 26</span>
        </div>
      </div>
    </section>
  );
}
