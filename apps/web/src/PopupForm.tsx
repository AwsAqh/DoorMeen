import React from "react"

type Mode = "create" | "join";

type PopupFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  type: Mode;     
  firstInputRef:React.Ref<HTMLInputElement>
  secondInputRef:React.Ref<HTMLInputElement>                
};


const COPIES: Record<Mode, {
  title: string;
  subTitle: string;
  label1: string;
  placeholder1: string;
  label2: string;
  placeholder2: string;
  note: string;
  action:string
}> = {
  create: {
    title: "Create a Queue",
    subTitle: "Set a name and a PIN (4–6 digits) for the queue.",
    label1: "Queue name",
    placeholder1: "Enter queue name…",
    label2: "PIN",
    placeholder2: "4–6 digits",
    note: "Only digits, 4–6 length.",
    action:"Create"
  },
  join: {
    title: "Join a queue",
    subTitle: "Join this queue with your name and phone number",
    label1: "Name",
    placeholder1: "Enter your name…",
    label2: "Phone number",
    placeholder2: "05xxxxxxxx",
    note: "Enter your 10 digits phone number",
    action:"Join"
  },
};

const PopupForm: React.FC<PopupFormProps> = ({ open, onClose, onSubmit ,type ,firstInputRef,secondInputRef}) => {
  if (!open) return null
  
  const copy = COPIES[type];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{copy.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
             {copy.subTitle}
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
                {copy.label1}
              </label>
              <input
               ref= {firstInputRef}
                id="Name"
                name="Name"
                type="text"
                placeholder={copy.placeholder1}
                required
                className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            <div>
              <label htmlFor="Password" className="mb-1 block text-sm font-medium text-gray-700">
                {copy.label2}
              </label>
              <input
              ref={secondInputRef}
                id="Password"
                name="Password"
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                placeholder={copy.placeholder2}
                required
                className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
              <p className="mt-1 text-xs text-gray-500">{copy.note}</p>
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
                {copy.action}
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
