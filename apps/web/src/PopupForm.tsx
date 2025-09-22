import React from "react"

type PopupFormProps = {
  open: boolean
  onClose: () => void
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}

const PopupForm: React.FC<PopupFormProps> = ({ open, onClose, onSubmit }) => {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Create a Queue</h2>
            <p className="mt-1 text-sm text-gray-500">
              Set a name and a PIN (4–6 digits) for the queue.
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              onSubmit?.(e)
            }}
          >
            <div>
              <label htmlFor="Name" className="mb-1 block text-sm font-medium text-gray-700">
                Queue name
              </label>
              <input
                id="Name"
                name="Name"
                type="text"
                placeholder="Enter queue name…"
                required
                className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <div>
              <label htmlFor="Password" className="mb-1 block text-sm font-medium text-gray-700">
                PIN
              </label>
              <input
                id="Password"
                name="Password"
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                placeholder="4–6 digit PIN"
                required
                className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
              <p className="mt-1 text-xs text-gray-500">Only digits, 4–6 length.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50 active:scale-[.99]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-black active:scale-[.99]"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* click outside to close */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 -z-10 cursor-default"
      />
    </div>
  )
}

export default PopupForm
