// components/Waiter.tsx

import "../customstyle.css";
import LogoutIcon from '@mui/icons-material/Logout';
import { STATUS_LABEL,Status } from "./Helpers/status";

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

    const checkUserRow=()=>{
      var token=localStorage.getItem(`queueCancelToken${id}`)
      return token?  true: false
    }

  return (
    <div className="waiter-row">
      <div className="waiter-meta">
        <span className="waiter-name">{name}</span>
        <span className="waiter-phone">{phone}</span>
      </div>
     
        <span className="flex gap-2">
       
      <span className={`status-chip ${statusClass}`}>
       {STATUS_LABEL[status]}
      </span>
      {status==="waiting" &&checkUserRow() ? <span><LogoutIcon onClick={()=>onCancel(id)}/></span>: null  }
      </span>
   
    </div>
  );
}
