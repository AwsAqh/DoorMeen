// components/Waiter.tsx
import React from "react";
import "../customstyle.css";
import LogoutIcon from '@mui/icons-material/Logout';


export default function Waiter({
  name ,
  phone,
  status,
}: { name: string; phone: string; status: string }) {
  const statusClass =
    status === "In progress" ? "status-serving" :
    status === "done"    ? "status-done"    :
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
      {status==="waiting" ? <span><LogoutIcon/></span>: null  }
      </span>
    </div>
  );
}
