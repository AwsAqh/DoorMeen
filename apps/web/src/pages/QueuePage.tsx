// pages/QueuePage.tsx
import React, { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import MorphingBlobs from "@/components/background/MorphingBlobs";
import QrImage from "../assets/download (1).png";
import Waiter from "@/components/Waiter";
import AddIcon from "@mui/icons-material/Add";
import PopupForm from "@/PopupForm";
import { Mode } from "../components/Helpers/popupFormTypes";
import type { JoinData, ManageData } from "@/features/queue/handlers";
import { handleJoin, handleManage } from "@/features/queue/handlers";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { StatusEditor } from "@/components/StatusEditor";
import Stack from "@mui/material/Stack";
import type { Status } from "../components/Helpers/status";
import { CancelData,handleCancel } from "@/features/queue/handlers/cancel";
import { GetData, handleGetCustomers } from "@/features/queue/handlers/getCustomers";
import { UpdateData, handleupdateStatus } from "@/features/queue/handlers/update";
import { handleGetOwnerCustomers,GetOwnerCustomersData } from "@/features/queue/handlers/getOwnerCustomers";
import { handleServeCustomer,ServeCustomerData } from "@/features/queue/handlers/serveCustomer";
import { useOwnerGuard } from "@/hooks/useOwnerGuard";
import QueueNotFound from "@/components/QueueNotFound";
import NoCustomersFound from "@/components/NoCustomersFound";
import { useOwnerSession } from "@/hooks/useOwnerSession";
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
type User = {
  Id: number;
  QueueId: number;
  Name: string;
  PhoneNumber: string;
  State: Status;
};

type PageMode = "public" | "owner";

export default function QueuePage({ mode  }: { mode: PageMode }) {
  
    const {id}=useParams()
    const currentQueueId=id?Number(id):undefined
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [queueName,setQueueName]=useState<string>("")
    const [notFound,setNotFound]=useState<boolean>(false)
    const { signedIn } = useOwnerSession(id!, `https://localhost:7014/api/owners/check-owner/${Number(id)}`)

    useOwnerGuard(currentQueueId,mode)


      //get customers for public
      useEffect(()=>{
        
        const getCustomer=async()=>{try{
            const payload:GetData={QueueId:currentQueueId}
            const data=await handleGetCustomers(payload)
            setQueueName(data.Name)
            setUsers(data.Waiters)
            
          
        }
        catch(err){
          setNotFound(true)
            console.log(err,"error while getting customers")
        }}
        mode==="public"?getCustomer():null

      },[mode])

            //get customer as owner
      useEffect(()=>{
        const token=localStorage.getItem(`queue${currentQueueId} token`)
        if(!token) return;

        
        const getOwnerCustomers=async()=>{

          try{
            const payload:GetOwnerCustomersData={QueueId:currentQueueId,token:localStorage.getItem(`queue${currentQueueId} token`)}
            const data=await handleGetOwnerCustomers(payload)
            setQueueName(data.Name)
            setUsers(data.Waiters)
          }
          catch(err){
        console.log(err,"failed to fetch for owner")
          }
        

        }
        mode==="owner"?getOwnerCustomers():null

      },[mode])


   
  const { state } = useLocation() as { state?: { owner?: boolean } };
  const owner = !!state?.owner;


  const [open, setOpen] = useState(false);
  const [popupMode, setPopupMode] = useState<Mode>("join");

 
  const firstInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = firstInputRef.current?.value?.trim() ?? "";
    const b = secondInputRef.current?.value?.trim() ?? "";

    try {
      if (popupMode === "join") {
        const payload: JoinData = { QueueId: currentQueueId, Name: a, PhoneNumber: b };
        const { Id , Token} = await handleJoin(payload);
        const newUser: User = { ...payload, Id: Id , State: "waiting" };
        setUsers(prev => [...prev, newUser]);
        localStorage.setItem("queueCancelToken",Token)  
        setOpen(false)

      } else if (!owner) {
        
        const payload: ManageData = { QueueId: currentQueueId, password: a };
        const {queueId,token}= await handleManage(payload);
        console.log("VERIFIED")
        localStorage.setItem(`queue${queueId} token`,token)
        setOpen(false)
        navigate(`/owner/q/${currentQueueId}`, { state: { owner: true } });
      }
    } catch (err) {
      console.error("submit error:", err);
    }
  };

  

  const cancelRegister=async(cancelId)=>{
        console.log(cancelId)
        console.log(currentQueueId)
    try{
        const payload:CancelData={queueId:currentQueueId, customerId:cancelId , token:localStorage.getItem("queueCancelToken")}
        await handleCancel(payload)
        setUsers(users.filter(u=>u.Id!=payload.customerId))

    }
    catch(err){
    console.log(err ,"error at cancelation ")
    }

}




const updateStatus=async(nextStatus:string,CustomerId:number)=>{

  try{
  const payload:UpdateData={QueueId:currentQueueId,CustomerId,token:localStorage.getItem(`queue${id} token`)}

  switch(nextStatus){
  case "in_progress":{
    console.log("in prog")
  await handleupdateStatus(payload)
  setUsers(prev =>
    prev.map(u =>
      u.Id === CustomerId ? { ...u, State: "in_progress" } : u
    )
  );
  break
}
  case "served":{
    console.log("served")
  await handleServeCustomer(payload)
  setUsers(prev=>prev.filter(u=>u.Id!==CustomerId))
    break
}
default:break
  
}
  }
  catch(err){
    console.log(err,"failed to update status")
  }

}



  function UserRow({
    user,
    onChange,
  }: {
    user: User;
    onChange: (nextStatus:string,CustomerId:number) => void | Promise<void>;
  }) 

  {
    return (
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <div className="waiter-row">
        <div className="waiter-meta">
        <span className="waiter-name">{user.Name}</span>
        <span className="waiter-phone">{user.PhoneNumber}</span>
      </div>
        <StatusEditor value={user.State} onSave={ (nextStatus)=>{ onChange(nextStatus,user.Id)}} inline />
        </div>
      </Stack>
    );
  }


  return (
    <MorphingBlobs>
      <div className="min-h-[100svh] flex flex-col">
        <Header />

   
        <div className="flex-1 w-full flex flex-col items-center gap-8 px-4 py-10">
        {   notFound? <QueueNotFound/>:
          (
          <>
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">{queueName}</h1>
            <img src={QrImage} alt="Queue QR" className="mx-auto rounded-2xl shadow-sm max-w-[220px] w-full" />
            <div className={ mode==="owner" && "flex gap-4 items-center pl-5"}>
            <button
                className="btn text-white"
                onClick={() => {
                  if (signedIn) {
                    navigate(`/owner/q/${id}`, { state: { owner: true } })
                  } else {
                    setPopupMode("manage")
                    setOpen(true)
                  }
                }}
              >
                {mode==="owner" ? "Signed in" : "Manage"}
            </button>
            { mode==="owner"&&  <span onClick={()=>navigate(`/queue/${currentQueueId}`)}>
            <RemoveRedEyeIcon/>
            </span>}
            </div>
          </div>
        
          <div className="w-full max-w-3xl md:grid md:grid-cols-[1fr_auto] md:items-start md:gap-4">
            <main className="space-y-4">
                      {users?.length === 0 ? (
              <NoCustomersFound
                owner={owner}
                onAction={() => {
                  setPopupMode( "join");
                  setOpen(true);
                }}
              />
            ) : owner ? (
              users.map(u => (
                <UserRow
                  key={u.Id}
                  user={u}
                  onChange={(nextStatus: string) => updateStatus(nextStatus, u.Id)}
                />
              ))
            ) : (
              users.map(u => (
                <Waiter
                  key={u.Id}
                  id={u.Id}
                  name={u.Name}
                  phone={owner ? u.PhoneNumber : ""}
                  status={u.State}
                  onCancel={(id) => cancelRegister(id)}
                />
              ))
            )}
            </main>

             {  users?.length!==0 && <aside className="mt-4 md:mt-0 md:sticky md:self-start md:top-[calc(100svh-5.5rem)]">
              <button
                onClick={() => { setPopupMode("join"); setOpen(true); }}
                aria-label="Join queue"
                className="w-12 h-12 rounded-full bg-white shadow-lg hover:bg-slate-100 active:scale-95 transition flex items-center justify-center"
              >
                <AddIcon fontSize="small" />
              </button>
            </aside>}
          </div>

          <PopupForm
            open={open}
            onClose={() => setOpen(false)}
            onSubmit={submitForm}
            firstInputRef={firstInputRef}
            secondInputRef={secondInputRef}
            type={popupMode}
          />
          </>)
                }
                </div>
        
      </div>
    </MorphingBlobs>
  );
}
