import React, { useRef, useState } from "react";
import PopupForm from "./PopupForm";
import QrImage from "../src/assets/download.png";
import "../src/customstyle.css";
import Header from "./components/Header";
import Carousel from "./components/Carousel";
import MorphingBlobs from "./components/background/MorphingBlobs";
import { AnimatePresence, motion } from "framer-motion";
import { CreateData,handleCreate } from "./features/queue/handlers";
import { useNavigate } from "react-router-dom";
const Home = () => {
  const navigate=useNavigate()
  const firstInputRef=useRef<HTMLInputElement>(null)
  const secondInputRef=useRef<HTMLInputElement>(null)
  const texts = [
    { h: "Instant QR for customers", p: "Share and start taking names in seconds." },
    { h: "Owner-only actions via PIN", p: "Serve next, skip, or remove—no shouting." },
    { h: "Track waiting & serve next", p: "Clear, fair, and fast for everyone." }
  ];

  const [open, setOpen] = useState(false);
  const [textIndex, setTextIndex] = useState<number>(0);

  const handleSubmit=async(e)=>{
    e.preventDefault()
    const a = firstInputRef.current?.value?.trim() ?? "";
    const b = secondInputRef.current?.value?.trim() ?? "";
    
    try{
    const payload:CreateData={name:a,password:b}
      const res=await handleCreate(payload)

      setOpen(false)
      navigate(`/queue/${res.id}`)
      
      
  }
    catch(err){ 
      console.log(err.message)
    }
    



  }


  return (
    <MorphingBlobs>
      <div className="min-h-screen">
        <Header />

        {/* hero */}
        <main
          className="
            mx-auto max-w-7xl
            px-4 sm:px-6 lg:px-8
            grid grid-cols-1 md:grid-cols-2
            items-center
            gap-8 md:gap-12 lg:gap-16
            py-10 md:py-16
          "
        >
          {/* Left: carousel */}
          <div className="relative w-full">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-tr from-gray-200/40 to-white blur-2xl" />
            <Carousel autoPlay interval={3500} onNextImage={(i: number) => setTextIndex(i)}>
              {/* Use fluid aspect ratio instead of fixed height */}
              <img src={QrImage} alt="One" className="w-full rounded-xl aspect-[16/10] md:aspect-[4/3] object-cover" />
              <img src={QrImage} alt="Two" className="w-full rounded-xl aspect-[16/10] md:aspect-[4/3] object-cover" />
              <img src={QrImage} alt="Three" className="w-full rounded-xl aspect-[16/10] md:aspect-[4/3] object-cover" />
            </Carousel>
          </div>

          {/* Right: text + cta */}
          <div className="w-full space-y-5 text-center md:text-left">
            <AnimatePresence mode="wait">
              <motion.div
                key={textIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3"
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                  {texts[textIndex].h}
                </h2>
                <p className="text-gray-600 max-w-prose mx-auto md:mx-0">
                  {texts[textIndex].p}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Buttons: stack on mobile, row on >=sm */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-3 sm:gap-4 pt-2">
              <button onClick={() => setOpen(true)} className="btn btn-lg !bg-gray-900">
                Create a queue now!
              </button>
              <a
                href="/scan"
                className="btn btn-outline btn-lg text-gray-700"
              >
                Scan a QR
              </a>
            </div>

            <ul className="mt-4 space-y-1 text-sm text-gray-600 max-w-prose mx-auto md:mx-0">
              <li>• Instant QR for customers</li>
              <li>• Owner-only actions via PIN</li>
              <li>• Track waiting &amp; serve next</li>
            </ul>
          </div>
        </main>

        <PopupForm
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
           type="create"
           firstInputRef={firstInputRef}
           secondInputRef={secondInputRef}
        />
      </div>
    </MorphingBlobs>
  );
};

export default Home;
