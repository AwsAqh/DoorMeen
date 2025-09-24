// pages/QueuePage.tsx
import React, { useState , useRef, useEffect } from "react";
import Header from "../components/Header";
import MorphingBlobs from "@/components/background/MorphingBlobs";
import QrImage from "../assets/download (1).png";
import Waiter from "@/components/Waiter";
import AddIcon from "@mui/icons-material/Add";
import PopupForm from "@/PopupForm";
export default function QueuePage() {
    const [open,setOpen]=useState<any>(false)
    type User = { name: string; phone: string; status: string };
    
    const [users,setUsers]=useState<User[]>([
        { name:"Aws", phone:"0595152186", status:"In progress" }  ,  { name:"Aws", phone:"0595152186", status:"waiting" } ,  { name:"Aws", phone:"0595152186", status:"waiting" }])
        const firstInputRef=useRef<HTMLInputElement>(null)
  const secondInputRef=useRef<HTMLInputElement>(null)
  type Status = "waiting" | "serving" | "done";
        
  useEffect(()=>{console.log(users)},[users])
       const addWaiter=()=>{
        console.log(firstInputRef.current.value)
        const name  = firstInputRef.current?.value?.trim() ?? "";
            const phone = secondInputRef.current?.value?.trim() ?? "";
            if (!name || !phone) return;

        setUsers(prev => [...prev, { name, phone, status: "waiting" }]);

        firstInputRef.current.value=""
        secondInputRef.current.value=""
        setOpen(false)
    } 
  return (
    <MorphingBlobs>
      <div className="min-h-[100svh] flex flex-col">
        <Header />

        <div className="flex-1 w-full flex flex-col items-center gap-8 px-4 py-10">
          {/* title + qr */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">Aws saloon</h1>
            <img
              src={QrImage}
              alt="Queue QR"
              className="mx-auto rounded-2xl shadow-sm max-w-[220px] w-full"
            />
          </div>

          {/* People list + right rail for the button */}
          <div className="w-full max-w-3xl md:grid md:grid-cols-[1fr_auto] md:items-start md:gap-4">
            {/* list */}
            <main className="space-y-4">
                {users.map((u,index)=>{ return <Waiter  key={index} name={u.name} phone={u.phone} status={u.status}     />})}
            </main>

             <aside
                className="
                    mt-4 md:mt-0
                    md:sticky md:self-start
                    md:top-[calc(100svh-5.5rem)]   /* ≈ bottom with ~1.5rem breathing room */
                "
                >
                <button
                    onClick={()=>setOpen(true)}
                    aria-label="Join queue"
                    className="w-12 h-12 rounded-full bg-white shadow-lg hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
                >
                    <AddIcon fontSize="small" />
                </button>
                </aside>

          </div>
          <PopupForm
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={(e) => {
            e.preventDefault();
             addWaiter() ;
          }}
          firstInputRef={firstInputRef}
          secondInputRef={secondInputRef}
          type="join"
        />

        </div>
      </div>
    </MorphingBlobs>
  );
}
