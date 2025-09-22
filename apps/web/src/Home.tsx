import React, { useState } from "react"
import PopupForm from "./PopupForm"
import QrImage from "../src/assets/download.png"
import "../src/customstyle.css"
const Home = () => {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
    <header
  className="
    relative w-screen overflow-hidden bg-gray-900 text-white
    ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] header flex content-center gap-10
  "
>
  <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
    <h1 className="text-2xl font-semibold tracking-tight">Door Meen</h1>
    <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
      Create a queue
    </button>
  </div>

  {/* curved bottom */}
  <div
    aria-hidden
    className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[120vw] -translate-x-1/2 rounded-[50%] bg-gray-900"
  />
</header>

      {/* hero */}
      <main className="mx-auto grid w-full max-w-6xl grid-cols-2 items-center justify-between  px-4 py-12 lg:grid-cols-2 ">

        <div className="relative w-full">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-gray-200/40 to-white blur-2xl" />
          <img
            src={QrImage}
            alt="Queue demo"
            className="w-full rounded-3xl border border-gray-200 bg-white/50 object-cover shadow"
          />
        </div>

        <div className="w-full space-y-5 text-center md:text-left">
          <h2 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            Create your queue in seconds
          </h2>
          <p className="text-gray-600">
            Let customers register quickly—no shouting names, no confusion. Share a QR and manage
            the line with a simple PIN.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-20  pt-2 md:justify-start w-full">
            <button
              onClick={() => setOpen(true)}
              className="rounded-2xl bg-gray-900 px-6 py-3 text-white shadow-sm transition hover:bg-black active:scale-[.99]"
            >
              Create a queue now!
            </button>
            <button>
            <a
              href="/scan"
              className="rounded-2xl border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50 active:scale-[.99]"
            >
              Scan a QR
            </a>
            </button>
          </div>

          <ul className="mt-4 space-y-2 text-sm text-gray-600">
            <li>• Instant QR for customers</li>
            <li>• Owner-only actions via PIN</li>
            <li>• Track waiting & serve next</li>
          </ul>
        </div>
      </main>

      <PopupForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(e) => {
          e.preventDefault()
          console.log("submitted!")
        }}
      />
    </div>
  )
}

export default Home
