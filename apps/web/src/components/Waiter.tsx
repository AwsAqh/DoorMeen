// components/Waiter.tsx
import React from "react";
import "../customstyle.css";
import LogoutIcon from '@mui/icons-material/Logout';
import { Status } from "./Helpers/status";
import { StatusEditor } from "./StatusEditor";
import { CancelData, handleCancel } from "@/features/queue/handlers/cancel";
export default function Waiter({
    id,
  name ,
  phone,
  status,
  onCancel
}: { id:number,name: string; phone: string; status: Status,onChange?: (next: Status) => void, onCancel:(id:number)=>void  }) {
  const statusClass =
    status === "in_progress" ? "status-serving" :
    status === "served"    ? "status-done"    :
                           "status-waiting";

    
  return (
    <div className="waiter-row">
      <div className="waiter-meta">
        <span className="waiter-name">{name}</span>
        <span className="waiter-phone">{phone}</span>
      </div>
     
        <span className="flex gap-2">
       
      <span className={`status-chip ${statusClass}`}>
       {status}
      </span>
      {status==="waiting" ? <span><LogoutIcon onClick={()=>onCancel(id)}/></span>: null  }
      </span>
   
    </div>
  );
}
