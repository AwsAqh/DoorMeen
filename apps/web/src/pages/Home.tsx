import React, { useEffect, useRef, useState } from "react";
import PopupForm from "../PopupForm";

import PublicPageImage from "@/assets/image.png"
import OwnerPageImage from "@/assets/ownerPage.png"
import BannerImage from "@/assets/banner.png"

import "../customstyle.css";
import Header from "../components/Header";
import Carousel from "../components/Carousel";

import { AnimatePresence, motion } from "framer-motion";
import { CreateData,handleCreate } from "../features/queue/handlers";
import { useNavigate } from "react-router-dom";
import Footer from "../components/Footer";
import { toast, Toaster } from "sonner"
import { METHODS } from "http";
const Home = () => {
  const navigate=useNavigate()
  const firstInputRef=useRef<HTMLInputElement>(null)
  const secondInputRef=useRef<HTMLInputElement>(null)
  const texts = [
    { h: "Instant QR for customers", p: "Share and start taking names in seconds." },
    { h: "Owner-only actions via PIN", p: "Serve next, skip, or remove—no shouting." },
    { h: "Track waiting with privacy protection for the phone number", p: "Clear, fair, and fast for everyone." }
  ];

  const [open, setOpen] = useState(false);
  const [textIndex, setTextIndex] = useState<number>(0);


    useEffect(()=>{
      const ping=async()=>{
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/health`,{method:"GET", headers:{"Content-type":"application/json"}})
      }
     ping() 
    },[])

  const getErrorMessage = (e: unknown): string =>
    e instanceof Error ? e.message : typeof e === "string" ? e : "Something went wrong";
 const CLASS = "bg-card text-card-foreground border-border";
  const handleSubmit=(e:React.FormEvent)=>{
    e.preventDefault();
    const id = toast.loading("Creating...", { className: CLASS, duration: Infinity });
    (async()=>{

    
    const a = firstInputRef.current?.value?.trim() ?? "";
    const b = secondInputRef.current?.value?.trim() ?? "";
    
    try{
    const payload:CreateData={name:a,password:b}
      const res=await handleCreate(payload)
      toast.success("Created!",{ id, className: CLASS, duration: 2500 })
      setOpen(false)
      navigate(`/queue/${res.id}`)
      
      
  }
    catch(err){ 
     
       
          toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
        
      
    }
  })()



  }


  return (
  
      <div className="min-h-screen bg-gray-500 overflow-x-hidden flex flex-col justify-between">
        <Header />
        <Toaster position="top-center" offset={16} />
        {/* hero */}
        <main
          className="
            mx-auto max-w-7xl
            px-4 sm:px-6 lg:px-8
            grid grid-cols-1 md:grid-cols-2
            items-center
            gap-8 md:gap-12 lg:gap-22
            py-10 md:py-16
          "
        >
       
          {/* Left: carousel */}
          <div className="mx-auto w-full sm:max-w-[520px] md:max-w-[600px] lg:max-w-[680px] xl:max-w-[720px] 2xl:max-w-[768px]">
  <div className="aspect-[16/10] rounded-3xl overflow-hidden shadow-xl">
       <Carousel className="w-full h-full rounded-3xl overflow-hidden shadow-xl"  onNextImage={(i)=>setTextIndex(i)}>
      <img src={BannerImage} alt="Banner" className="w-full h-full object-contain bg-white" />
     
      <img src={OwnerPageImage} alt="Owner" className="w-full h-full object-contain bg-white" />

      <img src={PublicPageImage} alt="Public" className="w-full h-full object-contain bg-white" />
    </Carousel>
  </div>
</div>


          {/* Right: text + cta */}
          <div className="w-full space-y-8 text-center md:text-left ">
            <AnimatePresence mode="wait">
              <motion.div
                key={textIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="space-y-3"
              >
                <h2 className="text-secondary text-4xl font-bold">
                  {texts[textIndex].h}
                </h2>
                <p className="text-slate-300 ">
                  {texts[textIndex].p}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Buttons: stack on mobile, row on >=sm */}
            <div className=" flex flex-col sm:flex-row items-stretch sm:items-center justify-center md:justify-start gap-3 sm:gap-4 pt-2">
              <button onClick={() => setOpen(true)} className="btn btn-lg cursor-pointer !bg-gray-900 hover:shadow-2xl">
                Create a queue now!
              </button>

              <a
                href="/scan"
                className="bg-white border-2 border-primary text-primary px-6 py-3 rounded-lg hover:bg-teal-50 transition"
              >
                Scan a QR
              </a>
            </div>

            <ul className="text-secondary space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                📱 Instant QR for customers
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                🔒 Owner-only actions via PIN
              </li>
              <li className="flex items-center gap-2">
                <span className="text-primary">•</span>
                ⏱️ Track waiting & serve next
              </li>
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

        <Footer/>
      </div>
   
  );
};

export default Home;
