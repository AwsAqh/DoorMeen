// pages/QueuePage.tsx
import React, { useState, useRef, useEffect } from "react";
import Header from "../components/Header";
import MorphingBlobs from "@/components/background/MorphingBlobs";
import Waiter from "@/components/Waiter";
import AddIcon from "@mui/icons-material/Add";
import PopupForm from "@/PopupForm";
import { Mode } from "../components/Helpers/popupFormTypes";
import type { JoinData, ManageData } from "@/features/queue/handlers";
import { handleJoin, handleManage } from "@/features/queue/handlers";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { StatusEditor } from "@/components/StatusEditor";
import Stack from "@mui/material/Stack";
import { type Status } from "../components/Helpers/status";
import { CancelData,handleCancel } from "@/features/queue/handlers/cancel";
import { GetData, handleGetCustomers } from "@/features/queue/handlers/getCustomers";
import { UpdateData, handleupdateStatus } from "@/features/queue/handlers/update";
import { handleGetOwnerCustomers,GetOwnerCustomersData } from "@/features/queue/handlers/getOwnerCustomers";
import { handleServeCustomer } from "@/features/queue/handlers/serveCustomer";
import { useOwnerGuard } from "@/hooks/useOwnerGuard";
import QueueNotFound from "@/components/QueueNotFound";
import NoCustomersFound from "@/components/NoCustomersFound";
import { useOwnerSession } from "@/hooks/useOwnerSession";
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import QueueQrCard from "@/components/QueueQrCard";
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { handleUpdateMaxCustomers,UpdateMaxCustomersData } from "@/features/queue/handlers/updateMaxCustomers";
import { handleUpdateQueueName,UpdateQueueNameData } from "@/features/queue/handlers/updateQueueName";
import Footer from "@/components/Footer";
import { toast, Toaster } from "sonner"

type User = {
  Id: number;
  QueueId: number;
  Name: string;
  PhoneNumber: string;
  State: Status;
  CreatedAt?:Date
};

type PageMode = "public" | "owner";

export default function QueuePage({ mode  }: { mode: PageMode }) {
  const API=import.meta.env.VITE_API_BASE_URL
  const params = useParams<{ id?: string }>();
  const currentQueueId: number = Number(params.id ?? 0);
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [queueName,setQueueName]=useState<string>("")
    const [notFound,setNotFound]=useState<boolean>(false)
    const { signedIn } = useOwnerSession(currentQueueId!, `${API}/api/owners/check-owner/${Number(currentQueueId)}`)
    const [currentMaxCustomers, setCurrentMaxCustomers] = useState<number | null>(null);
    const [draftMax, setDraftMax] = useState<number>((currentMaxCustomers ?? 10));
    const [anyChange, setAnyChange] = useState(false);
    const [saveLoading,setSaveLoading]=useState<boolean>(false)
    const queueNameRef=useRef<HTMLInputElement>(null)
    const [editingQueueName,setEditingQueueName]=useState<string |null>(null)
    const [isNameEditing,setIsNameEditing]=useState<boolean>(false)
    
    useOwnerGuard(currentQueueId, mode);
    const RANK: Record<Status, number> = {
      in_progress: 0,
      waiting: 1,
      served:3
    };

    useEffect(() => {
      setDraftMax(currentMaxCustomers ?? 10);
    }, [currentMaxCustomers]);
    
    // the value users see/choose (10 represents "+10"/unlimited)
    const effectiveCurrent = currentMaxCustomers ?? 10;
    
    const CLASS = "bg-card text-card-foreground border-border";

  const getErrorMessage = (e: unknown): string =>
    e instanceof Error ? e.message : typeof e === "string" ? e : "Something went wrong";

      //get customers for public
      useEffect(() => {
        if (mode !== "public") return;
      
        const LOADING_ID = `queue:${currentQueueId}:fetch`; 
      
        const getCustomer = async () => {
          toast.loading("Fetching data...", {
            id: LOADING_ID,
            className: CLASS,
            duration: Infinity,
          });
      
          try {
            const payload: GetData = { QueueId: currentQueueId };
            const data = await handleGetCustomers(payload);
            setQueueName(data.Name);
            setUsers(data.Waiters);
            toast.dismiss(LOADING_ID); 
          } catch (err) {
            setNotFound(true);
            toast.dismiss(LOADING_ID);
            toast.error(getErrorMessage(err), { className: CLASS, duration: 5000 });
          }
        };
      
        void getCustomer();
      
        // cleanup in case the effect re-runs/unmounts
        return () => {
          toast.dismiss(LOADING_ID);
        };
      }, [mode, currentQueueId]);
      

            //get customer as owner
            useEffect(() => {
            
              const token = localStorage.getItem(`queue${currentQueueId} token`);
              if (!token) return;
            
              const getOwnerCustomers = async () => {
                const LOADING_ID = `queue:${currentQueueId}:fetch:owner`; 
                toast.loading("Fetching data...", {
                  id: LOADING_ID,
                  className: CLASS,
                  duration: Infinity,
                });
                try {
                  const payload: GetOwnerCustomersData = {
                    QueueId: currentQueueId,
                    token: token ?? "",
                  };
                  const data = await handleGetOwnerCustomers(payload);
                  toast.dismiss(LOADING_ID)
                  
                  setQueueName(data.Name);
                  setUsers(data.Waiters);
                  setCurrentMaxCustomers(data.MaxCustomers ?? null);
                  setEditingQueueName(data.Name);
                } catch (err) {
                  setNotFound(true);
                  toast.dismiss(LOADING_ID); 
                  toast.error(getErrorMessage(err), { className: CLASS, duration: 5000 });
                }
              };
            
              if (mode === "owner") {
                void getOwnerCustomers();
              }
              
            }, [mode, currentQueueId ]);
            

      useEffect(()=>{
        if(isNameEditing){
          queueNameRef.current?.focus()
          queueNameRef.current?.select()
        }
      },[isNameEditing])
   
  const { state } = useLocation() as { state?: { owner?: boolean } };
  const owner = !!state?.owner;


  const [open, setOpen] = useState(false);
  const [popupMode, setPopupMode] = useState<Mode>("join");

 
  const firstInputRef = useRef<HTMLInputElement>(null);
  const secondInputRef = useRef<HTMLInputElement>(null);

  

  const submitJoinForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = firstInputRef.current?.value?.trim() ?? "";
    const b = secondInputRef.current?.value?.trim() ?? "";
  
    if (popupMode !== "join") return;     
    if (!a || !b) {
      toast.error("Please fill all fields", { className: CLASS, duration: 3000 });
      return;
    }
  
    const id = toast.loading("Joining queue…", { className: CLASS, duration: Infinity });
  
    try {
      const payload: JoinData = { QueueId: currentQueueId, Name: a, PhoneNumber: b };
      const { Id, Token } = await handleJoin(payload);
  
      toast.success("Joined!", { id, className: CLASS, duration: 2500 });
  
      const newUser: User = { ...payload, Id, State: "waiting" };
      setUsers(prev => [...prev, newUser]);
      localStorage.setItem(`queueCancelToken${Id}`, Token);
      setOpen(false);
    } catch (err :unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }
  };

  
  const submitManageForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (owner) return;
  
    const a = firstInputRef.current?.value?.trim() ?? "";
    if (!a) {
      toast.error("Enter PIN", { className: CLASS, duration: 3000 });
      return;
    }
  
    const id = toast.loading("Checking PIN…", { className: CLASS, duration: Infinity });
  
    try {
      const payload: ManageData = { QueueId: currentQueueId, password: a };
      const { queueId, token } = await handleManage(payload);
  
      toast.success("Verified!", { id, className: CLASS, duration: 2500 });
  
      localStorage.setItem(`queue${queueId} token`, token);
      setOpen(false);
      navigate(`/owner/q/${queueId}`, {replace:true });
    }  
    catch (err :unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    
    }
  };
  

  const cancelRegister=async(cancelId:number)=>{
    const id = toast.loading("Canceling…", { className: CLASS, duration: Infinity });
    try{
        const payload:CancelData={queueId:currentQueueId, customerId:cancelId , token:localStorage.getItem(`queueCancelToken${cancelId}`)||""}
        await handleCancel(payload)
        toast.success("Canceled!", { id, className: CLASS, duration: 2500 });
        setUsers(users.filter(u=>u.Id!=payload.customerId))

    }
    catch (err :unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    }

}

const sortUsers = (list: User[]) =>
  [...list].sort(
    (a, b) =>
      RANK[a.State as Status] - RANK[b.State as Status] ||
      new Date(a.CreatedAt??0).getTime() - new Date(b.CreatedAt??0).getTime()
  );


const updateStatus=async(nextStatus:string,CustomerId:number)=>{
  const id = toast.loading("Updating...", { className: CLASS, duration: Infinity });
  try{
  const payload:UpdateData={QueueId:currentQueueId,CustomerId,token:localStorage.getItem(`queue${currentQueueId} token`)||""}

  switch(nextStatus){
  case "in_progress":{
  
  await handleupdateStatus(payload)
  toast.success("Updated!",{ id, className: CLASS, duration: 2500 })
  setUsers(prev => {
    const updated = prev?.map(u =>
      u.Id === CustomerId ? { ...u,State: "in_progress" as Status} : u
    );
    return sortUsers(updated);
  }); 
   break
}


  case "served":{
  
  await handleServeCustomer(payload)
  toast.success("Served!",{ id, className: CLASS, duration: 2500 })
  setUsers(prev=>prev.filter(u=>u.Id!==CustomerId))
    break
}
default:break
  
}
  }
  catch (err :unknown) {
    toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
  
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

  const onMaxChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
    const val = Number(e.target.value);   // select gives strings
    setDraftMax(val);
    setAnyChange(val !== effectiveCurrent); // show Save only when changed
  };

  const onNameChange=()=>{
    setEditingQueueName(queueNameRef.current?.value??"")
    
  }

  const updateMaxCustomers=async()=>{
    const id = toast.loading("Updating max customer...", { className: CLASS, duration: Infinity });
    try{
      const payload:UpdateMaxCustomersData={QueueId:currentQueueId,Max:draftMax,token:localStorage.getItem(`queue${currentQueueId} token`)||""}
      setSaveLoading(true)
      await handleUpdateMaxCustomers(payload)
      toast.success("Updated!",{ id, className: CLASS, duration: 2500 })
      setCurrentMaxCustomers(currentMaxCustomers)
      setAnyChange(false)
      setSaveLoading(false)
    }
    catch (err :unknown) {
      setSaveLoading(false)
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    
    }
  }

  const updateQueueName=async()=>{
    const id = toast.loading("Updating…", { className: CLASS, duration: Infinity });
    try{
      const payload:UpdateQueueNameData={QueueId:currentQueueId,name:queueNameRef.current?.value??"",token:localStorage.getItem(`queue${currentQueueId} token`)||""}
      await handleUpdateQueueName(payload)
      toast.success("Updated!",{ id, className: CLASS, duration: 2500 })
      setQueueName(queueNameRef.current?.value??"")
      setIsNameEditing(false)
    }
    catch (err :unknown) {
      toast.error(getErrorMessage(err), { className: CLASS, duration: 5000, id });
    
    }

  }


  return (
    <MorphingBlobs>
      <div className="min-h-[100svh] flex flex-col font-poppins overflow-x-hidden justify-between">
        <Header />
        <Toaster position="top-center" offset={16} />
   
        <div className="flex-1 w-full flex flex-col items-center gap-8 px-4 py-10">
        {   notFound? <QueueNotFound/>:
          (
          <>
          <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
  {mode === "public" && (
    <h1 className="text-3xl font-semibold tracking-tight">{queueName}</h1>
  )}

  {mode === "owner" && (
    <>
      {/* Title / Input */}
      {isNameEditing ? (
        <input
          ref={queueNameRef}
          value={editingQueueName??""}
          onChange={onNameChange}
          placeholder="Queue name…"
          className="
            text-3xl font-semibold tracking-tight
            bg-transparent
            border-0 border-b-2 border-indigo-500/70
            focus:border-indigo-600 focus:outline-none
            caret-indigo-600
            placeholder-slate-400
            transition-colors
          "
        />
      ) : (
        <h1 className="text-3xl font-semibold tracking-tight">{queueName}</h1>
      )}

      {!isNameEditing ? (
        <button
          onClick={() => {
            setIsNameEditing(true);
            queueNameRef.current?.focus();
            queueNameRef.current?.select();
          }}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full
                     bg-white shadow hover:bg-slate-50 active:scale-95 transition"
          title="Rename"
        >
          <ModeEditIcon fontSize="small" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={updateQueueName}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white
                       shadow-sm hover:bg-indigo-700 active:scale-95 transition"
          >
            Save
          </button>
          <button
            onClick={() => {
              setIsNameEditing(false);
              setEditingQueueName(queueName); // reset draft
            }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm
                       text-slate-700 hover:bg-slate-50 active:scale-95 transition"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  )}
</div>
{currentQueueId > 0 && <QueueQrCard queueId={currentQueueId} />}
           <div className="mt-4 flex items-center justify-center gap-3">
              <button
                className="btn text-white"
                onClick={() => {
                  if (signedIn) {
                    navigate(`/owner/q/${currentQueueId}`, { state: { owner: true } })
                  } else {
                    setPopupMode("manage")
                    setOpen(true)
                  }
                }}
              >
                {mode === "owner" ? "Signed in" : "Manage"}
              </button>

              {mode === "owner" && (
                <>
                <button
                  type="button"
                  aria-label="View as customer"
                  onClick={() => navigate(`/queue/${currentQueueId}`)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow hover:bg-slate-100 active:scale-95 cursor-pointer"
                >
                  <RemoveRedEyeIcon fontSize="small" />
                </button>
                <div className="flex items-center gap-3">
  {/* Select */}
  <div className="relative">
    <select
      value={String(draftMax)}
      onChange={onMaxChange}
      className="
    appearance-none
    bg-white/90 dark:bg-slate-800
    text-slate-900 dark:text-slate-100        /* <-- font color */
    placeholder-slate-400 dark:placeholder-slate-500
    border border-slate-300 dark:border-slate-600
    rounded-lg px-3 pr-10 py-2 text-sm shadow-sm
    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
    transition-colors
  "
    >
      <option disabled>Max customers</option>
      <option value="2">2 customers</option>
      <option value="5">5 customers</option>
      <option value="8">8 customers</option>
      <option value="10">+10 customers</option>
    </select>

    {/* Arrow */}
    <svg
      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
      viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
    >
      <path fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06L10.53 12.6a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  </div>

        {anyChange && (
          <button
            onClick={updateMaxCustomers}
            className="
              inline-flex items-center gap-2
              rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white
              shadow-sm
              hover:bg-indigo-700 active:scale-[.98]
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              transition
            "
          >
            {saveLoading? "Saving...":"Save" }
          </button>
  )}
</div>
                </>
              )}
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
              users?.map(u => (
                <UserRow
                  key={u.Id}
                  user={u}
                  onChange={(nextStatus: string) => updateStatus(nextStatus, u.Id)}
                />
              ))
            ) : (
              users?.map(u => (
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
            onSubmit={popupMode==="join"? submitJoinForm: submitManageForm }
            firstInputRef={firstInputRef}
            secondInputRef={secondInputRef}
            type={popupMode}
          />
          </>)
                }
                </div>
        
      <Footer/>
      </div>

    </MorphingBlobs>
  );
}
